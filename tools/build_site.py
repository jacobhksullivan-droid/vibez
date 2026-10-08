# Builds the folder you drag onto Netlify: deploy/epic-camper (and a .zip of it).
# The spot list and tide tables are encrypted with the passcode in tools/passcode.txt.
# Run: python3 tools/build_site.py
import hashlib, json, pathlib, shutil, subprocess, zipfile

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "deploy" / "epic-camper"
SALT = "c0a57ca11e9a2026"   # fixed so a phone stays unlocked across updates
ITER = 150000               # must match src/gate.js

if out.exists(): shutil.rmtree(out)
(out / "src").mkdir(parents=True); (out / "data").mkdir(); (out / "icons").mkdir()
for f in ["index.html", "style.css", "manifest.webmanifest", "_headers"]:
    shutil.copy(root / f, out / f)
for f in sorted((root / "src").glob("*.js")):
    shutil.copy(f, out / "src" / f.name)
for f in ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]:
    shutil.copy(root / "icons" / f, out / "icons" / f)
shutil.copy(root / "data" / "zones.geojson", out / "data" / "zones.geojson")
shutil.copy(root / "data" / "camps.js", out / "data" / "camps.js")   # public camp list (not secret)

bundle = json.dumps({"spots": (root / "data/spots.js").read_text(), "tides": (root / "data/tides.js").read_text()}).encode()
passcode = (root / "tools/passcode.txt").read_text().strip()
enc = subprocess.run(["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", str(ITER), "-md", "sha256", "-S", SALT, "-pass", "pass:" + passcode],
                     input=bundle, capture_output=True, check=True).stdout
(out / "data" / "secure.bin").write_bytes(enc)

h = hashlib.sha1()
for p in sorted(out.rglob("*")):
    if p.is_file(): h.update(p.read_bytes())
(out / "sw.js").write_text((root / "sw.js").read_text().replace("__VERSION__", h.hexdigest()[:10]))

z = root / "deploy" / "epic-camper.zip"
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for p in sorted(out.rglob("*")):
        if p.is_file(): zf.write(p, p.relative_to(out.parent))
print("built", out.relative_to(root), "and", z.relative_to(root), f"({z.stat().st_size // 1024} KB)")
