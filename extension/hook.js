// Runs inside the EA web app page. Watches the web app's own responses for
// player items you own and passes them to bridge.js. It never sends anything
// to EA except, when you press "Scan whole club", repeats of the club search
// the web app itself made, one page at a time.
(() => {
  const TAG = "gallery-grade";
  // Responses that only contain your own items.
  const OWNED = /\/ut\/game\/[^/]+\/(club|purchased\/items|tradepile|squad|sbs|item\b|user\/massInfo)/;
  // Responses that contain other people's items.
  const NOT_OWNED = /transfermarket|watchlist|marketdata|leaderboards/;
  const NAMES = /players\.json/;

  let clubRequest = null; // last club search the web app made: { url, method, headers, body }
  let scanning = false;

  const post = msg => window.postMessage({ source: TAG, ...msg }, location.origin);

  function findPlayers(node, out, depth = 0) {
    if (!node || typeof node !== "object" || depth > 8) return out;
    if (Array.isArray(node)) { for (const x of node) findPlayers(x, out, depth + 1); return out; }
    if (node.itemType === "player" && typeof node.rating === "number" && (node.id || node.resourceId)) { out.push(node); return out; }
    for (const k in node) findPlayers(node[k], out, depth + 1);
    return out;
  }

  function handle(url, text) {
    try {
      if (NAMES.test(url)) { post({ kind: "names", data: JSON.parse(text) }); return; }
      if (!OWNED.test(url) || NOT_OWNED.test(url)) return;
      const players = findPlayers(JSON.parse(text), []);
      if (players.length) post({ kind: "items", items: players, url });
    } catch (e) { /* not JSON */ }
  }

  const isClubSearch = url => /\/ut\/game\/[^/]+\/club(\?|$)/.test(url);

  // fetch
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input && input.url || "";
    if (isClubSearch(url) && !scanning) {
      const headers = {};
      new Headers((init && init.headers) || (input && input.headers) || {}).forEach((v, k) => { headers[k] = v; });
      clubRequest = { url, method: (init && init.method) || "GET", headers, body: init && typeof init.body === "string" ? init.body : null };
      post({ kind: "club-ready" });
    }
    const res = await origFetch.apply(this, arguments);
    if (NAMES.test(url) || OWNED.test(url)) res.clone().text().then(t => handle(url, t)).catch(() => {});
    return res;
  };

  // XMLHttpRequest
  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send, XH = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) { this.__gg = { method, url: String(url), headers: {} }; return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) { if (this.__gg) this.__gg.headers[k] = v; return XH.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (body) {
    const info = this.__gg;
    if (info) {
      if (isClubSearch(info.url) && !scanning) {
        clubRequest = { url: info.url, method: info.method, headers: info.headers, body: typeof body === "string" ? body : null };
        post({ kind: "club-ready" });
      }
      if (NAMES.test(info.url) || OWNED.test(info.url)) {
        this.addEventListener("load", () => {
          if (this.status >= 200 && this.status < 300 && (this.responseType === "" || this.responseType === "text")) handle(info.url, this.responseText);
          else if (this.responseType === "json" && this.response) handle(info.url, JSON.stringify(this.response));
        });
      }
    }
    return XS.apply(this, arguments);
  };

  // Page through the club using the same search the web app made, changing only the start offset.
  async function scanClub() {
    if (!clubRequest) { post({ kind: "scan", status: "error", message: "Open Club > Players in the web app first, then try again." }); return; }
    scanning = true;
    let start = 0, total = 0, page = 0;
    try {
      while (page < 200) {
        let url = clubRequest.url, body = clubRequest.body, count = 91;
        if (body) {
          const b = JSON.parse(body); count = b.count || count; b.start = start; body = JSON.stringify(b);
        } else {
          const u = new URL(url, location.href); count = +u.searchParams.get("count") || count;
          u.searchParams.set("start", start); url = u.toString();
        }
        const res = await origFetch(url, { method: clubRequest.method, headers: clubRequest.headers, body, credentials: "include" });
        if (!res.ok) throw new Error("EA answered " + res.status + (res.status === 429 ? " (too many requests, wait a few minutes)" : ""));
        const players = findPlayers(await res.json(), []);
        if (players.length) post({ kind: "items", items: players, url });
        total += players.length; page++;
        post({ kind: "scan", status: "progress", total });
        if (players.length < count) break;
        start += count;
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
      }
      post({ kind: "scan", status: "done", total });
    } catch (e) {
      post({ kind: "scan", status: "error", message: String(e.message || e) });
    } finally { scanning = false; }
  }

  window.addEventListener("message", e => {
    if (e.source !== window || !e.data || e.data.source !== TAG + "-cmd") return;
    if (e.data.cmd === "scan" && !scanning) scanClub();
    if (e.data.cmd === "status") post({ kind: "club-status", ready: !!clubRequest, scanning });
  });
})();
