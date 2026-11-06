#!/usr/bin/env python3
"""Build index.html (one self-contained file) from src/template.html + data/maptap_data.json.
Run: python3 build.py   (no dependencies)"""
import base64, json, pathlib
root = pathlib.Path(__file__).parent
rd = lambda p: (root / p).read_text(encoding='utf-8')
data = rd('data/maptap_data.json').strip()
json.loads(data)  # fail loudly if the data file is broken
html = rd('src/template.html')
logo = 'data:image/webp;base64,' + base64.b64encode((root / 'src/logo.webp').read_bytes()).decode()
for key, val in (('/*STORY_CSS*/', rd('src/story.css')),
                 ('/*STORY_JS*/', rd('src/story.js')),
                 ('<!--D3-->', '<script>' + rd('vendor/d3.min.js') + '</script>'),
                 ('<!--TOPOJSON-->', '<script>' + rd('vendor/topojson-client.min.js') + '</script>'),
                 ('__DATA__', data.replace('</', '<\\/')),
                 ('__WORLD__', rd('src/world.json')),
                 ('__ISO__', rd('src/iso.json')),
                 ('__LOGO__', logo)):
    assert key in html, key
    html = html.replace(key, val)
(root / 'index.html').write_text(html, encoding='utf-8')
print(f'index.html {len(html)//1024} KB')
