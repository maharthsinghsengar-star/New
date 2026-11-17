#!/usr/bin/env bash
# Downloads the source data (not committed): historical borders, Natural Earth, Earth imagery.
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p data/geo data/img
HB=https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson
for y in 1000 1200 1279 1300 1400 1500 1530 1650 1700 1783 1815 1880 1914 1920 1938 1945 1960 1994; do curl -sfo data/geo/world_$y.geojson $HB/world_$y.geojson; done
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_50m_admin_0_countries ne_10m_land; do curl -sfo data/geo/$f.geojson $NE/$f.geojson; done
curl -sfo data/img/earth-blue-marble.jpg https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg
curl -sfLo data/img/earth-8k.jpg https://media.githubusercontent.com/media/alsbury/earth-threejs/master/8k_earth_daymap.jpg
