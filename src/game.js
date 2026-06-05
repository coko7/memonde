// Confusable families — members must not fuzzy-match across each other
const CONFUSABLE_FAMILIES = [
  ["austria", "australia"],
  ["dominica", "dominican republic"],
  ["gambia", "zambia"],
  ["guinea", "guinea bissau", "equatorial guinea", "papua new guinea"],
  ["iran", "iraq"],
  ["niger", "nigeria"],
  ["north korea", "south korea"],
  ["republic of the congo", "democratic republic of the congo", "congo"],
  ["saint kitts and nevis", "saint lucia", "saint vincent and the grenadines"],
  ["slovakia", "slovenia"],
  ["sudan", "south sudan"],
  // French variants
  ["autriche", "australie"],
  ["coree du nord", "coree du sud"],
  ["dominique", "republique dominicaine"],
  ["gambie", "zambie"],
  ["guinee", "guinee bissau", "guinee equatoriale", "papouasie nouvelle guinee"],
  ["iran", "irak"],
  ["niger", "nigeria"],
  ["republique du congo", "republique democratique du congo"],
  ["slovaquie", "slovenie"],
  ["soudan", "soudan du sud"],
].map(family => family.map(normalize));

function inSameFamily(a, b) {
  const normA = normalize(a), normB = normalize(b);
  return CONFUSABLE_FAMILIES.some(fam => fam.includes(normA) && fam.includes(normB));
}

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

// Per-continent country lists (derived from COUNTRIES)
const continentCountries = {}; // continent → [country]
for (const continent of CONTINENTS) continentCountries[continent] = [];
for (const country of window.COUNTRIES) continentCountries[country.continent].push(country);

// Sort alphabetically for stable display
for (const continent of CONTINENTS) {
  continentCountries[continent].sort((a, b) => a.name.en.localeCompare(b.name.en));
}

const continentTotals = {}; // continent → total
for (const continent of CONTINENTS) {
  continentTotals[continent] = continentCountries[continent].length;
}

/* ── Timer ── */
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
  document.querySelectorAll("#world-map path, #world-map circle.dot-marker").forEach(el => {
    el.classList.remove("guessed", "missed");
  });

  // Reset table
  buildTable(state.language, state.guessed);
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

  revealMissed(state.guessed);
  revealMissedInTable(state.guessed, state.language);
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
  document.querySelectorAll("#world-map path, #world-map circle.dot-marker").forEach(el => {
    el.classList.remove("guessed", "missed");
  });

  buildTable(state.language, state.guessed);
  tableBody.innerHTML = "";
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
  appendToTable(result.iso2, false, state.language);
  updateTableHeader(state.language, state.guessed);

  if (state.score === 197) endGame();
}

/* ── Language toggle ── */
function setLanguage(lang) {
  if (state.status === "running") return;

  state.language = lang;
  localStorage.setItem("language", lang);
  btnEn.classList.toggle("active", lang === "en");
  btnFr.classList.toggle("active", lang === "fr");

  scoreLabelEl.textContent = STRINGS[lang].score;
  inputEl.placeholder = STRINGS[lang].inputPlaceholder;

  if (state.status === "idle") {
    btnAction.textContent = STRINGS[lang].start;
    buildTable(state.language, state.guessed);
  } else if (state.status === "ended") {
    btnAction.textContent = STRINGS[lang].playAgain;
    buildTable(state.language, state.guessed);
    tableBody.innerHTML = "";
    for (const iso2 of state.guessed) appendToTable(iso2, false, state.language);
    revealMissedInTable(state.guessed, state.language);
  }
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
  // Language: saved preference → browser locale → default 'en'
  const savedLang = localStorage.getItem("language");
  const lang = savedLang || (navigator.language.startsWith("fr") ? "fr" : "en");
  state.language = lang;
  btnEn.classList.toggle("active", lang === "en");
  btnFr.classList.toggle("active", lang === "fr");

  // Sync theme button icon with the theme applied by the inline <head> script
  const theme = document.documentElement.dataset.theme || "light";
  document.getElementById("btn-theme").textContent = theme === "dark" ? "☀️" : "🌙";

  await initMap();
  buildTable(lang, state.guessed);
  inputEl.placeholder = STRINGS[lang].inputPlaceholder;
  scoreLabelEl.textContent = STRINGS[lang].score;
  btnAction.textContent = STRINGS[lang].start;
})();
