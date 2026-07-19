(function () {
  "use strict";

  const DIAGNOSTIC_KEY = "ai-opportunity-scorecard-v1";
  const SCORECARD_KEY = "ai-operational-scorecard-v1";
  let analysis = null;
  let builderStep = 1;
  let latestScorecard = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

  const priorityLabels = {
    cost: "Reducir costes", revenue: "Aumentar ingresos", capacity: "Ganar capacidad",
    margin: "Mejorar margen y calidad", risk: "Reducir riesgo"
  };

  function repairText(value) {
    if (typeof value !== "string" || !/[ÃÂ]/.test(value)) return value;
    try {
      const bytes = Array.from(value, char => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
      return decodeURIComponent(bytes);
    } catch (_) { return value; }
  }

  function repairObject(value) {
    if (Array.isArray(value)) return value.map(repairObject);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairObject(item)]));
    return repairText(value);
  }

  function normalizeDiagnostic(saved) {
    if (saved.company && saved.ranking) return repairObject(saved);
    if (saved.form && saved.lastResults) {
      return repairObject({
        company: saved.form,
        ranking: saved.lastResults,
        selectedAreas: saved.selectedAreas || []
      });
    }
    throw new Error("El archivo no contiene un diagnóstico compatible.");
  }

  function topResult() {
    return [...analysis.ranking].sort((a, b) => Number(b.score) - Number(a.score))[0];
  }

  function defaultTaskUnit(processName) {
    const lower = processName.toLowerCase();
    if (lower.includes("cualific")) return "Oportunidad cualificada y priorizada";
    if (lower.includes("oferta") || lower.includes("propuesta")) return "Oferta comercial preparada y revisada";
    if (lower.includes("document")) return "Documento terminado y aceptado";
    return `${processName}: tarea completada`;
  }

  function defaultSuccessDefinition(processName) {
    if (processName.toLowerCase().includes("cualific")) {
      return "La oportunidad queda clasificada y priorizada con evidencias suficientes; un responsable comercial acepta la recomendación y existe una siguiente acción registrada en el CRM.";
    }
    return `El resultado de ${processName.toLowerCase()} cumple el estándar acordado, queda registrado en el sistema de trabajo y es aceptado por la persona responsable.`;
  }

  function loadAnalysis(data) {
    analysis = normalizeDiagnostic(data);
    const top = topResult();
    const company = analysis.company || {};
    $("#analysisLoader").hidden = true;
    $("#scorecardApp").hidden = false;
    $("#contextCompany").textContent = company.companyName || "Empresa piloto";
    $("#contextProcess").textContent = top.process;
    $("#contextPriority").textContent = priorityLabels[company.priority] || company.priority || "Resultado empresarial";
    $("#contextRisk").textContent = `${top.risk ?? "—"} / 100`;
    $("#taskUnit").value = defaultTaskUnit(top.process);
    $("#successDefinition").value = defaultSuccessDefinition(top.process);
    $("#pilotMonths").value = Number(company.horizon) || 6;
    $("#operatingMode").value = Number(top.risk) >= 70 ? "recommend" : "assist";
    $("#comparisonDesign").value = "matched";
    $("#cadence").value = "weekly";
    renderGuardrails(top);
    restoreScorecardDraft();
    persistDraft();
  }

  function renderGuardrails(result) {
    const highRisk = Number(result.risk) >= 70;
    $("#riskGuardrail").innerHTML = highRisk
      ? `<h3>Guardrails obligatorios por riesgo ${result.risk}/100</h3>
         <p>El piloto puede recomendar y ordenar, pero no debe eliminar oportunidades ni actuar en el CRM sin aprobación.</p>
         <ul><li>100% de las decisiones con responsable humano identificable.</li><li>0 oportunidades de alto valor descartadas automáticamente.</li><li>Registrar fuentes, cambios manuales, escalados e incidentes.</li></ul>`
      : `<h3>Control del piloto</h3><p>Mantén trazabilidad, aprobación humana para excepciones y revisión periódica de errores.</p>`;
  }

  function readImportedFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadAnalysis(JSON.parse(reader.result));
        $("#importError").textContent = "";
      } catch (error) {
        $("#importError").textContent = error.message || "No se ha podido leer el análisis.";
      }
    };
    reader.onerror = () => { $("#importError").textContent = "No se ha podido leer el archivo."; };
    reader.readAsText(file, "UTF-8");
  }

  function currentFields() {
    const ids = [
      "taskUnit", "metricOwner", "successDefinition", "operatingMode", "comparisonDesign", "cadence", "pilotMonths",
      "baselineEligible", "baselineAccepted", "baselineWinRate", "averageDeal", "grossMargin", "baselineMinutes", "laborCost",
      "targetAccepted", "targetWinLift", "targetReady", "targetCorrection", "targetEscalation", "reviewMinutes", "fixedAiCost", "variableAiCost",
      "measurementPeriod", "actualEvaluated", "actualAccepted", "actualReady", "actualCorrection", "actualEscalation", "actualMatured", "actualWon", "controlMatured", "controlWon",
      "actualAiCost", "actualReviewHours", "actualOtherCost", "actualIncidents", "actualFalseNegatives"
    ];
    return Object.fromEntries(ids.map(id => [id, $(`#${id}`).value]));
  }

  function persistDraft() {
    if (!analysis) return;
    try { localStorage.setItem(SCORECARD_KEY, JSON.stringify({ company: analysis.company, process: topResult().process, fields: currentFields() })); }
    catch (_) { /* The app still works when storage is disabled. */ }
  }

  function restoreScorecardDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(SCORECARD_KEY));
      if (!saved || saved.process !== topResult().process || saved.company?.companyName !== analysis.company?.companyName) return;
      Object.entries(saved.fields || {}).forEach(([id, value]) => { if ($(`#${id}`) && value !== "") $(`#${id}`).value = value; });
    } catch (_) { /* Ignore incompatible previous drafts. */ }
  }

  function numeric(id) { return Number($(`#${id}`).value); }
  function hasNumbers(ids) { return ids.every(id => $(`#${id}`).value !== "" && Number.isFinite(numeric(id))); }
  function safeDivide(numerator, denominator) { return denominator > 0 ? numerator / denominator : 0; }

  function plannedEconomics() {
    const eligible = numeric("baselineEligible");
    const acceptedBaseline = numeric("baselineAccepted");
    const acceptedTarget = numeric("targetAccepted");
    const winRate = numeric("baselineWinRate") / 100;
    const winLift = numeric("targetWinLift") / 100;
    const deal = numeric("averageDeal");
    const margin = numeric("grossMargin") / 100;
    const labor = numeric("laborCost");
    const baselineMinutes = numeric("baselineMinutes");
    const reviewMinutes = numeric("reviewMinutes");
    const aiCost = numeric("fixedAiCost") + eligible * numeric("variableAiCost") + eligible * reviewMinutes / 60 * labor;
    const baselineLabor = eligible * baselineMinutes / 60 * labor;
    const capacityValue = Math.max(0, baselineLabor - eligible * reviewMinutes / 60 * labor);
    const baselineMargin = acceptedBaseline * winRate * deal * margin;
    const targetMargin = acceptedTarget * Math.min(1, winRate + winLift) * deal * margin;
    const incrementalMargin = targetMargin - baselineMargin;
    const usefulValue = incrementalMargin + capacityValue;
    const successfulTasks = eligible * (numeric("targetReady") + numeric("targetCorrection")) / 100;
    return {
      aiCost, baselineLabor, capacityValue, incrementalMargin, usefulValue,
      costPerSuccess: safeDivide(aiCost, successfulTasks), valuePerEuro: safeDivide(usefulValue, aiCost),
      netMonthlyValue: usefulValue - aiCost
    };
  }

  function updateBusinessCasePreview() {
    const needed = ["baselineEligible", "baselineAccepted", "baselineWinRate", "averageDeal", "grossMargin", "baselineMinutes", "laborCost", "targetAccepted", "targetWinLift", "targetReady", "targetCorrection", "targetEscalation", "reviewMinutes", "fixedAiCost", "variableAiCost"];
    if (!hasNumbers(needed)) { $("#businessCasePreview").innerHTML = ""; return; }
    const model = plannedEconomics();
    $("#businessCasePreview").innerHTML = `
      <div class="preview-grid">
        <div class="preview-metric"><span>Margen bruto incremental</span><strong>${money.format(model.incrementalMargin)}</strong><small>estimado por mes frente a la línea base</small></div>
        <div class="preview-metric"><span>Coste completo con IA</span><strong>${money.format(model.aiCost)}</strong><small>herramienta, variable y revisión humana</small></div>
        <div class="preview-metric"><span>Coste por tarea exitosa</span><strong>${money.format(model.costPerSuccess)}</strong><small>según el objetivo de fiabilidad</small></div>
        <div class="preview-metric"><span>Valor útil por euro</span><strong>${decimal.format(model.valuePerEuro)}×</strong><small>margen incremental y capacidad liberada</small></div>
      </div>
      <p class="preview-note">Estimación para decidir el piloto, no beneficio reconocido. La atribución final se calculará con la cohorte comparable.</p>`;
  }

  function validateStep(step) {
    $$("[aria-invalid='true']").forEach(field => field.removeAttribute("aria-invalid"));
    $("#baselineError").textContent = "";
    $("#measurementError").textContent = "";
    let fields = [];
    if (step === 1) fields = ["taskUnit", "metricOwner", "successDefinition", "operatingMode", "comparisonDesign", "cadence", "pilotMonths"];
    if (step === 2) fields = ["baselineEligible", "baselineAccepted", "baselineWinRate", "averageDeal", "grossMargin", "baselineMinutes", "laborCost", "targetAccepted", "targetWinLift", "targetReady", "targetCorrection", "targetEscalation", "reviewMinutes", "fixedAiCost", "variableAiCost"];
    const invalid = fields.map(id => $(`#${id}`)).filter(field => field.value === "" || !field.checkValidity());
    invalid.forEach(field => field.setAttribute("aria-invalid", "true"));
    if (invalid.length) { invalid[0].focus(); return false; }

    if (step === 1 && $("#operatingMode").value === "autonomous" && Number(topResult().risk) >= 70) {
      $("#operatingMode").setAttribute("aria-invalid", "true");
      $("#operatingMode").focus();
      return false;
    }
    if (step === 2) {
      if (numeric("baselineAccepted") > numeric("baselineEligible") || numeric("targetAccepted") > numeric("baselineEligible")) {
        $("#baselineError").textContent = "Las oportunidades aceptadas no pueden superar las oportunidades elegibles.";
        return false;
      }
      const reliabilityTotal = numeric("targetReady") + numeric("targetCorrection") + numeric("targetEscalation");
      if (Math.abs(reliabilityTotal - 100) > 0.01) {
        $("#baselineError").textContent = `Los objetivos de fiabilidad suman ${decimal.format(reliabilityTotal)}%. Deben sumar 100%.`;
        return false;
      }
    }
    return true;
  }

  function showBuilderStep(step) {
    builderStep = step;
    $$("[data-builder-step]").forEach(section => { section.hidden = Number(section.dataset.builderStep) !== step; });
    $$("[data-builder-indicator]").forEach(item => {
      const number = Number(item.dataset.builderIndicator);
      item.classList.toggle("is-active", number === step);
      item.classList.toggle("is-complete", number < step);
      if (number === step) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
    });
    $("#previousBuilderStep").hidden = step === 1;
    $("#nextBuilderStep").hidden = step === 3;
    if (step === 2) updateBusinessCasePreview();
    persistDraft();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function actualScorecard() {
    const evaluated = numeric("actualEvaluated");
    const accepted = numeric("actualAccepted");
    const ready = numeric("actualReady");
    const correction = numeric("actualCorrection");
    const escalation = numeric("actualEscalation");
    const matured = numeric("actualMatured");
    const won = numeric("actualWon");
    const controlMatured = numeric("controlMatured");
    const controlWon = numeric("controlWon");
    const labor = numeric("laborCost");
    const fullCost = numeric("actualAiCost") + numeric("actualReviewHours") * labor + numeric("actualOtherCost");
    const winRate = safeDivide(won, matured) * 100;
    const usesLiveControl = $("#comparisonDesign").value !== "before-after" && controlMatured > 0;
    const comparatorWinRate = usesLiveControl ? safeDivide(controlWon, controlMatured) * 100 : numeric("baselineWinRate");
    const winLift = winRate - comparatorWinRate;
    const incrementalMargin = matured * (winLift / 100) * numeric("averageDeal") * (numeric("grossMargin") / 100);
    const baselineHours = evaluated * numeric("baselineMinutes") / 60;
    const capacityValue = Math.max(0, baselineHours - numeric("actualReviewHours")) * labor;
    const usefulValue = incrementalMargin + capacityValue;
    return {
      period: $("#measurementPeriod").value,
      evaluated, accepted, ready, correction, escalation, matured, won, fullCost, winRate, winLift,
      controlMatured, controlWon, comparatorWinRate, comparatorLabel: usesLiveControl ? "cohorte control" : "línea base",
      incrementalMargin, capacityValue, usefulValue,
      readyRate: safeDivide(ready, evaluated) * 100,
      correctionRate: safeDivide(correction, evaluated) * 100,
      escalationRate: safeDivide(escalation, evaluated) * 100,
      acceptanceRate: safeDivide(accepted, evaluated) * 100,
      costPerSuccess: safeDivide(fullCost, accepted),
      valuePerEuro: safeDivide(usefulValue, fullCost),
      incidents: numeric("actualIncidents"), falseNegatives: numeric("actualFalseNegatives")
    };
  }

  function metricStatus(value, target, direction) {
    const met = direction === "min" ? value >= target : value <= target;
    return met ? ["Objetivo cumplido", ""] : ["Revisar", "is-warning"];
  }

  function renderDashboard(model) {
    latestScorecard = model;
    const valueLabel = model.valuePerEuro > 0 ? `${decimal.format(model.valuePerEuro)}×` : `${decimal.format(model.valuePerEuro)}×`;
    $("#dashboardPeriod").textContent = model.period || "Periodo piloto";
    $("#northStar").innerHTML = `
      <div><p>Métrica norte</p><h4>Valor útil por euro de coste completo</h4><small>Margen bruto incremental atribuible + capacidad liberada, dividido por costes de IA, revisión y operación.</small></div>
      <div class="north-star-value"><strong>${valueLabel}</strong><span>${money.format(model.usefulValue)} de valor útil</span></div>`;

    const cards = [
      ["Trabajo útil", `${model.accepted}`, `priorizaciones aceptadas · ${decimal.format(model.acceptanceRate)}% de lo evaluado`, model.accepted >= numeric("targetAccepted") ? ["Objetivo cumplido", ""] : ["Bajo objetivo", "is-warning"]],
      ["Coste por tarea exitosa", money.format(model.costPerSuccess), `${money.format(model.fullCost)} de coste completo`, ["Medir tendencia", ""]],
      ["Listo para usar", `${decimal.format(model.readyRate)}%`, `objetivo ≥ ${decimal.format(numeric("targetReady"))}%`, metricStatus(model.readyRate, numeric("targetReady"), "min")],
      ["Necesita escalado", `${decimal.format(model.escalationRate)}%`, `máximo objetivo ${decimal.format(numeric("targetEscalation"))}%`, metricStatus(model.escalationRate, numeric("targetEscalation"), "max")],
      ["Conversión a venta", `${decimal.format(model.winRate)}%`, `${model.winLift >= 0 ? "+" : ""}${decimal.format(model.winLift)} p.p. frente a ${model.comparatorLabel}`, metricStatus(model.winLift, numeric("targetWinLift"), "min")],
      ["Margen bruto incremental", money.format(model.incrementalMargin), "estimación atribuible de la cohorte", model.incrementalMargin >= 0 ? ["Impacto positivo", ""] : ["Impacto negativo", "is-danger"]],
      ["Incidentes", `${model.incidents}`, "seguridad o privacidad", model.incidents === 0 ? ["Guardrail cumplido", ""] : ["Detener y revisar", "is-danger"]],
      ["Falsos negativos críticos", `${model.falseNegatives}`, "oportunidades de alto valor mal descartadas", model.falseNegatives === 0 ? ["Guardrail cumplido", ""] : ["Detener y revisar", "is-danger"]]
    ];
    $("#dashboardMetrics").innerHTML = cards.map(([label, value, detail, status]) => `
      <article class="dashboard-card"><span class="dashboard-label">${label}</span><strong>${value}</strong><small>${detail}</small><span class="metric-status ${status[1]}">${status[0]}</span></article>`).join("");

    $("#reliabilityChart").innerHTML = `
      <h4>Fiabilidad de las tareas evaluadas</h4>
      <div class="stacked-bar" role="img" aria-label="Listo para usar ${decimal.format(model.readyRate)}%, necesita corrección ${decimal.format(model.correctionRate)}%, necesita escalado ${decimal.format(model.escalationRate)}%">
        <span class="stacked-ready" style="width:${model.readyRate}%">${model.readyRate >= 12 ? `${decimal.format(model.readyRate)}%` : ""}</span>
        <span class="stacked-correction" style="width:${model.correctionRate}%">${model.correctionRate >= 12 ? `${decimal.format(model.correctionRate)}%` : ""}</span>
        <span class="stacked-escalation" style="width:${model.escalationRate}%">${model.escalationRate >= 12 ? `${decimal.format(model.escalationRate)}%` : ""}</span>
      </div>
      <div class="bar-legend"><span>Listo: ${model.ready}</span><span>Corrección: ${model.correction}</span><span>Escalado: ${model.escalation}</span></div>`;

    const guardrailFailure = model.incidents > 0 || model.falseNegatives > 0;
    const economicSuccess = model.valuePerEuro > 1 && model.incrementalMargin > 0;
    const qualitySuccess = model.readyRate >= numeric("targetReady") && model.escalationRate <= numeric("targetEscalation");
    let title = "Continuar y ampliar la validación";
    let body = "El piloto crea más valor útil que su coste y mantiene la calidad dentro de los objetivos. Amplía el volumen gradualmente sin retirar la aprobación humana.";
    let className = "";
    if (guardrailFailure) {
      title = "Detener la ampliación y revisar controles";
      body = "Se ha incumplido un guardrail. Analiza el incidente o el falso negativo antes de aumentar autonomía o volumen.";
      className = "is-danger";
    } else if (!economicSuccess || !qualitySuccess) {
      title = "Mantener el piloto, corregir y volver a medir";
      body = "Todavía no se cumplen simultáneamente economía y fiabilidad. Revisa datos, instrucciones, integración y revisión humana antes de escalar.";
      className = "is-warning";
    }
    $("#decisionVerdict").className = `decision-verdict ${className}`;
    $("#decisionVerdict").innerHTML = `<h4>${title}</h4><p>${body}</p>`;
    $("#scorecardDashboard").hidden = false;
    persistDraft();
    $("#scorecardDashboard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function calculateScorecard() {
    $("#measurementError").textContent = "";
    const ids = ["measurementPeriod", "actualEvaluated", "actualAccepted", "actualReady", "actualCorrection", "actualEscalation", "actualMatured", "actualWon", "actualAiCost", "actualReviewHours", "actualOtherCost", "actualIncidents", "actualFalseNegatives"];
    if ($("#comparisonDesign").value !== "before-after") ids.push("controlMatured", "controlWon");
    const invalid = ids.map(id => $(`#${id}`)).filter(field => field.value === "" || !field.checkValidity());
    invalid.forEach(field => field.setAttribute("aria-invalid", "true"));
    if (invalid.length) { invalid[0].focus(); return; }
    const evaluated = numeric("actualEvaluated");
    const reliabilityTotal = numeric("actualReady") + numeric("actualCorrection") + numeric("actualEscalation");
    if (reliabilityTotal !== evaluated) {
      $("#measurementError").textContent = `Fiabilidad inconsistente: las tres categorías suman ${reliabilityTotal}, pero se evaluaron ${evaluated} oportunidades.`;
      return;
    }
    if (numeric("actualAccepted") > numeric("actualReady") + numeric("actualCorrection")) {
      $("#measurementError").textContent = "Las priorizaciones aceptadas no pueden superar las tareas listas más las corregidas.";
      return;
    }
    if (numeric("actualWon") > numeric("actualMatured")) {
      $("#measurementError").textContent = "Las ventas ganadas no pueden superar las oportunidades maduras de la cohorte.";
      return;
    }
    if ($("#comparisonDesign").value !== "before-after" && numeric("controlMatured") <= 0) {
      $("#measurementError").textContent = "La comparación seleccionada requiere una cohorte control con oportunidades maduras.";
      return;
    }
    if (numeric("controlWon") > numeric("controlMatured")) {
      $("#measurementError").textContent = "Las ventas ganadas del control no pueden superar sus oportunidades maduras.";
      return;
    }
    renderDashboard(actualScorecard());
  }

  function exportScorecard() {
    if (!latestScorecard) return;
    const payload = {
      generatedAt: new Date().toISOString(), company: analysis.company, selectedProcess: topResult(),
      definition: {
        taskUnit: $("#taskUnit").value, successDefinition: $("#successDefinition").value,
        owner: $("#metricOwner").value, operatingMode: $("#operatingMode").value,
        comparisonDesign: $("#comparisonDesign").value, cadence: $("#cadence").value
      },
      baselineAndTargets: currentFields(), scorecard: latestScorecard
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-scorecard-operativo-${latestScorecard.period || new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetDraft() {
    if (!window.confirm("¿Quieres borrar la configuración y las mediciones guardadas de este scorecard?")) return;
    localStorage.removeItem(SCORECARD_KEY);
    window.location.reload();
  }

  function bindEvents() {
    $("#analysisFile").addEventListener("change", event => readImportedFile(event.target.files[0]));
    $("#replaceAnalysisFile").addEventListener("change", event => readImportedFile(event.target.files[0]));
    $("#resetScorecardDraft").addEventListener("click", resetDraft);
    $("#nextBuilderStep").addEventListener("click", () => { if (validateStep(builderStep)) showBuilderStep(builderStep + 1); });
    $("#previousBuilderStep").addEventListener("click", () => showBuilderStep(builderStep - 1));
    $("#scorecardForm").addEventListener("input", event => {
      event.target.removeAttribute("aria-invalid");
      if (builderStep === 2) updateBusinessCasePreview();
      persistDraft();
    });
    $("#scorecardForm").addEventListener("change", persistDraft);
    $("#calculateScorecard").addEventListener("click", calculateScorecard);
    $("#exportScorecard").addEventListener("click", exportScorecard);
    $("#printScorecard").addEventListener("click", () => window.print());
  }

  bindEvents();
  try {
    const savedDiagnostic = JSON.parse(localStorage.getItem(DIAGNOSTIC_KEY));
    if (savedDiagnostic?.lastResults?.length) loadAnalysis(savedDiagnostic);
  } catch (_) { /* Import remains available. */ }
})();

