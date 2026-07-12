const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const progress = document.getElementById('scrollProgress');

function updateScrollUI() {
  header.classList.toggle('scrolled', window.scrollY > 40);
  const distance = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${distance > 0 ? Math.min(100, (scrollY / distance) * 100) : 0}%`;
}
addEventListener('scroll', updateScrollUI, { passive: true });
updateScrollUI();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12, rootMargin: '0px 0px -5% 0px' });

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  revealObserver.observe(element);
});

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    const end = Number(target.dataset.target);
    const duration = reducedMotion ? 0 : 1500;
    const start = performance.now();
    function tick(now) {
      const amount = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - amount, 4);
      target.textContent = Math.round(end * eased).toLocaleString('es-ES');
      if (amount < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(target);
  });
}, { threshold: .65 });
document.querySelectorAll('.counter').forEach((counter) => counterObserver.observe(counter));

const roles = document.querySelectorAll('.role');
const nodes = document.querySelectorAll('.network-node');
function activateNode(name) {
  roles.forEach((role) => role.classList.toggle('active', role.dataset.node === name));
  nodes.forEach((node) => node.classList.toggle('active', node.dataset.node === name));
}
roles.forEach((role) => {
  role.addEventListener('mouseenter', () => activateNode(role.dataset.node));
  role.addEventListener('focus', () => activateNode(role.dataset.node));
  role.addEventListener('click', () => activateNode(role.dataset.node));
});
nodes.forEach((node) => node.addEventListener('mouseenter', () => activateNode(node.dataset.node)));

const glow = document.querySelector('.cursor-glow');
addEventListener('pointermove', (event) => {
  glow.style.opacity = '1';
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnetic').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const box = element.getBoundingClientRect();
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      element.style.transform = `translate(${x * .12}px, ${y * .12}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });
}

// Animated territorial network: a lightweight, responsive canvas with linked nodes.
const canvas = document.getElementById('territoryCanvas');
const context = canvas.getContext('2d');
let points = [];
let canvasWidth = 0;
let canvasHeight = 0;

function resizeCanvas() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  canvas.width = Math.round(canvasWidth * ratio);
  canvas.height = Math.round(canvasHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = Math.max(18, Math.floor(canvasWidth / 70));
  points = Array.from({ length: count }, (_, index) => ({
    x: (index / count) * canvasWidth + Math.random() * 80,
    y: canvasHeight * (.15 + Math.random() * .75),
    ox: Math.random() * Math.PI * 2,
    speed: .0003 + Math.random() * .0005,
    radius: Math.random() > .8 ? 2.3 : 1.2
  }));
}

function drawTerritory(time = 0) {
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  const positions = points.map((point) => ({
    ...point,
    px: point.x + Math.sin(time * point.speed + point.ox) * 16,
    py: point.y + Math.cos(time * point.speed * .8 + point.ox) * 12
  }));
  context.lineWidth = .7;
  positions.forEach((point, index) => {
    positions.slice(index + 1).forEach((other) => {
      const distance = Math.hypot(point.px - other.px, point.py - other.py);
      if (distance < 180) {
        context.strokeStyle = `rgba(200,255,61,${(1 - distance / 180) * .15})`;
        context.beginPath(); context.moveTo(point.px, point.py); context.lineTo(other.px, other.py); context.stroke();
      }
    });
    context.fillStyle = point.radius > 2 ? 'rgba(200,255,61,.75)' : 'rgba(243,240,232,.26)';
    context.beginPath(); context.arc(point.px, point.py, point.radius, 0, Math.PI * 2); context.fill();
  });
  if (!reducedMotion) requestAnimationFrame(drawTerritory);
}
resizeCanvas();
addEventListener('resize', resizeCanvas);
drawTerritory();

document.getElementById('year').textContent = new Date().getFullYear();

