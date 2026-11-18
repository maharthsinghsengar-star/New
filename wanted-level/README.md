# What if your wanted level kept increasing?

A 10-minute, voiceless, first-person 16:9 film (1920×1080, 30 fps), rendered from code with three.js.

It starts small: you rob a corner store in Los Angeles (wanted level 1), steal a car (2), smash a police roadblock (3)
and steal a private jet (4). Then you keep running: Mexico, Spain, France, the UK, Germany, the UAE, India, China and
Japan. Every country has its own city, police cars and liveries, sirens and music, and its own getaway vehicle: a
police truck, a motorbike, a London cab, a tuk-tuk, a police supercar. Between countries you steal planes and
helicopters, and a globe animation shows where you're flying. From Germany on, the army joins in with tanks, armoured
trucks and fighter jets. You end up stealing a fighter jet in Tokyo, get forced down in Los Angeles at maximum wanted
level, and finish in a cell.

## Files
- `story.js`: the 10 countries + the arrest. The timeline, driving profiles, lane changes, traffic that never hits you, chasing police, roadblocks and wanted-level events.
- `world.js`: one route per country (landing runway → streets/highway → take-off airfield), with country-styled buildings, shops, props, landmarks (Eiffel Tower, Big Ben and the Eye, TV tower, Burj, Taj, Pearl Tower, Tokyo Tower and Fuji) and a large ground for the flights.
- `vehicles.js`: low-poly cars built from side profiles (inset windows, grilles, bumpers, hubcaps), police liveries for each country, buses, trucks, tuk-tuk, motorbike, tanks, armoured trucks and aircraft (private jet, twin-prop, small plane, helicopter, fighter).
- `rigs.js`: the first-person view: your hands and sleeves, car interiors with dashboard, steering wheel and live speedometer, motorbike, tuk-tuk, cockpits, the police-car back seat.
- `people.js`: pedestrians, police officers and soldiers.
- `globe.js`: the flight map (satellite globe with borders, highlighted countries, route arc and plane).
- `main.js`, `core.js`, `index.html`: runtime, HUD (wanted stars, level-up pop-ups, location tags), rendering.
- `music.py`: procedural soundtrack: country-flavoured action music, sirens per country, engines, aircraft, crashes and the arrest.
- `render.mjs`, `build.sh`, `fetch_data.sh`: rendering and the full build.

Road surfaces never overlap the ground plane (which sits 30 cm lower and is subdivided), and road markings are painted
into the road texture, so the street doesn't flicker.
