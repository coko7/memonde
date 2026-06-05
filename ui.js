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
let feedbackTimeout = null;

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
  for (const country of window.COUNTRIES) {
    numericToIso2[country.numeric] = country.iso2;
  }

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
  const country = window.COUNTRIES.find(x => x.iso2 === iso2);
  if (!country) return;

  const el = pathByNumeric[country.numeric];
  if (el) el.classList.add(cls);
}

function revealMissed(guessed) {
  for (const country of window.COUNTRIES) {
    if (!guessed.has(country.iso2)) {
      highlightCountry(country.iso2, "missed");
    }
  }
}

/* ── Table ── */
function buildTable(language, guessed) {
  const str = STRINGS[language];
  tableHeader.innerHTML = "";
  tableBody.innerHTML = "";

  for (const continent of CONTINENTS) {
    const th = document.createElement("th");

    const localeContinent = str.continents[continent];
    const guessedCount = [...guessed].filter(iso2 =>
      window.COUNTRIES.find(c => c.iso2 === iso2)?.continent === continent
    ).length;
    const totalCount = continentTotals[continent];

    th.innerHTML = `${localeContinent}<span class="count">${guessedCount}/${totalCount}</span>`;
    th.dataset.continent = continent;
    tableHeader.appendChild(th);
  }
}

function updateTableHeader(language, guessed) {
  const str = STRINGS[language];

  for (const continent of CONTINENTS) {
    const th = tableHeader.querySelector(`[data-continent="${continent}"]`);
    if (!th) continue;

    const localeContinent = str.continents[continent];
    const guessedCount = [...guessed].filter(iso2 =>
      window.COUNTRIES.find(c => c.iso2 === iso2)?.continent === continent
    ).length;
    const totalCount = continentTotals[continent];

    th.innerHTML = `${localeContinent}<span class="count">${guessedCount}/${totalCount}</span>`;
  }
}

function appendToTable(iso2, isMissed = false, language) {
  const country = window.COUNTRIES.find(x => x.iso2 === iso2);
  if (!country) return;

  const colIdx = CONTINENTS.indexOf(country.continent);

  let targetRow = null;
  for (const tr of tableBody.rows) {
    if (!tr.cells[colIdx].textContent) {
      targetRow = tr;
      break;
    }
  }

  if (!targetRow) {
    targetRow = tableBody.insertRow();
    for (let i = 0; i < CONTINENTS.length; i++) {
      targetRow.insertCell();
    }
  }

  const cell = targetRow.cells[colIdx];
  cell.textContent = country.name[language];
  if (isMissed) cell.classList.add("missed-cell");
}

function revealMissedInTable(guessed, language) {
  for (const country of window.COUNTRIES) {
    if (!guessed.has(country.iso2)) appendToTable(country.iso2, true, language);
  }
}

/* ── Timer ── */
function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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

/* ── Theme ── */
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.getElementById("btn-theme").textContent = next === "dark" ? "☀️" : "🌙";
}
