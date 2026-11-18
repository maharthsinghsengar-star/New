#!/usr/bin/env bash
# Downloads the map data (not committed): Natural Earth 1:50m countries and an 8k Earth day map.
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p data
curl -sfo data/countries.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
curl -sfLo data/earth.jpg https://media.githubusercontent.com/media/alsbury/earth-threejs/master/8k_earth_daymap.jpg
python3 - <<'PY'
import json; d = json.load(open('data/countries.geojson'))
for f in d['features']:
    f['properties'] = {'n': f['properties']['ADMIN']}
    def r(c): return [r(x) for x in c] if isinstance(c[0], list) else [round(c[0], 2), round(c[1], 2)]
    f['geometry']['coordinates'] = r(f['geometry']['coordinates'])
json.dump(d, open('data/countries.geojson', 'w'), separators=(',', ':'))
PY
