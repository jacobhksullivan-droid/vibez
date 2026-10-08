# Checks each spot's `facing` (and spear sides) against the real coastline from OpenStreetMap.
# For every pin: the seaward normal of the nearest coastline segment, and the biggest open-water arc (rays to 3 km).
# Prints FLAG where a surf facing is >35° off the shoreline normal, or a facing points into land.
# Run: python3 tools/facingcheck.py   (needs node on PATH to read data/spots.js; caches OSM files in /tmp/coastcache)
import json, math, os, subprocess, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cache = "/tmp/coastcache"; os.makedirs(cache, exist_ok=True)
S = json.loads(subprocess.run(["node", "--input-type=module", "-e",
    "import {SPOTS} from './data/spots.js'; console.log(JSON.stringify(SPOTS.map(s=>({id:s.id,type:s.type,lat:s.lat,lon:s.lon,facing:s.facing,sides:s.sides?.map(d=>({name:d.name,facing:d.facing}))}))))"],
    cwd=root, capture_output=True, text=True, check=True).stdout)
def coast(s):
    f = f"{cache}/{s['id']}_{s['lat']:.4f}_{s['lon']:.4f}.json"
    if os.path.exists(f): return json.load(open(f))
    la, lo, d = s['lat'], s['lon'], 0.035
    q = f'[out:json][timeout:60];way["natural"="coastline"]({la-d},{lo-d*1.2},{la+d},{lo+d*1.2});out geom;'
    for url in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        r = subprocess.run(["curl", "-s", "-m", "90", "-A", "epic-camper-check", "--data-urlencode", "data=" + q, url], capture_output=True)
        try: j = json.loads(r.stdout); json.dump(j, open(f, "w")); return j
        except Exception: time.sleep(2)
    return None
def adiff(a, b): d = abs((a - b) % 360); return min(d, 360 - d)
def hit(r, a, b):
    sx, sy = b[0]-a[0], b[1]-a[1]; den = r[0]*sy - r[1]*sx
    if abs(den) < 1e-12: return None
    t = (a[0]*sy - a[1]*sx) / den; u = (a[0]*r[1] - a[1]*r[0]) / den
    return t if t > 0 and 0 <= u <= 1 else None
for s in S:
    j = coast(s)
    if not j: print(s['id'], "no coastline data"); continue
    k = math.cos(math.radians(s['lat']))
    segs = []
    for w in j.get("elements", []):
        g = [((p['lon']-s['lon'])*111.32*k, (p['lat']-s['lat'])*110.54) for p in w.get("geometry", [])]
        segs += list(zip(g, g[1:]))
    if not segs: print(s['id'], "no coastline nearby"); continue
    best = None
    for a, b in segs:  # OSM coastline: land on the left, so the seaward normal is (dy, -dx)
        sx, sy = b[0]-a[0], b[1]-a[1]; L = sx*sx + sy*sy or 1e-9
        t = max(0, min(1, (-a[0]*sx - a[1]*sy) / L)); d = math.hypot(a[0]+t*sx, a[1]+t*sy)
        if not best or d < best[0]: best = (d, (math.degrees(math.atan2(sy, -sx)) + 360) % 360)
    open_ = [min([h for sg in segs for h in [hit((math.sin(math.radians(a)), math.cos(math.radians(a))), *sg)] if h is not None], default=99) > 3 for a in range(0, 360, 5)]
    facs = [("main", s['facing'])] if s['type'] == "surf" else [(d['name'], d['facing']) for d in s['sides']]
    for nm, fc in facs:
        into_land = not open_[int(round(fc / 5)) % 72]
        flag = (s['type'] == "surf" and best[0] < 1.5 and adiff(fc, best[1]) > 35) or into_land
        print(f"{s['id'][:24]:24} {nm[:26]:26} facing {fc:>3}  shore normal {round(best[1]):>3} ({best[0]:.2f} km){'  into land' if into_land else ''}{'  FLAG' if flag else ''}")
