# 🌍 memonde

> [!WARNING]
> This project was built with the assistance of [Claude Code](https://claude.ai/code) (Anthropic AI).

<img width="1280" height="640" alt="banner" src="https://github.com/user-attachments/assets/08c06dc6-29f4-4f1b-ab16-a1c915df5eb1" />

A single-page browser game where you try to name all 197 countries of the world within 15 minutes. Type a country name, hit Enter, and watch it light up on the map. See how many you can get before time runs out.

## Features

- **197 countries** — all 193 UN members plus Vatican City, Palestine, Taiwan, and Kosovo
- **Fuzzy matching** — minor typos are forgiven; confusable pairs (Iran/Iraq, Niger/Nigeria, etc.) require the correct name
- **Alternate names** — common aliases accepted (USA, Burma, Ivory Coast, DRC…)
- **EN / FR** — switch between English and French; only the selected language's names count
- **Interactive map** — guessed countries highlight green, missed ones reveal in red at the end; scroll to zoom, drag to pan
- **Light / dark theme** — toggle in the top bar

## Running locally

No build step required — open `index.html` directly in a browser or serve the folder with any static file server:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## Data

Country data comes from [`dr5hn/countries-states-cities-database`](https://github.com/dr5hn/countries-states-cities-database). The raw JSON is processed by `tools/build-data.mjs` into `data/countries.js`, which is the only file the game loads at runtime.

```bash
node tools/build-data.mjs
```
