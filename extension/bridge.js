// Runs in the extension's isolated world on the web app page. Saves what hook.js
// sees into chrome.storage.local and relays popup commands to hook.js.
(() => {
  const TAG = "gallery-grade";
  const POS = { GK: "GK", CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
    CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID", ST: "ATT", CF: "ATT", LW: "ATT", RW: "ATT" };
  let queue = Promise.resolve();
  const serial = fn => (queue = queue.then(fn, fn));

  const pick = (o, keys) => { for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]; return undefined; };
  const holoFlag = o => Object.keys(o).some(k => /holo/i.test(k) && !!o[k] && o[k] !== "0");

  function slim(it, now) {
    const loans = pick(it, ["loans", "loanValue"]);
    return {
      id: String(it.id || it.resourceId),
      assetId: it.assetId || it.resourceId,
      rating: it.rating,
      pos: POS[it.preferredPosition] || "MID",
      league: it.leagueId, club: it.teamid ?? it.teamId, nation: it.nation ?? it.nationId,
      owners: it.owners,
      rareflag: it.rareflag,
      sm: pick(it, ["skillMoves", "skillmoves", "skillMovesLevel"]),
      wf: pick(it, ["weakFootAbilityTypeCode", "weakfootabilitytypecode", "weakFoot", "weakfoot"]),
      holo: holoFlag(it),
      loan: loans !== undefined && Number(loans) > 0,
      seen: now,
    };
  }

  function saveItems(raw) {
    return serial(async () => {
      const now = Date.now();
      const { items = {}, sample } = await chrome.storage.local.get(["items", "sample"]);
      for (const r of raw) {
        const s = slim(r, now);
        if (s.loan) continue;
        const old = items[s.id];
        // First Owner is sticky: once seen with a single owner, it stays marked even after you sell it.
        s.fo = (old && old.fo) || s.owners === 1;
        s.first = old ? old.first : now;
        items[s.id] = s;
      }
      await chrome.storage.local.set({ items, updated: now, sample: sample || raw[0] });
    });
  }

  function saveNames(data) {
    return serial(async () => {
      const names = {};
      const lists = Array.isArray(data) ? [data] : Object.values(data || {}).filter(Array.isArray);
      for (const list of lists) for (const p of list) {
        if (!p || p.id === undefined) continue;
        const full = p.c || p.commonName || [p.f || p.firstName, p.l || p.lastName].filter(Boolean).join(" ");
        if (full) names[p.id] = full;
      }
      if (Object.keys(names).length) await chrome.storage.local.set({ names });
    });
  }

  window.addEventListener("message", e => {
    if (e.source !== window || !e.data || e.data.source !== TAG) return;
    const m = e.data;
    if (m.kind === "items") saveItems(m.items);
    else if (m.kind === "names") saveNames(m.data);
    else if (m.kind === "scan" || m.kind === "club-ready" || m.kind === "club-status") {
      chrome.storage.local.set({ scan: { ...m, at: Date.now() } });
    }
  });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg && msg.cmd) window.postMessage({ source: TAG + "-cmd", cmd: msg.cmd }, location.origin);
  });
})();
