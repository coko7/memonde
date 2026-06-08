/* ── UI strings ── */
const STRINGS = {
  en: {
    score: "Score",
    start: "Start",
    share: "Share",
    copied: "Copied",
    copySummary: "Copy summary",
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
    share: "Partager",
    copied: "Copié",
    copySummary: "Copier le résumé",
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
const continentTableEl = document.getElementById("continent-table");
const tableHeader = document.getElementById("table-header");
const tableBody = document.getElementById("table-body");
const btnShare = document.getElementById("btn-share");
const btnCopySummary = document.getElementById("btn-copy-summary");
const mapTooltipEl = document.getElementById("map-tooltip");

/* ── Map ── */
let pathByNumeric = {};
let dotByIso2 = {};
let feedbackTimeout = null;
let mapTooltipTimeout = null;

function showMapTooltip(name, x, y) {
  clearTimeout(mapTooltipTimeout);
  mapTooltipEl.textContent = name;
  mapTooltipEl.style.left = x + "px";
  mapTooltipEl.style.top = y + "px";
  mapTooltipEl.style.opacity = "1";
  mapTooltipTimeout = setTimeout(() => { mapTooltipEl.style.opacity = "0"; }, 1500);
}

function hideMapTooltip() {
  clearTimeout(mapTooltipTimeout);
  mapTooltipEl.style.opacity = "0";
}

// [lon, lat] centroids for countries too small to see at 110m resolution
// TODO: Avoid hardcoding stuff, it would be better to get this data from the dataset
const MICRO_DOTS = {
  // European micro-states
  VA: [12.453, 41.903], MC: [7.425, 43.738], SM: [12.458, 43.942],
  LI: [9.555, 47.141], AD: [1.602, 42.547], MT: [14.438, 35.938],
  // Caribbean
  AG: [-61.796, 17.075], BB: [-59.543, 13.194], DM: [-61.371, 15.415],
  GD: [-61.679, 12.117], KN: [-62.783, 17.358], LC: [-60.979, 13.909],
  VC: [-61.197, 13.253],
  // Middle East / Asia
  BH: [50.558, 26.028], SG: [103.820, 1.352], MV: [73.221, 3.203],
  // Pacific
  NR: [166.931, -0.523], TV: [177.649, -7.110], PW: [134.583, 7.515],
  MH: [171.185, 7.131], KI: [172.972, 1.452], FM: [158.215, 6.888],
  WS: [-172.105, -13.759], TO: [-175.198, -21.179],
  // Small African islands
  CV: [-23.042, 16.539], ST: [6.613, 0.186], KM: [43.333, -11.645],
  SC: [55.492, -4.680], MU: [57.552, -20.348],
};

async function initMap() {
  const world = await d3.json(
    "https://cdn.jsdelivr.net/npm/visionscarto-world-atlas@1/world/110m.json"
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
      // TODO: ugly fix to include Kosovo which has the wrong numeric ID
      // it should be 926 instead of '-2'
      if (d.id === "-2") {
        d.id = 926;
      }

      const iso2 = numericToIso2[+d.id];
      if (iso2) {
        this.dataset.iso2 = iso2;
        this.classList.add("in-set");
        pathByNumeric[+d.id] = this;
      }
    });

  // Dot markers for countries too small to have a visible path
  for (const [iso2, [lon, lat]] of Object.entries(MICRO_DOTS)) {
    const country = window.COUNTRIES.find(c => c.iso2 === iso2);
    if (!country) continue;

    const [x, y] = projection([lon, lat]);
    const node = mapGroup.append("circle")
      .attr("class", "dot-marker in-set")
      .attr("data-iso2", iso2)
      .attr("cx", x).attr("cy", y)
      .attr("r", 0.5)
      .node();

    dotByIso2[iso2] = node;
  }

  // Zoom behaviour
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", event => {
      mapGroup.attr("transform", event.transform);
      hideMapTooltip();
    });

  svg.call(zoom);

  // Double-click resets to initial view instead of zooming in
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  });

  // Show country name on click for guessed/missed countries
  svg.on("click", (event) => {
    const target = event.target;
    const iso2 = target.dataset.iso2;
    if (!iso2) return;
    if (!target.classList.contains("guessed") && !target.classList.contains("missed")) return;

    const cell = tableBody.querySelector(`[data-iso2="${iso2}"]`);
    if (!cell) return;

    const svgRect = event.currentTarget.getBoundingClientRect();
    showMapTooltip(cell.textContent, event.clientX - svgRect.left, event.clientY - svgRect.top);
  });
}

function highlightCountry(iso2, cls) {
  const country = window.COUNTRIES.find(x => x.iso2 === iso2);
  if (!country) return;

  const path = pathByNumeric[country.numeric];
  const dot = dotByIso2[iso2];

  if (path) path.classList.add(cls);
  if (dot) dot.classList.add(cls);
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

  // Header
  for (const continent of CONTINENTS) {
    const th = document.createElement("th");
    const guessedCount = [...guessed].filter(iso2 =>
      window.COUNTRIES.find(c => c.iso2 === iso2)?.continent === continent
    ).length;
    th.innerHTML = `${str.continents[continent]}<span class="count">${guessedCount}/${continentTotals[continent]}</span>`;
    th.dataset.continent = continent;
    tableHeader.appendChild(th);
  }

  // Pre-fill all cells in alphabetical order; hide unguessed ones
  const maxRows = Math.max(...CONTINENTS.map(continent => continentCountries[continent].length));
  for (let i = 0; i < maxRows; i++) {
    const tr = tableBody.insertRow();

    for (const continent of CONTINENTS) {
      const country = continentCountries[continent][i];
      const td = tr.insertCell();

      if (country) {
        td.dataset.iso2 = country.iso2;
        td.textContent = country.name[language];
        const aliases = country.aliases[language] || [];

        if (aliases.length) {
          const small = document.createElement("small");
          small.className = "cell-aliases";
          small.textContent = aliases.filter(a => a !== country.name[language]).join(", ");
          td.appendChild(small);
        }

        if (guessed.has(country.iso2)) {
          td.classList.add("guessed-cell");
        } else {
          td.classList.add("cell-hidden");
        }
      }
    }
  }
}

function updateTableHeader(language, guessed) {
  const str = STRINGS[language];
  for (const continent of CONTINENTS) {
    const th = tableHeader.querySelector(`[data-continent="${continent}"]`);
    if (!th) continue;

    const guessedCount = [...guessed].filter(iso2 =>
      window.COUNTRIES.find(c => c.iso2 === iso2)?.continent === continent
    ).length;
    th.innerHTML = `${str.continents[continent]}<span class="count">${guessedCount}/${continentTotals[continent]}</span>`;
  }
}

function revealInTable(iso2, isMissed = false) {
  const cell = tableBody.querySelector(`[data-iso2="${iso2}"]`);
  if (!cell) return;
  cell.classList.remove("cell-hidden");
  if (isMissed) cell.classList.add("missed-cell");
  else cell.classList.add("guessed-cell");
}

function revealMissedInTable(guessed) {
  for (const country of window.COUNTRIES) {
    if (!guessed.has(country.iso2)) revealInTable(country.iso2, true);
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
  localStorage.setItem("theme", next);
}
