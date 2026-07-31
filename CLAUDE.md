# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MéMonde — a single-page, no-backend browser game where the player types country names to guess all 197 countries of the world within a 15-minute timer. Lives at https://coko7.github.io/memonde, deployed via GitHub Pages (`.github/workflows/`) on every push to `main`.

## Commands

No package.json, no build step, no test suite. This is plain HTML/CSS/JS loaded via `<script>` tags (no modules, no bundler).

- **Run locally**: `python3 -m http.server` from repo root, then open `http://localhost:8000` (or just open `index.html` directly in a browser).
- **Regenerate country data**: `node tools/build-data.mjs` — reads `data/countries.json`, writes `data/countries.js`. Run this whenever `INCLUDE`, `OVERRIDES`, or `ALIASES` in that script change.

## Architecture

### Load order matters (`index.html`)

```
data/countries.js       → window.COUNTRIES (generated, do not hand-edit)
d3 + topojson (CDN)     → world map rendering
src/utils.js            → normalize(), levenshtein(), buildIndexes(), matchInput()
src/ui.js               → STRINGS, DOM refs, map rendering, table rendering, feedback, theme
src/game.js             → CONFUSABLE_FAMILIES, game state machine, event wiring, init
```

Everything is globals off `window` — no imports/exports. Load order in `index.html` is load-bearing: `game.js` uses functions/DOM refs defined by `ui.js` and `utils.js`, and reads `window.COUNTRIES` populated by `data/countries.js`.

### Data pipeline (`tools/build-data.mjs`)

Source data is `dr5hn/countries-states-cities-database`'s `countries.json` (250 entries, includes non-sovereign territories). The build script:

1. Filters to a hand-maintained **197-iso2 whitelist** (`INCLUDE`) — the 193 UN members + Vatican (`VA`), Palestine (`PS`), Taiwan (`TW`), Kosovo (`XK`). The source has no "UN member" flag, so this list must stay hand-curated — don't try to auto-derive it.
2. Applies `OVERRIDES` for known-bad source data (e.g. Vatican's French name is corrupted upstream as `"voir Saint"`; Kosovo has no French translation at all).
3. Applies `ALIASES` — accepted alternate spellings per language, keyed by iso2 (e.g. `CD` accepts "DRC"/"Congo-Kinshasa"). The canonical `name` is what's *displayed*; aliases are only *accepted input*.
4. Derives `continent` from the dataset's `region`, except `region === "Americas"` is split by `subregion` (`South America` vs everything else → `North America`).
5. Asserts `out.length === 197` and that every entry has non-empty EN/FR names before writing `data/countries.js`.

Each emitted country record: `{ iso2, numeric, continent, name: {en, fr}, aliases: {en: [], fr: []} }`. `numeric` is the ISO 3166-1 numeric code, used to join against the TopoJSON world map (`feature.id === country.numeric`).

When adding/adjusting a country's accepted names, edit `ALIASES`/`OVERRIDES` in `tools/build-data.mjs` and re-run it — never hand-edit `data/countries.js`.

### Matching engine (`src/utils.js`)

Input matching order, per keystroke/submit:

1. **Normalize** both input and candidates: lowercase, strip accents (NFD + combining marks), punctuation → space, collapse whitespace.
2. **Exact match** against `exactIndex` (canonical names + aliases, built per-language via `buildIndexes(lang)`).
3. **Fuzzy fallback** (only if no exact hit): Levenshtein distance ≤ 1 (strings ≤6 chars) or ≤ 2 (longer), against `fuzzyList`.
4. **Confusable guard**: a fuzzy candidate is rejected if the input is *also* within threshold of a different country sharing a "confusable family" with it (families are in `game.js`'s `CONFUSABLE_FAMILIES`, e.g. Iran/Iraq, Niger/Nigeria, the Guineas, Sudan/South Sudan). Multiple surviving fuzzy candidates → reject as no-match. Exact matches always bypass the guard.

Indexes are rebuilt whenever the language toggles (EN/FR are fully separate accepted-name sets — an English spelling never counts in French mode and vice versa).

### Game state machine (`src/game.js`)

`idle → running → ended → idle`. Language toggle is locked during `running` (a round is played in one language). Timer is driven by `endTime - Date.now()` (not a decrementing counter) so tab throttling doesn't cause drift. `state.guessed` is a `Set<iso2>` — the single source of truth for score, map highlighting, and table fill-in.

### Map (`src/ui.js`)

World map is D3 + TopoJSON (`visionscarto-world-atlas` 110m, loaded from CDN) joined to `window.COUNTRIES` by numeric ISO code. Two special-case mechanisms layered on top:

- `TERRITORIES`: maps a dependent territory's TopoJSON numeric id (e.g. Greenland `304`) to its parent's iso2, so clicking/guessing the parent country also highlights the territory's shape.
- `MICRO_DOTS`: hardcoded `[lon, lat]` centroids for micro-states too small to render as a visible path at 110m resolution (Vatican, Singapore, Pacific/Caribbean island nations, etc.) — rendered as small circles instead of paths.

### Continent table (`src/ui.js`)

Pre-built with all countries per continent (alphabetical, hidden via `cell-hidden` class) and revealed as guessed; unrevealed cells get `missed-cell` styling at game end. Rebuilt in full on language change or game restart — don't try to patch it incrementally outside of `revealInTable`/`updateTableHeader`.

## Reference docs

- `docs/world-countries-game-spec.md` — the original implementation spec (design rationale for the 197-country set, matching pipeline, confusable families, data model). Useful for *why* decisions were made, not necessarily current line numbers.
- `docs/ROADMAP.md` and `list.md` — informal, mixed English/French running notes on planned improvements and fixed issues. Not authoritative task trackers, just scratch notes the maintainer keeps.
