(function () {
  "use strict";

  const STORAGE_KEY = "ai-opportunity-scorecard-v1";
  const MAX_CANDIDATES = 6;
  const MIN_CANDIDATES = 3;

  const areas = [
    { id: "sales", name: "Ventas y marketing" },
    { id: "service", name: "Atención al cliente" },
    { id: "operations", name: "Operaciones" },
    { id: "finance", name: "Finanzas y administración" },
    { id: "documentation", name: "Documentación y conocimiento" },
    { id: "legal", name: "Legal y cumplimiento" },
    { id: "people", name: "Personas y RR. HH." },
    { id: "technology", name: "Tecnología e IT" }
  ];

  const processCatalog = [
    { id: "lead-qualification", area: "sales", name: "Cualificación y priorización de oportunidades", levers: ["revenue", "capacity"], description: "Analizar leads, señales y siguiente mejor acción." },
    { id: "commercial-proposals", area: "sales", name: "Preparación de ofertas y propuestas", levers: ["revenue", "cost", "capacity"], description: "Preparar propuestas consistentes con contexto comercial." },
    { id: "sales-followup", area: "sales", name: "Seguimiento comercial y actualización de CRM", levers: ["revenue", "capacity"], description: "Resumir interacciones, registrar acuerdos y activar seguimientos." },
    { id: "campaign-content", area: "sales", name: "Producción y adaptación de campañas", levers: ["revenue", "capacity"], description: "Crear variantes, segmentar y evaluar contenidos." },
    { id: "customer-triage", area: "service", name: "Clasificación y respuesta inicial a consultas", levers: ["cost", "capacity", "margin"], description: "Entender intención, recuperar contexto y proponer respuesta." },
    { id: "case-resolution", area: "service", name: "Resolución asistida de incidencias", levers: ["cost", "margin", "capacity"], description: "Guiar la resolución y escalar excepciones con contexto." },
    { id: "customer-insights", area: "service", name: "Análisis de voz del cliente", levers: ["revenue", "margin", "risk"], description: "Detectar causas, tendencias y oportunidades de mejora." },
    { id: "planning", area: "operations", name: "Planificación y asignación de trabajo", levers: ["cost", "capacity", "margin"], description: "Priorizar recursos, cargas y restricciones operativas." },
    { id: "quality-control", area: "operations", name: "Control de calidad y gestión de desviaciones", levers: ["margin", "risk", "cost"], description: "Detectar anomalías y preparar acciones correctivas." },
    { id: "procurement", area: "operations", name: "Compras y comparación de proveedores", levers: ["cost", "margin", "risk"], description: "Comparar condiciones, riesgos y desempeño de proveedores." },
    { id: "maintenance", area: "operations", name: "Mantenimiento y diagnóstico de incidencias", levers: ["cost", "capacity", "risk"], description: "Ayudar al diagnóstico, programación y documentación técnica." },
    { id: "invoice-processing", area: "finance", name: "Recepción y validación de facturas", levers: ["cost", "capacity", "risk"], description: "Extraer, contrastar y enrutar facturas y excepciones." },
    { id: "closing-reporting", area: "finance", name: "Cierre y reporting financiero", levers: ["cost", "capacity", "risk"], description: "Reconciliar información y explicar variaciones." },
    { id: "collections", area: "finance", name: "Cobros y seguimiento de impagos", levers: ["revenue", "margin", "risk"], description: "Priorizar cuentas y personalizar acciones de cobro." },
    { id: "forecasting", area: "finance", name: "Previsión y análisis de escenarios", levers: ["margin", "risk", "revenue"], description: "Preparar previsiones, hipótesis y alertas para decidir." },
    { id: "document-preparation", area: "documentation", name: "Preparación de documentación e informes", levers: ["cost", "capacity", "margin"], description: "Buscar contexto, estructurar, redactar y revisar documentos." },
    { id: "knowledge-search", area: "documentation", name: "Búsqueda y consulta de conocimiento interno", levers: ["cost", "capacity", "margin"], description: "Responder con fuentes internas y permisos adecuados." },
    { id: "meeting-actions", area: "documentation", name: "Actas, acuerdos y seguimiento de reuniones", levers: ["cost", "capacity"], description: "Convertir conversaciones en decisiones y tareas trazables." },
    { id: "contract-review", area: "legal", name: "Revisión y comparación de contratos", levers: ["cost", "risk", "capacity"], description: "Detectar cláusulas, desviaciones y puntos de negociación." },
    { id: "compliance-evidence", area: "legal", name: "Recopilación de evidencias de cumplimiento", levers: ["risk", "cost", "capacity"], description: "Localizar controles, pruebas y carencias documentales." },
    { id: "policy-monitoring", area: "legal", name: "Seguimiento normativo y de políticas", levers: ["risk", "capacity"], description: "Identificar cambios y procesos potencialmente afectados." },
    { id: "recruiting", area: "people", name: "Cribado y coordinación de selección", levers: ["cost", "capacity", "margin"], description: "Organizar candidaturas y evidencias con supervisión humana." },
    { id: "onboarding", area: "people", name: "Incorporación y soporte al empleado", levers: ["capacity", "cost", "margin"], description: "Personalizar itinerarios y responder dudas frecuentes." },
    { id: "skills-planning", area: "people", name: "Mapa de capacidades y formación", levers: ["capacity", "margin"], description: "Detectar brechas y proponer aprendizaje contextual." },
    { id: "it-service-desk", area: "technology", name: "Soporte IT y resolución de tickets", levers: ["cost", "capacity", "margin"], description: "Clasificar, diagnosticar y resolver incidencias repetitivas." },
    { id: "software-delivery", area: "technology", name: "Desarrollo, pruebas y revisión de software", levers: ["capacity", "margin", "risk"], description: "Asistir cambios, pruebas, documentación y revisión." },
    { id: "incident-analysis", area: "technology", name: "Análisis y respuesta a incidentes", levers: ["risk", "capacity", "cost"], description: "Correlacionar señales y acelerar diagnóstico y recuperación." }
  ];

  const sectorProcesses = {
    professional: [
      { id: "client-deliverables", area: "documentation", name: "Elaboración de entregables para clientes", levers: ["margin", "capacity", "revenue"], description: "Preparar análisis e informes reutilizando conocimiento experto." },
      { id: "project-staffing", area: "operations", name: "Asignación de equipos a proyectos", levers: ["margin", "capacity"], description: "Cruzar demanda, disponibilidad y capacidades." }
    ],
    industrial: [
      { id: "production-anomalies", area: "operations", name: "Detección y explicación de anomalías de producción", levers: ["margin", "risk", "cost"], description: "Relacionar señales, causas y acciones correctivas." },
      { id: "technical-docs", area: "documentation", name: "Documentación técnica y de producto", levers: ["cost", "capacity", "risk"], description: "Crear y mantener documentación con trazabilidad." }
    ],
    retail: [
      { id: "demand-replenishment", area: "operations", name: "Previsión de demanda y reposición", levers: ["margin", "revenue", "cost"], description: "Reducir roturas y exceso de inventario." },
      { id: "returns", area: "service", name: "Gestión de devoluciones y reclamaciones", levers: ["cost", "margin", "risk"], description: "Clasificar causas y resolver casos con consistencia." }
    ],
    technology: [
      { id: "product-feedback", area: "service", name: "Síntesis de feedback para producto", levers: ["revenue", "margin", "capacity"], description: "Convertir señales dispersas en decisiones de producto." }
    ],
    construction: [
      { id: "tenders", area: "sales", name: "Preparación de licitaciones y concursos", levers: ["revenue", "capacity", "risk"], description: "Coordinar requisitos, evidencias y redacción de ofertas." },
      { id: "site-reporting", area: "operations", name: "Seguimiento, certificaciones y partes de obra", levers: ["margin", "risk", "cost"], description: "Contrastar avance, incidencias y documentación contractual." }
    ],
    financial: [
      { id: "kyc", area: "legal", name: "Revisión documental KYC", levers: ["risk", "cost", "capacity"], description: "Comprobar documentación y escalar discrepancias." },
      { id: "claims", area: "service", name: "Tramitación asistida de siniestros", levers: ["cost", "margin", "risk"], description: "Ordenar evidencia y acelerar decisiones supervisadas." }
    ],
    health: [
      { id: "clinical-admin", area: "documentation", name: "Documentación clínica administrativa", levers: ["capacity", "cost", "risk"], description: "Reducir carga administrativa con controles estrictos." },
      { id: "appointments", area: "service", name: "Gestión de citas y consultas administrativas", levers: ["capacity", "cost", "margin"], description: "Resolver solicitudes y optimizar agendas." }
    ],
    public: [
      { id: "citizen-services", area: "service", name: "Atención y orientación ciudadana", levers: ["capacity", "cost", "margin"], description: "Resolver consultas con información pública trazable." },
      { id: "case-files", area: "documentation", name: "Preparación y revisión de expedientes", levers: ["capacity", "risk", "cost"], description: "Comprobar completitud y preparar borradores supervisados." }
    ]
  };

  const metrics = [
    { id: "volume", group: "Eficiencia", label: "Volumen y repetición", help: "¿Con qué frecuencia se ejecuta y cuántos casos hay?" },
    { id: "effort", group: "Eficiencia", label: "Esfuerzo y coste actuales", help: "Tiempo de personas y gasto necesario por caso." },
    { id: "pain", group: "Eficiencia", label: "Errores, esperas y retrabajo", help: "Problemas que hoy destruyen capacidad o margen." },
    { id: "impact", group: "Eficacia", label: "Impacto en la cuenta de resultados", help: "Efecto potencial sobre la prioridad seleccionada." },
    { id: "standardization", group: "Viabilidad", label: "Reglas y resultado definibles", help: "Se puede describir qué significa terminar bien." },
    { id: "data", group: "Viabilidad", label: "Datos y contexto disponibles", help: "Información digital accesible, suficiente y actualizada." },
    { id: "risk", group: "Riesgo", label: "Consecuencia del error y juicio requerido", help: "Daño posible y necesidad de interpretación humana." }
  ];

  const ratingOptions = [
    ["", "Selecciona"], ["1", "1 · Muy bajo"], ["2", "2 · Bajo"], ["3", "3 · Medio"], ["4", "4 · Alto"], ["5", "5 · Muy alto"]
  ];

  const state = {
    step: 1,
    selectedAreas: [],
    selectedCandidates: [],
    customProcesses: [],
    assessments: {}
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function getAllProcesses() {
    const sector = $("#sector").value;
    return [...processCatalog, ...(sectorProcesses[sector] || []), ...state.customProcesses];
  }

  function getProcess(id) {
    return getAllProcesses().find(process => process.id === id);
  }

  function getAreaName(id) {
    return areas.find(area => area.id === id)?.name || "Otra área";
  }

  function renderAreas() {
    $("#areaChoices").innerHTML = areas.map(area => `
      <label class="area-option">
        <input type="checkbox" name="areas" value="${area.id}" ${state.selectedAreas.includes(area.id) ? "checked" : ""}>
        <span>${escapeHtml(area.name)}</span>
      </label>
    `).join("");

    const areaSelect = $("#customProcessArea");
    areaSelect.innerHTML = areas.map(area => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("");
  }

  function renderCandidates() {
    const container = $("#candidateChoices");
    const available = getAllProcesses().filter(process => state.selectedAreas.includes(process.area));
    state.selectedCandidates = state.selectedCandidates.filter(id => getAllProcesses().some(process => process.id === id));

    if (!available.length) {
      container.innerHTML = `<div class="empty-state">Selecciona una o varias áreas para descubrir procesos candidatos.</div>`;
    } else {
      container.innerHTML = available.map(process => `
        <label class="candidate-option">
          <input type="checkbox" name="candidates" value="${process.id}" ${state.selectedCandidates.includes(process.id) ? "checked" : ""}>
          <span>
            <strong>${escapeHtml(process.name)}</strong>
            <small>${escapeHtml(process.description)}</small>
            <em aria-hidden="true">✓</em>
          </span>
        </label>
      `).join("");
    }
    updateCandidateCounter();
  }

  function updateCandidateCounter() {
    const count = state.selectedCandidates.length;
    const counter = $("#candidateCounter");
    counter.textContent = count >= MIN_CANDIDATES ? `${count} seleccionados` : `${count} de ${MIN_CANDIDATES} mínimo`;
    counter.classList.toggle("is-valid", count >= MIN_CANDIDATES && count <= MAX_CANDIDATES);
  }

  function addCustomProcess() {
    const input = $("#customProcessName");
    const name = input.value.trim();
    if (!name) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    const area = $("#customProcessArea").value;
    const id = `custom-${Date.now()}`;
    state.customProcesses.push({ id, area, name, levers: [$("input[name='priority']:checked")?.value || "margin"], description: "Proceso añadido por la empresa." });
    if (!state.selectedAreas.includes(area)) state.selectedAreas.push(area);
    if (state.selectedCandidates.length < MAX_CANDIDATES) state.selectedCandidates.push(id);
    input.value = "";
    renderAreas();
    renderCandidates();
    persistState();
  }

  function renderAssessments() {
    const list = $("#assessmentList");
    list.innerHTML = state.selectedCandidates.map(id => {
      const process = getProcess(id);
      if (!process) return "";
      const values = state.assessments[id] || {};
      const completed = metrics.filter(metric => values[metric.id]).length;
      return `
        <article class="assessment-card" data-process-id="${id}">
          <header class="assessment-card-header">
            <div><h3>${escapeHtml(process.name)}</h3><p>${escapeHtml(getAreaName(process.area))}</p></div>
            <span class="assessment-progress">${completed} / ${metrics.length}</span>
          </header>
          <div class="assessment-grid">
            ${metrics.map(metric => `
              <label class="rating-field">
                <span>${escapeHtml(metric.label)}<small>${escapeHtml(metric.help)}</small></span>
                <select data-process="${id}" data-metric="${metric.id}" aria-label="${escapeHtml(metric.label)}: ${escapeHtml(process.name)}">
                  ${ratingOptions.map(([value, label]) => `<option value="${value}" ${String(values[metric.id] || "") === value ? "selected" : ""}>${label}</option>`).join("")}
                </select>
              </label>
            `).join("")}
          </div>
        </article>
      `;
    }).join("");
  }

  function normalized(value) {
    return ((Number(value) - 1) / 4) * 100;
  }

  function objectiveFit(process, priority) {
    if (process.levers.includes(priority)) return 100;
    const adjacent = {
      cost: ["capacity", "margin"], revenue: ["margin", "capacity"], capacity: ["cost", "margin"],
      margin: ["cost", "revenue", "capacity"], risk: ["margin", "cost"]
    };
    return process.levers.some(lever => (adjacent[priority] || []).includes(lever)) ? 68 : 42;
  }

  function scoreProcess(process) {
    const a = state.assessments[process.id];
    const priority = $("input[name='priority']:checked").value;
    const efficiency = 0.35 * normalized(a.volume) + 0.40 * normalized(a.effort) + 0.25 * normalized(a.pain);
    const effectiveness = 0.72 * normalized(a.impact) + 0.28 * objectiveFit(process, priority);
    const feasibility = 0.55 * normalized(a.standardization) + 0.45 * normalized(a.data);
    let risk = normalized(a.risk);
    if ($("#regulated").checked) risk = Math.min(100, risk + 10);

    const tolerance = $("#riskTolerance").value;
    const riskWeight = tolerance === "cautious" ? 0.18 : tolerance === "bold" ? 0.08 : 0.12;
    const positiveWeight = 1 - riskWeight;
    let score = positiveWeight * (0.40 * efficiency + 0.38 * effectiveness + 0.22 * feasibility) + riskWeight * (100 - risk);

    const maturity = Number($("#maturity").value);
    if (maturity <= 2 && risk >= 75) score = Math.min(score, 64);
    if ($("#horizon").value === "3" && feasibility < 50) score -= 5;

    return {
      process,
      score: Math.max(0, Math.min(100, Math.round(score))),
      efficiency: Math.round(efficiency),
      effectiveness: Math.round(effectiveness),
      feasibility: Math.round(feasibility),
      risk: Math.round(risk)
    };
  }

  function recommendationLabel(result) {
    if (result.risk >= 80) return "Validar con controles estrictos";
    if (result.score >= 75) return "Prioridad alta";
    if (result.score >= 60) return "Buen candidato para piloto";
    if (result.score >= 45) return "Explorar antes de invertir";
    return "Posponer";
  }

  function recommendationText(result) {
    const strengths = [
      [result.effectiveness, "impacto económico"],
      [result.efficiency, "ganancia de eficiencia"],
      [result.feasibility, "viabilidad de implantación"]
    ].sort((a, b) => b[0] - a[0]);
    const riskText = result.risk >= 70
      ? "El riesgo exige límites claros, revisión humana y una prueba sin acciones autónomas."
      : result.risk >= 45
        ? "El piloto debe definir aprobaciones y excepciones antes de automatizar acciones."
        : "El perfil de riesgo es compatible con un primer piloto controlado.";
    return `Destaca principalmente por ${strengths[0][1]} y ${strengths[1][1]}. ${riskText}`;
  }

  function renderResults() {
    const results = state.selectedCandidates.map(id => scoreProcess(getProcess(id))).sort((a, b) => b.score - a.score);
    const top = results[0];
    const company = $("#companyName").value.trim() || "la empresa";

    $("#topRecommendation").innerHTML = `
      <div>
        <p class="recommendation-kicker">${escapeHtml(recommendationLabel(top))} para ${escapeHtml(company)}</p>
        <h3>${escapeHtml(top.process.name)}</h3>
        <p>${escapeHtml(recommendationText(top))}</p>
      </div>
      <div class="recommendation-score"><strong>${top.score}</strong><span>puntos sobre 100</span></div>
    `;

    $("#rankingList").innerHTML = results.map((result, index) => `
      <article class="ranking-item">
        <div class="ranking-label"><strong>${index + 1}. ${escapeHtml(result.process.name)}</strong><small>${escapeHtml(recommendationLabel(result))}</small></div>
        <div class="bar-track" role="img" aria-label="${escapeHtml(result.process.name)}: ${result.score} puntos"><div class="bar-fill" style="width:${result.score}%"></div></div>
        <div class="ranking-score">${result.score}</div>
        <div class="ranking-breakdown">
          <span>Eficiencia <b>${result.efficiency}</b></span>
          <span>Eficacia <b>${result.effectiveness}</b></span>
          <span>Viabilidad <b>${result.feasibility}</b></span>
          <span>Riesgo <b>${result.risk}</b></span>
        </div>
      </article>
    `).join("");

    $("#scorecardProcessName").textContent = top.process.name;
    const scorecard = [
      ["Trabajo útil", "Tareas completadas con el estándar acordado", "Contar resultados terminados, no consultas ni tokens."],
      ["Coste", "Coste completo por tarea exitosa", "IA, licencias, integración, tiempo humano, revisión, reintentos y retrabajo."],
      ["Fiabilidad", "% listo para usar", "Resultado aceptado sin correcciones ni una segunda ejecución."],
      ["Fiabilidad", "% con corrección o escalado", "Separar ediciones humanas de casos que una persona debe terminar."],
      ["Valor", "Impacto económico por tarea", "Ahorro realizado, margen, ingreso incremental o pérdida evitada."],
      ["Escala", "Valor útil por euro", "Valor económico de tareas exitosas dividido por su coste completo."],
      ["Adopción útil", "% del volumen elegible completado", "Mide cobertura del proceso sin confundirla con valor."],
      ["Control", "Incidentes y acciones fuera de política", "Privacidad, seguridad, permisos, trazabilidad y aprobaciones."]
    ];
    $("#scorecardMetrics").innerHTML = scorecard.map(([type, name, description]) => `
      <article class="metric-card"><span class="metric-type">${type}</span><strong>${name}</strong><p>${description}</p></article>
    `).join("");

    state.lastResults = results.map(result => ({
      process: result.process.name,
      area: getAreaName(result.process.area),
      score: result.score,
      efficiency: result.efficiency,
      effectiveness: result.effectiveness,
      feasibility: result.feasibility,
      risk: result.risk,
      recommendation: recommendationLabel(result)
    }));
    persistState();
  }

  function validateStep(step) {
    clearValidation();
    if (step === 1) {
      const required = [$("#sector"), $("#companySize"), $("#horizon"), $("#maturity"), $("#riskTolerance")];
      const priority = $("input[name='priority']:checked");
      const invalid = required.filter(field => !field.value);
      invalid.forEach(field => field.setAttribute("aria-invalid", "true"));
      if (!priority) {
        const legend = $(".choice-group legend");
        legend.classList.add("text-error");
      }
      if (invalid.length || !priority) {
        (invalid[0] || $("input[name='priority']")).focus();
        return false;
      }
    }
    if (step === 2) {
      if (!state.selectedAreas.length) {
        $("#areaError").textContent = "Selecciona al menos un área.";
        return false;
      }
      if (state.selectedCandidates.length < MIN_CANDIDATES || state.selectedCandidates.length > MAX_CANDIDATES) {
        $("#candidateError").textContent = `Selecciona entre ${MIN_CANDIDATES} y ${MAX_CANDIDATES} procesos para compararlos.`;
        return false;
      }
    }
    if (step === 3) {
      const empty = $$("#assessmentList select").filter(select => !select.value);
      empty.forEach(select => select.setAttribute("aria-invalid", "true"));
      if (empty.length) {
        $("#assessmentError").textContent = `Faltan ${empty.length} valoraciones. Completa todos los criterios para obtener una comparación válida.`;
        empty[0].focus();
        return false;
      }
    }
    return true;
  }

  function clearValidation() {
    $$("[aria-invalid='true']").forEach(field => field.removeAttribute("aria-invalid"));
    $$(".validation-message").forEach(message => { message.textContent = ""; });
    $$(".text-error").forEach(item => item.classList.remove("text-error"));
  }

  function showStep(step) {
    state.step = step;
    $$(".wizard-step").forEach(section => {
      const active = Number(section.dataset.step) === step;
      section.hidden = !active;
      section.classList.toggle("is-active", active);
    });
    $$("[data-step-indicator]").forEach(indicator => {
      const number = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle("is-active", number === step);
      indicator.classList.toggle("is-complete", number < step);
      if (number === step) indicator.setAttribute("aria-current", "step"); else indicator.removeAttribute("aria-current");
    });
    $("#previousStep").hidden = step === 1 || step === 4;
    $("#nextStep").hidden = step === 4;
    $("#wizardActions").hidden = step === 4;
    if (step === 2) { renderAreas(); renderCandidates(); }
    if (step === 3) renderAssessments();
    if (step === 4) renderResults();
    persistState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function collectFormState() {
    const fields = ["companyName", "sector", "companySize", "horizon", "maturity", "riskTolerance"];
    const form = {};
    fields.forEach(id => { form[id] = $(`#${id}`).value; });
    form.priority = $("input[name='priority']:checked")?.value || "";
    form.regulated = $("#regulated").checked;
    return form;
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        step: Math.min(state.step, 3),
        form: collectFormState()
      }));
    } catch (_) { /* localStorage may be disabled; the wizard still works. */ }
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      Object.assign(state, {
        step: saved.step || 1,
        selectedAreas: saved.selectedAreas || [],
        selectedCandidates: saved.selectedCandidates || [],
        customProcesses: saved.customProcesses || [],
        assessments: saved.assessments || {}
      });
      if (saved.form) {
        Object.entries(saved.form).forEach(([key, value]) => {
          if (key === "priority") {
            const radio = $(`input[name='priority'][value='${value}']`);
            if (radio) radio.checked = true;
          } else if (key === "regulated") {
            $("#regulated").checked = Boolean(value);
          } else if ($(`#${key}`)) {
            $(`#${key}`).value = value;
          }
        });
      }
    } catch (_) { localStorage.removeItem(STORAGE_KEY); }
  }

  function exportReport() {
    const payload = {
      generatedAt: new Date().toISOString(),
      company: collectFormState(),
      selectedAreas: state.selectedAreas.map(getAreaName),
      ranking: state.lastResults || [],
      methodology: {
        dimensions: ["eficiencia", "eficacia", "viabilidad", "riesgo"],
        note: "Priorización relativa. Requiere validar línea base, coste completo, calidad y valor por tarea antes de invertir."
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-scorecard-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function restart() {
    if (!window.confirm("¿Quieres borrar las respuestas y empezar un diagnóstico nuevo?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  function bindEvents() {
    $("#nextStep").addEventListener("click", () => {
      if (!validateStep(state.step)) return;
      showStep(state.step + 1);
    });
    $("#previousStep").addEventListener("click", () => showStep(state.step - 1));
    $("#addCustomProcess").addEventListener("click", addCustomProcess);
    $("#customProcessName").addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); addCustomProcess(); }
    });
    $("#areaChoices").addEventListener("change", event => {
      if (!event.target.matches("input[name='areas']")) return;
      state.selectedAreas = $$("input[name='areas']:checked").map(input => input.value);
      renderCandidates();
      persistState();
    });
    $("#candidateChoices").addEventListener("change", event => {
      if (!event.target.matches("input[name='candidates']")) return;
      const id = event.target.value;
      if (event.target.checked && state.selectedCandidates.length >= MAX_CANDIDATES) {
        event.target.checked = false;
        $("#candidateError").textContent = `El máximo es ${MAX_CANDIDATES}; desmarca uno para añadir otro.`;
        return;
      }
      if (event.target.checked) state.selectedCandidates.push(id);
      else state.selectedCandidates = state.selectedCandidates.filter(candidate => candidate !== id);
      delete state.assessments[id];
      $("#candidateError").textContent = "";
      updateCandidateCounter();
      persistState();
    });
    $("#assessmentList").addEventListener("change", event => {
      const select = event.target.closest("select[data-process]");
      if (!select) return;
      const id = select.dataset.process;
      state.assessments[id] = state.assessments[id] || {};
      state.assessments[id][select.dataset.metric] = Number(select.value);
      select.removeAttribute("aria-invalid");
      const card = select.closest(".assessment-card");
      const completed = $$("select", card).filter(item => item.value).length;
      $(".assessment-progress", card).textContent = `${completed} / ${metrics.length}`;
      persistState();
    });
    $("#sector").addEventListener("change", () => { renderCandidates(); persistState(); });
    $("#diagnosticForm").addEventListener("change", persistState);
    $("#diagnosticForm").addEventListener("input", event => { if (event.target.id === "companyName") persistState(); });
    $("#exportReport").addEventListener("click", exportReport);
    $("#printReport").addEventListener("click", () => window.print());
    $("#restartWizard").addEventListener("click", restart);
  }

  renderAreas();
  restoreState();
  renderAreas();
  renderCandidates();
  bindEvents();
  showStep(state.step);
})();

