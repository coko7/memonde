/* ── Matching engine ── */

function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[''.\-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

// Confusable families — members must not fuzzy-match across each other
const CONFUSABLE_FAMILIES = [
  ["iran", "iraq"],
  ["niger", "nigeria"],
  ["austria", "australia"],
  ["slovakia", "slovenia"],
  ["dominica", "dominican republic"],
  ["sudan", "south sudan"],
  ["republic of the congo", "democratic republic of the congo", "congo"],
  ["north korea", "south korea"],
  ["guinea", "guinea bissau", "equatorial guinea", "papua new guinea"],
  ["saint kitts and nevis", "saint lucia", "saint vincent and the grenadines"],
  // French variants
  ["iran", "irak"],
  ["niger", "nigeria"],
  ["autriche", "australie"],
  ["slovaquie", "slovenie"],
  ["dominique", "republique dominicaine"],
  ["soudan", "soudan du sud"],
  ["republique du congo", "republique democratique du congo"],
  ["coree du nord", "coree du sud"],
  ["guinee", "guinee bissau", "guinee equatoriale", "papouasie nouvelle guinee"],
].map(family => family.map(norm));

function inSameFamily(a, b) {
  const na = norm(a), nb = norm(b);
  return CONFUSABLE_FAMILIES.some(fam => fam.includes(na) && fam.includes(nb));
}

function buildIndexes(lang) {
  const exactIndex = new Map(); // normName → iso2
  const fuzzyList = [];         // [{iso2, n}]

  for (const c of window.COUNTRIES) {
    const canonical = norm(c.name[lang]);
    exactIndex.set(canonical, c.iso2);
    fuzzyList.push({ iso2: c.iso2, n: canonical, display: c.name[lang] });

    for (const alias of (c.aliases[lang] || [])) {
      const na = norm(alias);
      if (!exactIndex.has(na)) exactIndex.set(na, c.iso2);
      fuzzyList.push({ iso2: c.iso2, n: na, display: c.name[lang] });
    }
  }
  return { exactIndex, fuzzyList };
}

function matchInput(raw, lang, indexes, guessed) {
  if (!raw.trim()) return null;
  const n = norm(raw);
  const { exactIndex, fuzzyList } = indexes;

  // 1. Exact
  if (exactIndex.has(n)) {
    const iso2 = exactIndex.get(n);
    return { iso2, type: guessed.has(iso2) ? "duplicate" : "correct" };
  }

  // 2. Fuzzy
  const threshold = n.length <= 6 ? 1 : 2;
  const candidates = fuzzyList.filter(item => levenshtein(n, item.n) <= threshold);

  // Deduplicate by iso2
  const seen = new Map();
  for (const c of candidates) {
    if (!seen.has(c.iso2)) seen.set(c.iso2, c);
  }
  const unique = [...seen.values()];

  if (unique.length === 0) return { iso2: null, type: "nomatch" };

  if (unique.length === 1) {
    const candidate = unique[0];
    // Guard: reject if input is also close to another member of the same confusable family
    const danger = fuzzyList.some(item =>
      item.iso2 !== candidate.iso2 &&
      levenshtein(n, item.n) <= threshold &&
      inSameFamily(candidate.display, item.display)
    );
    if (danger) return { iso2: null, type: "nomatch" };
    return { iso2: candidate.iso2, type: guessed.has(candidate.iso2) ? "duplicate" : "correct" };
  }

  // Multiple candidates → reject
  return { iso2: null, type: "nomatch" };
}

/* ── UI strings ── */
const STRINGS = {
  en: {
    score: "Score",
    start: "Start",
    giveUp: "Give Up",
    playAgain: "Play Again",
    inputPlaceholder: "Type a country…",
    alreadyGot: "already got it",
    continents: {
      "Africa": "Africa",
      "Asia": "Asia",
      "Europe": "Europe",
      "North America": "N. America",
      "South America": "S. America",
      "Oceania": "Oceania",
    },
  },
  fr: {
    score: "Score",
    start: "Démarrer",
    giveUp: "Abandonner",
    playAgain: "Rejouer",
    inputPlaceholder: "Tapez un pays…",
    alreadyGot: "déjà trouvé",
    continents: {
      "Africa": "Afrique",
      "Asia": "Asie",
      "Europe": "Europe",
      "North America": "Amér. Nord",
      "South America": "Amér. Sud",
      "Oceania": "Océanie",
    },
  },
};

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

/* ── State ── */
let state = {
  status: "idle",   // idle | running | ended
  language: "en",
  guessed: new Set(),
  endTime: null,
  score: 0,
};
let indexes = null;
let timerInterval = null;
let feedbackTimeout = null;

// Per-continent country lists (derived from COUNTRIES)
const continentCountries = {}; // continent → [country]
for (const cont of CONTINENTS) continentCountries[cont] = [];
for (const c of window.COUNTRIES) continentCountries[c.continent].push(c);
// Sort alphabetically for stable display
for (const cont of CONTINENTS)
  continentCountries[cont].sort((a, b) => a.name.en.localeCompare(b.name.en));

const continentTotals = {}; // continent → total
for (const cont of CONTINENTS) continentTotals[cont] = continentCountries[cont].length;

/* ── DOM refs ── */
const timerEl = document.getElementById("timer-display");
const scoreEl = document.getElementById("score-value");
const scoreLabelEl = document.getElementById("score-label");
const inputEl = document.getElementById("country-input");
const feedbackEl = document.getElementById("feedback");
const btnAction = document.getElementById("btn-action");
const btnEn = document.getElementById("btn-en");
const btnFr = document.getElementById("btn-fr");
const tableHeader = document.getElementById("table-header");
const tableBody = document.getElementById("table-body");

/* ── Map ── */
let pathByNumeric = {};

async function initMap() {
  const world = await d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  );
  const countries110m = topojson.feature(world, world.objects.countries);
  const svgEl = document.getElementById("world-map");
  const width = svgEl.clientWidth;
  const height = svgEl.clientHeight;

  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height], countries110m);
  const path = d3.geoPath().projection(projection);

  const svg = d3.select("#world-map")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Ocean background — stays outside the zoom group so it always fills
  svg.append("rect")
    .attr("id", "ocean-bg")
    .attr("width", width).attr("height", height);

  // All country paths live in a group that receives the zoom transform
  const mapGroup = svg.append("g").attr("id", "map-group");

  // Build numeric → iso2 lookup
  const numericToIso2 = {};
  for (const c of window.COUNTRIES) numericToIso2[c.numeric] = c.iso2;

  mapGroup.selectAll("path")
    .data(countries110m.features)
    .enter().append("path")
    .attr("d", path)
    .attr("data-numeric", d => d.id)
    .each(function (d) {
      const iso2 = numericToIso2[+d.id];
      if (iso2) {
        this.dataset.iso2 = iso2;
        this.classList.add("in-set");
        pathByNumeric[+d.id] = this;
      }
    });

  // Zoom behaviour
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", event => {
      mapGroup.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Double-click resets to initial view instead of zooming in
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  });
}

function highlightCountry(iso2, cls) {
  const c = window.COUNTRIES.find(x => x.iso2 === iso2);
  if (!c) return;
  const el = pathByNumeric[c.numeric];
  if (el) el.classList.add(cls);
}

function revealMissed() {
  for (const c of window.COUNTRIES) {
    if (!state.guessed.has(c.iso2)) highlightCountry(c.iso2, "missed");
  }
}

/* ── Table ── */
function buildTable() {
  const lang = state.language;
  const str = STRINGS[lang];
  tableHeader.innerHTML = "";
  tableBody.innerHTML = "";

  for (const cont of CONTINENTS) {
    const th = document.createElement("th");
    const guessedCount = [...state.guessed].filter(iso2 =>
      window.COUNTRIES.find(c => c.iso2 === iso2)?.continent === cont
    ).length;
    th.innerHTML = `${str.continents[cont]}<span class="count">${guessedCount}/${continentTotals[cont]}</span>`;
    th.dataset.continent = cont;
    tableHeader.appendChild(th);
  }
}

function updateTableHeader() {
  const lang = state.language;
  const str = STRINGS[lang];
  for (const cont of CONTINENTS) {
    const th = tableHeader.querySelector(`[data-continent="${cont}"]`);
    if (!th) continue;
    const guessedCount = [...state.guessed].filter(iso2 =>
      window.COUNTRIES.find(c => c.iso2 === iso2)?.continent === cont
    ).length;
    th.innerHTML = `${str.continents[cont]}<span class="count">${guessedCount}/${continentTotals[cont]}</span>`;
  }
}

function appendToTable(iso2, isMissed = false) {
  const c = window.COUNTRIES.find(x => x.iso2 === iso2);
  if (!c) return;
  const lang = state.language;
  const colIdx = CONTINENTS.indexOf(c.continent);

  // Find the first row where this column's cell is empty, or create a new one
  let targetRow = null;
  for (const tr of tableBody.rows) {
    if (!tr.cells[colIdx].textContent) { targetRow = tr; break; }
  }
  if (!targetRow) {
    targetRow = tableBody.insertRow();
    for (let i = 0; i < CONTINENTS.length; i++) targetRow.insertCell();
  }

  const cell = targetRow.cells[colIdx];
  cell.textContent = c.name[lang];
  if (isMissed) cell.classList.add("missed-cell");
}

function revealMissedInTable() {
  for (const c of window.COUNTRIES) {
    if (!state.guessed.has(c.iso2)) appendToTable(c.iso2, true);
  }
}

/* ── Timer ── */
function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function tickTimer() {
  const remaining = state.endTime - Date.now();
  timerEl.textContent = formatTime(remaining);
  timerEl.classList.toggle("urgent", remaining < 60000);
  if (remaining <= 0) endGame();
}

/* ── Game actions ── */
function startGame() {
  state.status = "running";
  state.guessed = new Set();
  state.score = 0;
  state.endTime = Date.now() + 15 * 60 * 1000;

  indexes = buildIndexes(state.language);

  // Reset map
  document.querySelectorAll("#world-map path").forEach(el => {
    el.classList.remove("guessed", "missed");
  });

  // Reset table
  buildTable();
  tableBody.innerHTML = "";

  // UI
  scoreEl.textContent = "0";
  timerEl.classList.remove("urgent");
  timerEl.textContent = "15:00";
  inputEl.parentElement.hidden = false;
  inputEl.disabled = false;
  inputEl.value = "";
  inputEl.focus();
  btnAction.textContent = STRINGS[state.language].giveUp;
  btnAction.classList.add("danger");
  btnEn.disabled = true;
  btnFr.disabled = true;

  timerInterval = setInterval(tickTimer, 500);
}

function endGame() {
  clearInterval(timerInterval);
  state.status = "ended";

  timerEl.textContent = "00:00";
  timerEl.classList.remove("urgent");
  inputEl.parentElement.hidden = true;
  inputEl.disabled = true;
  inputEl.value = "";
  btnAction.textContent = STRINGS[state.language].playAgain;
  btnAction.classList.remove("danger");
  btnEn.disabled = false;
  btnFr.disabled = false;

  revealMissed();
  revealMissedInTable();
}

function resetToIdle() {
  state.status = "idle";
  state.guessed = new Set();
  state.score = 0;
  state.endTime = null;

  timerEl.textContent = "15:00";
  timerEl.classList.remove("urgent");
  scoreEl.textContent = "0";
  inputEl.parentElement.hidden = true;
  inputEl.disabled = true;
  inputEl.value = "";
  btnAction.textContent = STRINGS[state.language].start;
  btnAction.classList.remove("danger");
  btnEn.disabled = false;
  btnFr.disabled = false;

  // Reset map
  document.querySelectorAll("#world-map path").forEach(el => {
    el.classList.remove("guessed", "missed");
  });

  buildTable();
  tableBody.innerHTML = "";
}

/* ── Feedback ── */
function showFeedback(text, type) {
  clearTimeout(feedbackTimeout);
  feedbackEl.textContent = text;
  feedbackEl.className = `visible ${type}`;
  inputEl.classList.remove("flash-correct", "flash-wrong");
  void inputEl.offsetWidth; // reflow
  if (type === "correct") inputEl.classList.add("flash-correct");
  else if (type === "wrong") inputEl.classList.add("flash-wrong");
  feedbackTimeout = setTimeout(() => {
    feedbackEl.className = "";
  }, 1500);
}

/* ── Submit handler ── */
function handleSubmit() {
  if (state.status !== "running") return;
  const raw = inputEl.value;
  if (!raw.trim()) return;

  const result = matchInput(raw, state.language, indexes, state.guessed);

  if (!result || result.type === "nomatch") {
    showFeedback("?", "wrong");
    return;
  }

  if (result.type === "duplicate") {
    showFeedback(STRINGS[state.language].alreadyGot, "duplicate");
    return;
  }

  // Correct!
  state.guessed.add(result.iso2);
  state.score++;
  scoreEl.textContent = state.score;
  inputEl.value = "";
  showFeedback("✓", "correct");
  highlightCountry(result.iso2, "guessed");
  appendToTable(result.iso2);
  updateTableHeader();

  if (state.score === 197) endGame();
}

/* ── Language toggle ── */
function setLanguage(lang) {
  if (state.status === "running") return;
  state.language = lang;
  btnEn.classList.toggle("active", lang === "en");
  btnFr.classList.toggle("active", lang === "fr");
  scoreLabelEl.textContent = STRINGS[lang].score;
  inputEl.placeholder = STRINGS[lang].inputPlaceholder;
  if (state.status === "idle") {
    btnAction.textContent = STRINGS[lang].start;
    buildTable();
  } else if (state.status === "ended") {
    btnAction.textContent = STRINGS[lang].playAgain;
    // Rebuild table with correct language names
    buildTable();
    tableBody.innerHTML = "";
    for (const iso2 of state.guessed) appendToTable(iso2);
    revealMissedInTable();
  }
}

/* ── Theme toggle ── */
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.getElementById("btn-theme").textContent = next === "dark" ? "☀️" : "🌙";
}

/* ── Event wiring ── */
btnAction.addEventListener("click", () => {
  if (state.status === "idle") startGame();
  else if (state.status === "running") endGame();
  else if (state.status === "ended") resetToIdle();
});

inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") handleSubmit();
});

btnEn.addEventListener("click", () => setLanguage("en"));
btnFr.addEventListener("click", () => setLanguage("fr"));

document.getElementById("btn-theme").addEventListener("click", toggleTheme);

/* ── Init ── */
(async function init() {
  await initMap();
  buildTable();
  inputEl.placeholder = STRINGS[state.language].inputPlaceholder;
  btnAction.textContent = STRINGS[state.language].start;
})();
