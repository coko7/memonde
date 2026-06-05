# 🌍 memonde

> [!WARNING]
> This project was "vibe-scaffolded" with [Claude Code](https://claude.ai/code) (Anthropic AI).
>
> What I mean by "vibe-scaffolding" is that I used AI to generate the project by feeding it a technical specification and asking the AI to implement it.
> After that, I keep the usage of AI to a minimum and focus on getting familiar with the code to regain control over it.
>
> I find that the hardest thing when it comes to programming is starting new projects.
> Using AI to take me from 0 to 1 very quickly allows me to gain some momentum so that I can get the project from 1 to 100 on my own.
>
> I am still experimenting with this approach but so far I don't dislike it.
> This allows me to tackle projects that I would have otherwise avoided due to lack of time or will ([Writer's block](https://en.wikipedia.org/wiki/Writer%27s_block)).

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
