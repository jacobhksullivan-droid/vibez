// Passcode gate. The spot list and BOM tide tables ship encrypted (data/secure.bin).
// The passcode unlocks them on the phone; it's remembered on that device after the first time.
// On localhost (development) the plain files are used and there is no gate.
(function () {
  const ITER = 150000;
  const KEY = "cc-unlock-v1";
  // add ?gate to the URL to test the passcode screen locally
  const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname) && !location.search.includes("gate");
  const $ = id => document.getElementById(id);

  function startApp(importMap) {
    if (importMap) {
      const im = document.createElement("script");
      im.type = "importmap";
      im.textContent = JSON.stringify({ imports: importMap });
      document.head.appendChild(im);
    }
    const s = document.createElement("script");
    s.type = "module";
    s.src = "src/app.js";
    document.body.appendChild(s);
  }

  if ("serviceWorker" in navigator && !LOCAL) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (LOCAL) { $("gate").hidden = true; startApp(null); return; }

  const hex = b => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  const unhex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

  async function derive(pass, salt) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, 384));
  }
  async function decrypt(bits, buf) {
    const key = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-CBC", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: bits.slice(32, 48) }, key, buf.slice(16));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function getBundle() {
    const r = await fetch("data/secure.bin", { cache: "no-cache" });
    if (!r.ok) throw new Error("couldn't load app data");
    return new Uint8Array(await r.arrayBuffer());
  }
  function unlock(bundle) {
    const url = code => URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    $("gate").hidden = true;
    startApp({
      [new URL("data/spots.js", location.href).href]: url(bundle.spots),
      [new URL("data/tides.js", location.href).href]: url(bundle.tides),
    });
  }

  let buf = null;
  (async () => {
    try { buf = await getBundle(); } catch (e) { $("gateMsg").textContent = "Can't load the app data. Check your connection and reload."; return; }
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved) {
      try { return unlock(await decrypt(unhex(saved), buf)); } catch (e) { try { localStorage.removeItem(KEY); } catch (e2) {} }
    }
    $("gate").hidden = false;
    $("gatePass").focus();
  })();

  $("gateForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!buf) return;
    $("gateMsg").textContent = "Unlocking…";
    try {
      const bits = await derive($("gatePass").value.trim(), buf.slice(8, 16));
      const bundle = await decrypt(bits, buf);
      try { localStorage.setItem(KEY, hex(bits)); } catch (e2) {}
      unlock(bundle);
    } catch (err) {
      $("gateMsg").textContent = "Wrong passcode. Try again.";
    }
  });
})();
