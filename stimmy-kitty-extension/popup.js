const BACKEND_URL = 'https://stimmy-kitty-backend.vercel.app/api/search'; // Replace with your Vercel deployment URL

const stimModeButton = document.getElementById('stimModeButton');
const searchModeButton = document.getElementById('searchModeButton');
const kittyLabel = document.getElementById('kittyLabel');
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const statusEl = document.getElementById('status');
const bubbleResultsEl = document.getElementById('bubbleResults');
const resultsEl = document.getElementById('results');
const kittyBlock = document.querySelector('.kitty-block');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

const PARTICLE_COLORS = ['#c9a0dc', '#f5c6e8', '#ffffff', '#e0baff', '#a0d4dc'];
const PARTICLE_COUNT = 16;
const CANVAS_SIZE = 180;
const INITIAL_RESULT_COUNT = 1;
const FRESH_RESULT_COUNT = 1;

let particles = [];
let animating = false;
let activeMode = 'stim';
let currentResults = [];
let currentQuery = '';
let fetchingFreshResults = false;

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
canvas.style.width = '100%';
canvas.style.height = '100%';
ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

function setMode(mode) {
  activeMode = mode;
  if (mode === 'stim') {
    stimModeButton.classList.add('active');
    searchModeButton.classList.remove('active');
    searchPanel.classList.add('hidden');
    resetSearchResults();
    kittyLabel.textContent = 'tap the kitty';
    statusEl.textContent = '';
  } else {
    stimModeButton.classList.remove('active');
    searchModeButton.classList.add('active');
    searchPanel.classList.remove('hidden');
    kittyLabel.textContent = currentResults.length ? 'tap the kitty for fresh picks' : 'type a search and tap search';
  }
}

function resetSearchResults() {
  bubbleResultsEl.classList.add('hidden');
  bubbleResultsEl.innerHTML = '';
  resultsEl.innerHTML = '';
  currentResults = [];
  currentQuery = '';
  fetchingFreshResults = false;
}

function createParticle(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 1.5 + Math.random() * 3;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1,
    decay: 0.015 + Math.random() * 0.02,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
  };
}

function spawnParticles(x, y, count = PARTICLE_COUNT) {
  for (let i = 0; i < count; i += 1) {
    particles.push(createParticle(x, y));
  }
  startAnimation();
}

function drawParticles() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  particles = particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= particle.decay;
    const alpha = Math.max(particle.life, 0);
    if (alpha <= 0) {
      return false;
    }

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return true;
  });
}

function animationLoop() {
  if (particles.length > 0) {
    drawParticles();
    requestAnimationFrame(animationLoop);
  } else {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    animating = false;
  }
}

function startAnimation() {
  if (!animating) {
    animating = true;
    requestAnimationFrame(animationLoop);
  }
}

function triggerSparkles() {
  spawnParticles(CANVAS_SIZE / 2, CANVAS_SIZE / 2, PARTICLE_COUNT * 2);
}

kittyBlock.addEventListener('click', (event) => {
  const rect = kittyBlock.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE;
  const y = ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE;

  if (activeMode === 'search') {
    fetchFreshRecommendations();
    spawnParticles(x, y, PARTICLE_COUNT * 2);
    return;
  }

  spawnParticles(x, y);
});

stimModeButton.addEventListener('click', () => setMode('stim'));
searchModeButton.addEventListener('click', () => setMode('search'));

function appendText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text || '';
  parent.appendChild(element);
  return element;
}

function createResultCard(item, index) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.dataset.index = String(index);
  appendText(card, 'p', 'result-title', item.name);
  appendText(card, 'span', 'result-pill', item.tag);
  appendText(card, 'p', 'result-detail', item.detail);
  return card;
}

function createBubble(item) {
  const bubble = document.createElement('div');
  const slot = bubbleResultsEl.children.length % FRESH_RESULT_COUNT;
  bubble.className = `bubble slot-${slot}`;
  appendText(bubble, 'p', 'result-title', item.name);
  appendText(bubble, 'span', 'result-pill', item.tag);
  appendText(bubble, 'p', 'result-detail', item.detail);
  return bubble;
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function appendResults(items, { asBubbles = false } = {}) {
  const existingNames = new Set(currentResults.map((item) => normalizeName(item.name)));
  const freshItems = items.filter((item) => {
    const name = normalizeName(item.name);
    return name && !existingNames.has(name);
  });

  if (!freshItems.length) {
    return 0;
  }

  if (asBubbles) {
    bubbleResultsEl.innerHTML = '';
    bubbleResultsEl.classList.remove('hidden');
  }

  freshItems.forEach((item) => {
    const index = currentResults.length;
    currentResults.push(item);
    const card = createResultCard(item, index);
    resultsEl.appendChild(card);
    requestAnimationFrame(() => card.classList.add('visible'));

    if (asBubbles) {
      const bubble = createBubble(item);
      bubbleResultsEl.appendChild(bubble);
      requestAnimationFrame(() => bubble.classList.add('visible'));
    }
  });

  return freshItems.length;
}

async function requestRecommendations({ count }) {
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: currentQuery,
      count,
      excludeNames: currentResults.map((item) => item.name),
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  let data;
  try {
    data = contentType.includes('application/json') ? JSON.parse(responseText) : null;
  } catch (error) {
    throw new Error('Backend returned invalid JSON. Check that BACKEND_URL points to /api/search.');
  }

  if (!data) {
    throw new Error('Backend returned a web page instead of JSON. Check your Vercel URL and use /api/search.');
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Search failed');
  }

  if (!Array.isArray(data.results)) {
    throw new Error('Unexpected response from backend');
  }

  return data.results;
}

async function fetchFreshRecommendations() {
  if (!currentQuery) {
    kittyLabel.textContent = 'search first, then tap the kitty';
    return;
  }

  if (fetchingFreshResults) {
    return;
  }

  fetchingFreshResults = true;
  kittyLabel.textContent = 'finding fresh picks...';
  statusEl.textContent = '';

  try {
    const results = await requestRecommendations({ count: FRESH_RESULT_COUNT });
    const addedCount = appendResults(results, { asBubbles: true });
    kittyLabel.textContent = addedCount
      ? 'tap the kitty for more fresh picks'
      : 'no new picks that time, tap again';
  } catch (error) {
    console.error(error);
    statusEl.textContent = error.message || 'Unable to fetch fresh picks.';
    kittyLabel.textContent = 'tap the kitty to try again';
  } finally {
    fetchingFreshResults = false;
  }
}

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    statusEl.textContent = 'Please enter a search query.';
    return;
  }

  if (BACKEND_URL.includes('YOUR-PROJECT')) {
    statusEl.textContent = 'Set BACKEND_URL in popup.js to your deployed backend URL first.';
    return;
  }

  statusEl.textContent = 'Searching...';
  searchButton.disabled = true;
  bubbleResultsEl.classList.add('hidden');
  bubbleResultsEl.innerHTML = '';
  currentResults = [];
  currentQuery = query;
  resultsEl.innerHTML = '';

  try {
    const results = await requestRecommendations({ count: INITIAL_RESULT_COUNT });
    appendResults(results, { asBubbles: true });

    statusEl.textContent = '';
    kittyLabel.textContent = 'tap the kitty for more fresh picks';
    triggerSparkles();
  } catch (error) {
    console.error(error);
    statusEl.textContent = error.message || 'Unable to complete the search.';
  } finally {
    searchButton.disabled = false;
  }
}

searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});

setMode('stim');
