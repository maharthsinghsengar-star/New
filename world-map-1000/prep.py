"""Builds the globe textures and per-year political overlays.

out/earth.jpg      8192x4096 satellite composite (8K land + Blue Marble oceans)
out/land.png       8192x4096 land mask
out/fill_Y.png     4096x2048 RGBA polity colours (alpha = state present)
out/bord_Y.png     8192x4096 RGB: R = border line, G = soft halo
out/labels.json    per-year label anchors {name, lon, lat, area, col}
"""
import json, re, math, os, colorsys, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

Image.MAX_IMAGE_PIXELS = None
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, 'out'); os.makedirs(OUT, exist_ok=True)
W8, H8 = 8192, 4096
YEARS = [1000, 1200, 1279, 1300, 1400, 1500, 1530, 1650, 1700, 1783, 1815, 1880, 1914, 1920, 1938, 1945, 1960, 1994, 2026]

# ---------------------------------------------------------------- textures
def textures():
    if os.path.exists(f'{OUT}/earth.jpg') and os.path.exists(f'{OUT}/land.png'): return
    a = np.asarray(Image.open(f'{D}/data/img/earth-8k.jpg').convert('RGB')).astype(np.float32)
    dist = np.sqrt(((a - np.array([30, 59, 117], np.float32)) ** 2).sum(-1))
    ocean = (dist < 18).astype(np.float32)
    ocean = ndi.binary_opening(ocean > 0.5, iterations=1).astype(np.float32)
    # clip to Natural Earth land so floating sea ice (pure white in the 8K map) becomes ocean
    ne = Image.new('L', (W8, H8), 0); dr = ImageDraw.Draw(ne)
    for f in json.load(open(f'{D}/data/geo/ne_10m_land.geojson'))['features']:
        for r in rings(f['geometry']):
            dr.polygon([((x + 180) / 360 * W8, (90 - y) / 180 * H8) for x, y in r], fill=255)
    ne = ndi.binary_dilation(np.asarray(ne) > 0, iterations=4)
    ocean = np.maximum(ocean, (~ne).astype(np.float32))
    land = 1 - ndi.gaussian_filter(ocean, 0.8)
    Image.fromarray((land * 255).astype(np.uint8)).save(f'{OUT}/land.png', optimize=True)
    bm = np.asarray(Image.open(f'{D}/data/img/earth-blue-marble.jpg').convert('RGB').resize((W8, H8), Image.LANCZOS)).astype(np.float32)
    # grade the 8K land a little toward the Blue Marble look (less saturated, slightly darker)
    lum = (a * [0.299, 0.587, 0.114]).sum(-1, keepdims=True)
    g = lum + (a - lum) * 0.82
    g = 255 * (np.clip(g, 0, 255) / 255) ** 1.08
    # ocean: Blue Marble bathymetry, a touch richer
    o = bm * [0.92, 1.0, 1.08]
    k = land[..., None]
    comp = np.clip(g * k + o * (1 - k), 0, 255).astype(np.uint8)
    Image.fromarray(comp).save(f'{OUT}/earth.jpg', quality=90)

# ---------------------------------------------------------------- polity rules
NONSTATE = re.compile(r'hunter|gatherer|peoples|tribes|cultures?\b|farmers|forag|fishing|chiefdoms|nomad|pastoral|aborigin|Polynesians|city-states|confederacy|Arctic|Khoisan|Bantu|Siberians|Samis|Sámi|Dorset|Thule|Innu|Athabaskan|Beothuk|Boethuk|Arawaks|Taino|Guanahatabeyes|Maori|Ainus?\b|Touareg|Shuar|Chuds|Karelians|Peshemegs|minor ', re.I)

ALIAS = {
    'United Kingdom': 'BRIT', 'United Kingdom of Great Britain and Ireland': 'BRIT', 'Great Britain': 'BRIT', 'UK': 'BRIT',
    'British East India Company': 'BRIT', 'England': 'BRIT', 'England and Ireland': 'BRIT', 'English territory': 'BRIT', 'Kingdom of England': 'BRIT',
    'France': 'FRA', 'Kingdom of France': 'FRA',
    'Spain': 'SPA', 'Spanish Habsburg': 'SPA', 'Castile': 'SPA', 'Castille': 'SPA', 'Castilla': 'SPA', 'Viceroyalty of New Spain': 'SPA',
    'Portugal': 'POR',
    'Kyivan Rus': 'RUS', 'Grand Duchy of Moscow': 'RUS', 'Tsardom of Muscovy': 'RUS', 'Russian Empire': 'RUS', 'Russia': 'RUS', 'USSR': 'RUS',
    'Mongol Empire': 'MON', 'Great Khanate': 'MON', 'Yuan Empire': 'MON', 'Mongols': 'MON',
    'Ottoman Empire': 'OTT', 'Ottoman Sultanate': 'OTT', 'Turkey': 'OTT',
    'Byzantine Empire': 'BYZ', 'Holy Roman Empire': 'HRE',
    'German Empire': 'GER', 'Germany': 'GER', 'Austro-Hungarian Empire': 'AUT', 'Austrian Empire': 'AUT',
    'Netherlands': 'NED', 'Dutch East India Company': 'NED', 'Dutch Republic': 'NED',
    'United States': 'USA', 'United States of America': 'USA',
    'Song Empire': 'CHN', 'Ming Empire': 'CHN', 'Ming Chinese Empire': 'CHN', 'Manchu Empire': 'CHN', 'China': 'CHN', 'Chinese warlords': 'CHN',
    'Mughal Empire': 'MUG', 'India': 'IND', 'Italy': 'ITA', 'Kingdom of Italy': 'ITA', 'Belgium': 'BEL',
    'Empire of Japan': 'JPN', 'Japan': 'JPN',
}
B, F, S, P, G, NL, BE, IT = 'BRIT', 'FRA', 'SPA', 'POR', 'GER', 'NED', 'BEL', 'ITA'
# per-year fixes where the dataset marks colonies as independent: name -> (display name or None, ruler key)
COL = {
    1880: {'Cape Colony': (None, B), 'Natal': (None, B), 'Lagos': (None, B), 'Sierra Leone': (None, B), 'Gambia': (None, B), 'Basutoland': (None, B),
           'Griqualand West': (None, B), 'Portuguese Guinea': (None, P), 'Spanish Guinea': (None, S), 'Malta': (None, B)},
    1914: {'Equatorial Guinea': ('Spanish Guinea', S), 'Gambia, The': ('Gambia', B), 'German South-West Africa': (None, G), 'Kamerun': (None, G), 'Togoland': (None, G),
           'Lesotho': ('Basutoland', B), 'Morocco': ('French Morocco', F), 'Portuguese Guinea': (None, P), 'Rio De Oro': ('Río de Oro', S), 'Sierra Leone': (None, B),
           'Spanish Morocco': (None, S), 'Swaziland': (None, B), 'Tunisia': (None, F), 'Uganda': (None, B), 'Ceylon': (None, B), 'Malaya': (None, B),
           'Netherlands Indies': ('Dutch East Indies', NL), 'Philippines': (None, 'USA'), 'Brunei': (None, B), 'Malta': (None, B), 'Puerto Rico': (None, 'USA'),
           'Guyana': ('British Guiana', B), 'Suriname': (None, NL), 'French Guiana': (None, F), 'Belize': ('British Honduras', B)},
    1920: {'Algeria': (None, F), 'Angola': (None, P), 'Botswana': ('Bechuanaland', B), 'Burundi': ('Ruanda-Urundi', BE), 'Equatorial Guinea': ('Spanish Guinea', S),
           'Eritrea': (None, IT), 'Gambia, The': ('Gambia', B), 'Ghana': ('Gold Coast', B), 'Guinea-Bissau': ('Portuguese Guinea', P), 'Kenya': (None, B),
           'Lesotho': ('Basutoland', B), 'Madagascar (France)': ('Madagascar', F), 'Malawi': ('Nyasaland', B), 'Morocco': ('French Morocco', F), 'Mozambique': (None, P),
           'Nigeria': (None, B), 'Rio De Oro': ('Río de Oro', S), 'Sierra Leone': (None, B), 'Spanish Sahara': (None, S), 'Sudan': ('Anglo-Egyptian Sudan', B),
           'Swaziland': (None, B), 'Tanzania, United Republic of': ('Tanganyika', B), 'Togo': ('Togoland', F), 'Tunisia': (None, F), 'Uganda': (None, B),
           'Union of South Africa': (None, B), 'Zambia': ('Northern Rhodesia', B), 'Zimbabwe': ('Southern Rhodesia', B)},
    1938: {'Burundi': ('Ruanda-Urundi', BE), 'French Somaliland': (None, F), 'Gambia, The': ('Gambia', B), 'Guinea-Bissau': ('Portuguese Guinea', P),
           'Israel': ('Mandatory Palestine', B), 'Jordan': ('Transjordan', B), 'Libya': (None, IT), 'Malawi': ('Nyasaland', B), 'Sudan': ('Anglo-Egyptian Sudan', B),
           'Togo': ('Togoland', F), 'Tunisia': (None, F), 'Union of South Africa': (None, B), 'Trucial Oman': ('Trucial States', B), 'Ceylon': (None, B),
           'Brunei': (None, B), 'Laos': (None, F)},
    1945: {'Benin': ('Dahomey', F), 'Burkina Faso': ('Upper Volta', F), 'Burundi': ('Ruanda-Urundi', BE), 'Rwanda': ('Ruanda-Urundi', BE), 'Cameroon': ('French Cameroon', F),
           'Central African Republic': ('Ubangi-Shari', F), 'Congo': ('French Congo', F), 'Djibouti': ('French Somaliland', F), 'Equatorial Guinea': ('Spanish Guinea', S),
           'Gabon': (None, F), 'Namibia': ('South West Africa', B), 'Togo': ('Togoland', F), 'Western Sahara': ('Spanish Sahara', S), 'Zaire': ('Belgian Congo', BE),
           'Israel': ('Mandatory Palestine', B), 'United Arab Emirates': ('Trucial States', B),
           'India': ('British Raj', B), 'Pakistan': ('British Raj', B), 'Bangladesh': ('British Raj', B), 'Burma': (None, B), 'Sri Lanka': ('Ceylon', B),
           'Malaysia': ('Malaya', B), 'Indonesia': ('Dutch East Indies', NL), 'Philippines': (None, 'USA'), 'Brunei': (None, B)},
    1960: {'Algeria': (None, F), 'Angola': (None, P), 'Botswana': ('Bechuanaland', B), 'Burundi': ('Ruanda-Urundi', BE), 'Rwanda': ('Ruanda-Urundi', BE),
           'Djibouti': ('French Somaliland', F), 'Equatorial Guinea': ('Spanish Guinea', S), 'Eritrea': (None, 'Ethiopia'), 'Gambia, The': ('Gambia', B),
           'Guinea-Bissau': ('Portuguese Guinea', P), 'Kenya': (None, B), 'Lesotho': ('Basutoland', B), 'Malawi': ('Nyasaland', B), 'Mozambique': (None, P),
           'Namibia': ('South West Africa', 'South Africa'), 'Sierra Leone': (None, B), 'Swaziland': (None, B), 'Tanzania, United Republic of': ('Tanganyika', B),
           'Uganda': (None, B), 'Western Sahara': ('Spanish Sahara', S), 'Zambia': ('Northern Rhodesia', B), 'Zimbabwe': ('Southern Rhodesia', B),
           'United Arab Emirates': ('Trucial States', B), 'Qatar': (None, B), 'Kuwait': (None, B)},
}
RENAME = {'United Kingdom of Great Britain and Ireland': 'United Kingdom', 'Imperial Japan (Fujiwara)': 'Japan', 'Shogun Japan (Kamakura)': 'Japan',
          'Tsardom of Muscovy': 'Tsardom of Russia', 'Manchu Empire': 'Qing Empire', 'Ming Chinese Empire': 'Ming Empire', 'USSR': 'Soviet Union',
          'United States of America': 'United States', 'Mexihcah (Triple Alliance)': 'Aztec Empire', 'Empire of Japan': 'Japan', 'Chinese warlords': 'China',
          'Britany': 'Brittany', 'Burgandy': 'Burgundy', 'Castille': 'Castile', 'Castilla': 'Castile', 'Great Khanate': 'Yuan (Mongol)',
          'Khanate of the Golden Horde': 'Golden Horde', 'Russian Empire': 'Russian Empire', 'Abyssinia': 'Ethiopia',
          'Korea, Democratic People\'s Republic of': 'North Korea', 'Korea, Republic of': 'South Korea', 'Tanzania, United Republic of': 'Tanzania',
          'Gambia, The': 'Gambia', 'Zaire': 'DR Congo', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Rep.'}

EURO = {'BRIT', 'FRA', 'SPA', 'POR', 'NED', 'RUS', 'USA', 'Sweden', 'Denmark', 'Denmark-Norway'}
DOMINIONS = {'Canada', 'Australia', 'New Zealand', 'Newfoundland', 'Union of South Africa', 'Dominion of Canada', 'Commonwealth of Australia'}
DOMINION_YEARS = {1783, 1815, 1880, 1914, 1920, 1938}

def key_of(name, subj, y):
    s = subj or name
    if s in ALIAS: return ALIAS[s]
    m = re.search(r'\((Spain|FR|GB|France|UK|Portugal|Italy|Germany|Belgium|Netherlands)\)', name)
    if m: return {'Spain': S, 'FR': F, 'France': F, 'GB': B, 'UK': B, 'Portugal': P, 'Italy': IT, 'Germany': G, 'Belgium': BE, 'Netherlands': NL}[m.group(1)]
    if 'Japan' in s: return 'JPN'
    if name in ALIAS: return ALIAS[name]
    return s

def load(y):
    """returns list of (display_name, key, state, geometry)"""
    out = []
    if y == 2026:
        d = json.load(open(f'{D}/data/geo/ne_50m_admin_0_countries.geojson'))
        for f in d['features']:
            p = f['properties']; n = p.get('NAME') or p.get('ADMIN'); sov = p.get('SOVEREIGNT') or n
            if n == 'Antarctica': continue
            disp = RENAME.get(n, n); out.append((disp, key_of(n, sov if sov != n else n, y), True, f['geometry']))
        return out
    d = json.load(open(f'{D}/data/geo/world_{y}.geojson'))
    fix = COL.get(y, {})
    for f in d['features']:
        if not f['geometry']: continue
        p = f['properties']; n = (p.get('NAME') or '').strip(); subj = (p.get('SUBJECTO') or '').strip()
        state = bool(n) and not NONSTATE.search(n)
        if y in DOMINION_YEARS and n in DOMINIONS: subj = 'United Kingdom'
        if state and y <= 1783 and not re.search(r'Empire|Kingdom|Triple|Viceroyalty|Confedera', n) and key_of(n, subj, y) not in EURO:
            r0 = rings(f['geometry'])
            if r0 and all(sum(p[0] for p in r) / len(r) < -30 for r in r0): state = False
        if n in fix:
            disp, k = fix[n]; disp = disp or n
            key = k if k else key_of(disp, None, y)
            key = ALIAS.get(key, key)
        else:
            disp = re.sub(r'\s*\((FR|GB|Spain|France|UK|Egypt)\)', '', RENAME.get(n, n)); key = key_of(n, subj, y)
        out.append((disp, key, state, f['geometry']))
    return out

# ---------------------------------------------------------------- rasterising
def rings(geom):
    if geom['type'] == 'Polygon': return [geom['coordinates'][0]]
    if geom['type'] == 'MultiPolygon': return [p[0] for p in geom['coordinates']]
    return []

def ring_area(r):
    a = 0
    for i in range(len(r) - 1): a += (r[i + 1][0] - r[i][0]) * (r[i + 1][1] + r[i][1])
    return abs(a) / 2

def raster(feats, W, H):
    """int32 id raster (0 = nothing); ids index into feats-derived unique display names"""
    names = {}; img = Image.new('I', (W, H), 0); dr = ImageDraw.Draw(img)
    polys = []
    for disp, key, state, g in feats:
        if disp not in names: names[disp] = (len(names) + 1, key, state)
        for r in rings(g):
            if len(r) < 3: continue
            polys.append((ring_area(r), names[disp][0], r))
    polys.sort(key=lambda p: -p[0])           # large first, enclaves painted over
    for _, i, r in polys:
        lon = [r[0][0]];
        for k in range(1, len(r)):
            d = r[k][0] - r[k - 1][0]; d -= 360 * round(d / 360); lon.append(lon[-1] + d)
        lat = [p[1] for p in r]
        for off in (-360, 0, 360):
            pts = [((lo + off + 180) / 360 * W, (90 - la) / 180 * H) for lo, la in zip(lon, lat)]
            xs = [p[0] for p in pts]
            if max(xs) < 0 or min(xs) > W: continue
            dr.polygon(pts, fill=i)
    return np.asarray(img, dtype=np.int32).copy(), names

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

PIN = {'BRIT': '#d8263a', 'FRA': '#2d6be0', 'SPA': '#ffc93a', 'POR': '#11a37f', 'RUS': '#6fb04a', 'MON': '#ff7a1c', 'OTT': '#1fa3b3', 'BYZ': '#a073e8',
       'HRE': '#e9a23b', 'GER': '#8a98a8', 'AUT': '#e47f9c', 'NED': '#ff8c42', 'USA': '#4aa8e8', 'CHN': '#f7dc5c', 'MUG': '#2fcf7a', 'IND': '#ff9a2e',
       'ITA': '#45b85c', 'BEL': '#d6b52a', 'JPN': '#ff5f8f', 'Ethiopia': '#c98a3a', 'Aztec Empire': '#e0533d', 'Inca Empire': '#f08a24'}
PALETTE = ['#e15759', '#4e79a7', '#f28e2b', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#9c755f', '#8cd17d', '#b6992d', '#d37295', '#499894',
           '#e49444', '#6a9fd8', '#c46a5a', '#9fd36b', '#5fb7a6', '#c0392b', '#8e5bb5', '#2f8fc9', '#3fa66a', '#d0702a', '#1f9e8f', '#b34d7a']

def main():
    textures()
    land8 = np.asarray(Image.open(f'{OUT}/land.png'), dtype=np.uint8)
    # pass 1: rasters + adjacency for colouring
    per = {}
    adj = {}; area = {}
    for y in YEARS:
        feats = load(y)
        ids, names = raster(feats, W8, H8)
        # close small gaps between polygons and along coasts (nearest polity within ~0.8 deg)
        miss = ids == 0
        dist, (iy, ix) = ndi.distance_transform_edt(miss, return_indices=True)
        ids = np.where(dist <= 18, ids[iy, ix], 0).astype(np.int32)
        del dist, iy, ix, miss
        per[y] = (ids, names)
        inv = {v[0]: (k, v[1], v[2]) for k, v in names.items()}
        small = ids[::8, ::8]
        a, b = small[:, :-1].ravel(), small[:, 1:].ravel(); c, d = small[:-1].ravel(), small[1:].ravel()
        pairs = set(zip(np.r_[a, c].tolist(), np.r_[b, d].tolist()))
        for p, q in pairs:
            if p and q and p != q:
                kp, kq = inv[p][1], inv[q][1]
                if kp != kq: adj.setdefault(kp, set()).add(kq); adj.setdefault(kq, set()).add(kp)
        cnt = np.bincount(small.ravel(), minlength=len(names) + 1)
        for i, (n, k, st) in inv.items():
            if st: area[k] = area.get(k, 0) + cnt[i]
        print('raster', y, len(names), flush=True)
    # colour assignment: pinned first, then by total area, avoiding neighbour colours
    col = {k: v for k, v in PIN.items()}
    def dist(c1, c2):
        a, b = hexrgb(c1), hexrgb(c2); return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5
    for k in sorted(area, key=lambda k: -area[k]):
        if k in col: continue
        used = [col[n] for n in adj.get(k, ()) if n in col]
        best = max(PALETTE, key=lambda c: (min([dist(c, u) for u in used] or [999]), -abs(hash(k + c)) % 97))
        col[k] = best
    labels = {}
    for y in YEARS:
        ids, names = per[y]
        inv = {v[0]: (k, v[1], v[2]) for k, v in names.items()}
        lut = np.zeros((len(names) + 1, 4), np.uint8)
        for i, (n, k, st) in inv.items():
            if st: lut[i] = (*hexrgb(col[k]), 255)
        fill = lut[ids[::2, ::2]]
        Image.fromarray(fill, 'RGBA').save(f'{OUT}/fill_{y}.png', optimize=False, compress_level=6)
        # borders: id changes between two land pixels, at least one side a state
        st = np.array([False] + [inv[i][2] for i in range(1, len(names) + 1)])
        onland = land8 > 110
        e = np.zeros(ids.shape, bool)
        r = np.roll(ids, -1, 1); dn = np.vstack([ids[1:], ids[-1:]])
        for nb, lnb in ((r, np.roll(onland, -1, 1)), (dn, np.vstack([onland[1:], onland[-1:]]))):
            m = (ids != nb) & onland & lnb & (st[ids] | st[nb])
            e |= m
        line = ndi.binary_dilation(e, iterations=1).astype(np.float32)
        line = ndi.gaussian_filter(line, 0.7)
        sm = Image.fromarray((np.clip(line, 0, 1) * 255).astype(np.uint8)).reduce(4)
        halo = np.asarray(sm.filter(ImageFilter.GaussianBlur(3)).resize((W8, H8), Image.BILINEAR), np.float32) / 255
        halo = np.clip(halo * 3.0, 0, 1)
        rgb = np.zeros((H8, W8, 3), np.uint8); rgb[..., 0] = np.clip(line * 1.4, 0, 1) * 255; rgb[..., 1] = halo * 255
        Image.fromarray(rgb).save(f'{OUT}/bord_{y}.png', compress_level=6)
        # labels: pole of inaccessibility of each state's biggest blob (1024x512)
        sm_ids = ids[::8, ::8]; Hs, Ws = sm_ids.shape
        coslat = np.cos(np.radians(90 - (np.arange(Hs) + 0.5) / Hs * 180))
        L = []
        for i, (n, k, stt) in inv.items():
            if not stt: continue
            m = sm_ids == i
            ar = float((m * coslat[:, None]).sum())
            if ar < 6: continue
            lab, nl = ndi.label(m)
            if nl > 1:
                sizes = ndi.sum(m * coslat[:, None], lab, range(1, nl + 1)); m = lab == (int(np.argmax(sizes)) + 1)
            ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            sub = np.pad(m[y0:y1, x0:x1], 1)
            cl = math.cos(math.radians(90 - (y0 + y1) / 2 / Hs * 180))
            dt = ndi.distance_transform_edt(sub, sampling=(1, max(cl, 0.15)))
            py, px = np.unravel_index(np.argmax(dt), dt.shape)
            lon = (x0 + px - 1 + 0.5) / Ws * 360 - 180; lat = 90 - (y0 + py - 1 + 0.5) / Hs * 180
            L.append({'name': n, 'lon': round(lon, 2), 'lat': round(lat, 2), 'area': round(ar, 1), 'r': round(float(dt.max()) / Ws * 360, 2), 'col': col[k], 'key': k})
        L.sort(key=lambda d: -d['area'])
        labels[y] = L[:90]
        print('overlay', y, flush=True)
    json.dump({'years': YEARS, 'labels': labels, 'colors': col}, open(f'{OUT}/labels.json', 'w'))

if __name__ == '__main__':
    main()
