# World Countries Guessing Game — Implementation Specification

A single-page browser game. The player sees a world map and types country names to
guess as many as possible within a 15-minute timer. A per-continent table fills in as
they guess, and the missing countries are revealed when time runs out.

---

## 1. Confirmed design decisions

| Topic | Decision |
|---|---|
| Country set | **197**: the 193 UN members + Vatican City, Palestine, Taiwan, Kosovo |
| Answer matching | **Fuzzy + alternate names**, case- and accent-insensitive |
| Continent table | **Count + names guessed + reveal missing at end** |
| Language | EN / FR toggle. The configured language determines which names are accepted — **only the selected language's names count** |
| Stack | Static **HTML + CSS + JS**, no backend; country data embedded in JS |
| Data source | [`dr5hn/countries-states-cities-database`](https://github.com/dr5hn/countries-states-cities-database) (`json/countries.json`) |

---

## 2. Tech stack & file structure

No backend, no build server. A one-time data-prep script runs offline to turn the raw
dataset into a clean embedded module; the game itself is fully static.

```
/index.html          markup + layout containers
/styles.css          all styling
/game.js             game state machine, timer, matching engine, UI wiring
/data/countries.js   GENERATED — exports the 197-country array (see §4.6)
/data/world.svg      world map with per-country ISO ids (see §7.1)
/tools/build-data.mjs   offline prep script (run once, not shipped)
```

Recommended approach for embedding data: `countries.js` does
`window.COUNTRIES = [ ... ]` (or an ES-module `export`). It is produced by the prep
script in §4 so the runtime never fetches or parses the raw 250-country file.

---

## 3. Continent columns

Six columns (Antarctica has no countries in our set):

```
Africa | Asia | Europe | North America | South America | Oceania
```

**Continent assignment is derived from the dataset, not hand-curated**, so it is
deterministic and defensible:

- Use the dataset's `region` field directly for Africa / Asia / Europe / Oceania.
- For `region == "Americas"`, split by `subregion`:
  - `subregion == "South America"` → **South America**
  - everything else (`Northern America`, `Central America`, `Caribbean`) → **North America**

This offloads transcontinental edge cases to the dataset's conventions. Be aware of
those conventions (they're reasonable but worth knowing): Russia → Europe, Turkey →
Asia, Cyprus → Asia, Kazakhstan → Asia, Armenia/Georgia/Azerbaijan → Asia, Egypt →
Africa. If you disagree with any placement, override it in the overrides table (§4.3)
rather than changing the rule. Per-continent totals are computed at load by counting
the final 197-country array, so they always stay consistent with the data.

---

## 4. Data layer

### 4.1 What the dataset gives us (verified)

`json/countries.json` is a 250-entry array. Relevant fields per record:

```jsonc
{
  "name": "Germany",            // English name (sometimes needs cleanup, see 4.3)
  "iso2": "DE",                 // 2-letter code — primary key
  "iso3": "DEU",
  "numeric_code": "276",        // ISO numeric — used to join to the map (see 7.1)
  "region": "Europe",           // continent source
  "subregion": "Western Europe",// used to split the Americas
  "translations": { "fr": "Allemagne", "de": "...", ... }  // French name source
}
```

French names exist for essentially all countries via `translations.fr`.

### 4.2 The inclusion list (250 → 197)

The dataset contains ~53 non-sovereign territories we must exclude (Greenland, Puerto
Rico, Bermuda, Hong Kong, Macau, Gibraltar, the Caribbean dependencies, French overseas
territories, Western Sahara, Bouvet/Heard, etc.). dr5hn has **no "UN member" flag**, so
do **not** try to auto-detect sovereignty.

Instead, maintain an explicit **whitelist of 197 `iso2` codes** (sourced from a known
197-country reference list) and filter the dataset to it. Keep this list in the prep
script. A correctly built list must contain exactly these four specials by iso2:
`VA` (Vatican), `PS` (Palestine), `TW` (Taiwan), `XK` (Kosovo) — all present in the
dataset. Sanity check: `included.length === 197`.

### 4.3 Overrides — required because of data-quality issues

The prep script must apply a small override table **on top of** the dataset. These are
not optional; the raw data is wrong/awkward for these:

| iso2 | Problem in raw data | Override |
|---|---|---|
| `VA` | English name is `"Vatican City State (Holy See)"`; **French is corrupted: `"voir Saint"`** | name.en = `"Vatican City"`, name.fr = `"Cité du Vatican"` |
| `XK` | **`translations.fr` is `null`** | name.fr = `"Kosovo"` |
| `PS` | English name is `"Palestinian Territory Occupied"` | name.en = `"Palestine"` (fr already `"Palestine"`) |

Add similar display-name cleanups wherever the dataset's `name` isn't the natural
answer form. Spot-check all 197 English and French display names before shipping.

### 4.4 Aliases (the "alternate names" requirement)

The dataset has **no alias list**, so maintain one yourself, keyed by `iso2`, with
separate arrays per language. Aliases are additional *accepted* spellings; the canonical
`name` is what's *displayed*. Examples:

```js
const ALIASES = {
  US: { en: ["USA", "U.S.A.", "America", "United States of America"], fr: ["USA", "Amérique"] },
  GB: { en: ["UK", "U.K.", "Britain", "Great Britain", "England"],     fr: ["UK", "Angleterre", "Grande-Bretagne"] },
  MM: { en: ["Burma"],                                                  fr: ["Birmanie"] },
  CZ: { en: ["Czechia"],                                               fr: ["Tchéquie"] },
  CI: { en: ["Ivory Coast"],                                           fr: [] }, // "Côte d'Ivoire" is the fr canonical
  KP: { en: ["North Korea", "DPRK"],                                   fr: ["Corée du Nord"] },
  KR: { en: ["South Korea"],                                           fr: ["Corée du Sud"] },
  CD: { en: ["DRC", "DR Congo", "Congo-Kinshasa"],                     fr: ["RDC", "Congo-Kinshasa"] },
  CG: { en: ["Congo-Brazzaville"],                                     fr: ["Congo-Brazzaville"] },
  AE: { en: ["UAE"],                                                   fr: ["Émirats arabes unis"] },
  // ...extend as needed
};
```

Note: when `language === "fr"`, **only French canonical + French aliases are accepted**;
English spellings do not count (and vice versa). This is the agreed behavior.

### 4.5 Confusable guard list (critical for fuzzy matching)

Fuzzy matching on short country names produces dangerous false positives. The dataset
confirms several pairs one edit apart, e.g. **Iran/Iraq** (`Iran`/`Irak` in FR),
**Niger/Nigeria** (`Niger`/`Nigéria`). Maintain a guard set of families where fuzzy
correction between members is forbidden (matching must be exact for these):

```
{Iran, Iraq}
{Niger, Nigeria}
{Austria, Australia}
{Slovakia, Slovenia}
{Dominica, Dominican Republic}
{Sudan, South Sudan}
{Congo (Republic), DR Congo}
{North Korea, South Korea}
{Guinea, Guinea-Bissau, Equatorial Guinea, Papua New Guinea}
{Saint Kitts and Nevis, Saint Lucia, Saint Vincent and the Grenadines}
```

(Maintain the same families by French name.) See §5 for how the guard is applied.

### 4.6 Final runtime data model

The prep script emits one clean array. Each entry:

```js
{
  iso2: "DE",
  numeric: 276,                 // integer, for the map join
  continent: "Europe",          // one of the 6 columns
  name:    { en: "Germany",  fr: "Allemagne" },
  aliases: { en: [...],      fr: [...] }
}
```

The prep script also precomputes, **per language**, a normalized lookup index for O(1)
exact matching and a flat list of normalized names for fuzzy scanning — but these can
equally be built at page load from the array above (197 items is trivial).

---

## 5. Matching engine

### 5.1 Normalization

Applied to both the player's input and every candidate name/alias:

```js
function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents: é→e, ï→i
    .replace(/['’.\-]/g, " ")                          // punctuation → space
    .replace(/[^a-z0-9 ]/g, "")                         // drop the rest
    .replace(/\s+/g, " ")
    .trim();
}
```

So "Côte d'Ivoire", "cote d ivoire", and "COTE DIVOIRE" all normalize alike.

### 5.2 Lookup structures (built for the active language only)

- `exactIndex`: `Map<normalizedName, iso2>` covering canonical names **and** aliases.
- `fuzzyList`: array of `{ iso2, norm }` for canonical names + aliases.

Rebuild these whenever the language changes.

### 5.3 Matching pipeline

```
input → norm →
  1. EXACT: exactIndex.has(n)?  → resolve iso2
  2. FUZZY (only if no exact hit):
       candidates = fuzzyList where levenshtein(n, item.norm) <= threshold(n)
       - threshold(n): 1 if n.length <= 6, else 2
       - drop any candidate that is in a confusable family with another candidate
         OR with the input's nearest exact-length name
       - if exactly ONE candidate remains → resolve its iso2
       - if zero or >1 → reject as "no match"
  3. resolve(iso2):
       - if already guessed → feedback "already got it" (no score change)
       - else → mark guessed, score++, highlight map, add to continent table
```

### 5.4 Confusable guard application

Before accepting a fuzzy candidate, check: does the input also fall within `threshold`
of a *different* country that shares a confusable family with the candidate? If yes,
**reject** (ambiguous/dangerous). This stops "irak" from snapping to "Iran", "nigeria"
typos from hitting "Niger", etc. Exact matches always bypass the guard (typing the real
name is never ambiguous).

### 5.5 Levenshtein

Standard iterative two-row DP. With 197 short strings and at most a few hundred
keystrokes per game, performance is a non-issue.

---

## 6. Game logic / state machine

States: `idle → running → ended` (then `idle` again on reset).

- **idle**: map shown neutral, input disabled, timer reads `15:00`, "Start" button armed.
  Language toggle is enabled here (and only here — lock it during play to keep the
  accepted-name set stable; see §8 if you want live switching instead).
- **running**: triggered by Start. `endTime = Date.now() + 15*60*1000`. A 1s interval
  updates the clock; input is focused and live. Each valid new guess updates score, map,
  and table. Game ends when the timer hits 0 **or** the player clicks "Give up".
- **ended**: input disabled, timer frozen at `00:00`, missing countries revealed in both
  the table and (optionally) the map. Final score shown. "Play again" returns to idle.

State to track:

```js
{
  status,            // 'idle' | 'running' | 'ended'
  language,          // 'en' | 'fr'
  guessed: Set<iso2>,
  endTime,
  score,             // === guessed.size
}
```

---

## 7. UI / layout

```
┌─────────────────────────────────────────────┐
│  [EN | FR]        ⏱ 14:32        Score 37/197 │   ← top bar
├─────────────────────────────────────────────┤
│                                               │
│                WORLD MAP (SVG)                │   ← guessed countries fill in
│                                               │
├─────────────────────────────────────────────┤
│   [ type a country…            ] (Start/Give up) │  ← input + control
├─────────────────────────────────────────────┤
│ Africa | Asia | Europe | N.Am | S.Am | Oceania│   ← continent table
│  12/54 |  8/48|  20/48 | 5/23 | 2/12 |  3/14   │   (header = count)
│  Egypt | Japan| France | ...  | ...  |  ...    │   (cells = names, accumulating)
│  Kenya | ...  | Spain  |      |      |         │
└─────────────────────────────────────────────┘
```

### 7.1 Map rendering — two options

**Option A (recommended for fully-static, offline): inline SVG world map.**
Use a public SVG world map where each country `<path>` carries its ISO code as `id` or a
`data-iso2`/`data-iso-numeric` attribute (several free maps use ISO classes/ids).
Highlighting a guess is then `svg.querySelector('#DE').classList.add('guessed')`. No
network fetch, no library. Verify the map's id scheme matches your join key and that all
197 countries (including small ones — Vatican, Singapore, etc.) have a clickable/colorable
shape; tiny states may need an enlarged dot.

**Option B (higher cartographic quality): D3 + TopoJSON.**
Render `world-atlas` `countries-110m.json` with `d3-geo`. world-atlas keys features by
**ISO 3166-1 numeric** id — which is exactly the dataset's `numeric_code` — so the join
is clean: `feature.id === country.numeric`. Costs a TopoJSON file (+ d3/topojson from a
CDN), so not strictly offline.

Either way, the join key from data → map is the **numeric ISO code** (Option B) or
**iso2** (Option A). Pick the map asset's scheme and store that field accordingly.

### 7.2 Input box & feedback

- Submit on **Enter**. Clear the field on a correct guess; keep it on a miss.
- Feedback states: **correct** (flash the field/map shape green), **already guessed**
  (neutral note "already got it"), **no match** (brief red shake). Keep it fast and
  non-blocking — no modal dialogs mid-game.
- Trim/normalize happens in the engine; don't pre-mangle what the user sees.

### 7.3 Continent table behavior

- Header cell per column: `Continent name` + live `guessed/total`.
- Body: as each country is guessed, append its **display name in the active language**
  to its continent's column (guess order is fine; alphabetical also works).
- **On game end**: append every *missing* country to its column, styled distinctly
  (e.g., greyed + italic or a red tint) so the player sees exactly what they missed.
  Optionally also paint missing countries onto the map in a "missed" color.

### 7.4 Language toggle

- Switches: (a) all UI strings (button labels, "Score", "Time"), (b) the displayed
  country names in the table/reveal, and (c) the accepted-answer set (rebuild
  `exactIndex`/`fuzzyList` from the chosen language).
- Default: **locked during a running game**, switchable in idle. A round is played in
  one language.

---

## 8. Edge cases & decisions to keep in mind

- **Already-guessed** input is a no-op with friendly feedback, never a penalty.
- **Whitespace/empty** submit is ignored.
- **Compound-name specials** (South Sudan, North/South Korea, the Guineas): the guard
  list (§4.5) prevents fuzzy from collapsing them; require the distinguishing word.
- **Vatican & Kosovo French names** come from the overrides table, not the dataset.
- **Map coverage of micro-states**: confirm Vatican, San Marino, Monaco, Liechtenstein,
  Singapore, Bahrain, Malta, Tuvalu, Nauru etc. are colorable on the chosen map.
- **Timer accuracy**: drive the clock from `endTime - Date.now()`, not by decrementing a
  counter, so tab-throttling doesn't drift the 15 minutes.
- **Optional live language switch**: if you ever want it mid-game, rebuild the indexes on
  switch and re-render names; the `guessed` set is iso2-based so it survives the switch.
- **Persistence/high score**: out of scope (and `localStorage` is unavailable in some
  embedded preview contexts). Add later if desired.

---

## 9. Suggested build order

1. **Data prep** — write `tools/build-data.mjs`: load `countries.json`, filter to the
   197 iso2 whitelist, apply overrides + aliases, derive `continent`, emit
   `data/countries.js`. Assert count === 197 and that EN/FR names are non-empty.
2. **Matching engine** — `norm`, indexes, Levenshtein, pipeline, guard list. Unit-test
   against tricky inputs: "iraq", "iran", "nigeria", "cote divoire", "USA", "Birmanie".
3. **Game state + timer** — idle/running/ended, `endTime` clock, score.
4. **Layout & input** — top bar, input box, feedback states, Start/Give up/Play again.
5. **Continent table** — live fill + end-of-game reveal of missing.
6. **Map** — chosen rendering option, highlight on correct, optional missed-reveal.
7. **Language toggle** — UI strings + name display + index rebuild.
8. **Polish** — micro-state visibility, focus management, responsive sizing.

---

## 10. Data prep script — reference sketch

```js
// tools/build-data.mjs  (run with: node tools/build-data.mjs)
import fs from "node:fs";
const raw = JSON.parse(fs.readFileSync("countries.json", "utf8"));

const INCLUDE = new Set([ /* 197 iso2 codes incl. VA, PS, TW, XK */ ]);

const OVERRIDES = {
  VA: { en: "Vatican City", fr: "Cité du Vatican" },
  XK: { fr: "Kosovo" },
  PS: { en: "Palestine" },
};

const ALIASES = { /* see §4.4 */ };

function continentOf(c) {
  if (c.region === "Americas")
    return c.subregion === "South America" ? "South America" : "North America";
  return c.region; // Africa | Asia | Europe | Oceania
}

const out = raw
  .filter(c => INCLUDE.has(c.iso2))
  .map(c => {
    const o = OVERRIDES[c.iso2] || {};
    return {
      iso2: c.iso2,
      numeric: parseInt(c.numeric_code, 10),
      continent: continentOf(c),
      name: {
        en: o.en ?? c.name,
        fr: o.fr ?? (c.translations?.fr || c.name),
      },
      aliases: ALIASES[c.iso2] || { en: [], fr: [] },
    };
  });

if (out.length !== 197) throw new Error(`Expected 197, got ${out.length}`);
for (const c of out)
  if (!c.name.en || !c.name.fr) throw new Error(`Missing name for ${c.iso2}`);

fs.writeFileSync(
  "data/countries.js",
  "window.COUNTRIES = " + JSON.stringify(out, null, 2) + ";\n"
);
console.log("Wrote", out.length, "countries.");
```

---

### Open items for you to confirm or hand off

- The **197 iso2 whitelist** itself (the one thing that must be sourced/vetted by hand).
- Map asset choice (Option A inline SVG vs Option B D3/TopoJSON).
- Whether missing countries should also be painted on the map at game end, or revealed
  in the table only.
