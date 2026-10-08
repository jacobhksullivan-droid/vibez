# Rebuilds review/spots-review.html from data/spots.js.  Run: python3 tools/build_review.py
import json, re, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
spots = (root / "data/spots.js").read_text().replace("export const ", "const ")
lines = "\n".join(f"{m[0]}|{m[1]}|{m[2]}" for m in re.findall(r'id: "([^"]+)", type: "spear".*?lat: (-?[\d.]+), lon: ([\d.]+)', spots, re.S))
out = subprocess.run(["python3", str(root / "tools/zonecheck.py")], input=lines, capture_output=True, text=True, cwd=root).stdout
legal = {l[:28].strip(): l[28:].strip() for l in out.strip().split("\n") if l.strip()}
tpl = (root / "tools/review_template.html").read_text()
html = tpl.replace("/*__SPOTS__*/", spots).replace("/*__LEGAL__*/", json.dumps(legal))
(root / "review/spots-review.html").write_text(html)
print("wrote review/spots-review.html", len(html), "bytes,", len(legal), "spear spots legal-checked")
