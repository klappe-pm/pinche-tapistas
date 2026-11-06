# Pinche Tapistas

The daily MapTap leaderboard and story for the group thread. One self-contained page: `index.html`.

## How it fits together

| Path | What it is |
| --- | --- |
| `data/maptap_data.json` | The scores and locations. **This is the only file that changes day to day.** |
| `src/template.html` | The page: layout, tabs, charts. |
| `src/story.js`, `src/story.css` | The Story view. Every sentence is computed from the data. |
| `build.py` | Stitches everything into `index.html` (no dependencies: `python3 build.py`). |
| `.github/workflows/build.yml` | Rebuilds `index.html` automatically when `data/` or `src/` changes. |

## Updating

Replace `data/maptap_data.json` and push to `main`. The workflow rebuilds `index.html` and GitHub Pages serves it.
To build locally instead, run `python3 build.py` and open `index.html`.

## Data shape

`{"rounds": [{game_date, player, round, score, final_score, city, country, iso2, continent, lat, lon, ...}], "locations": [{game_date, round, city, country, lat, lon, story, ...}]}`
