const LEAGUES = { 13: "Premier League", 14: "EFL Championship", 60: "EFL League One", 61: "EFL League Two",
  53: "LALIGA EA SPORTS", 54: "LALIGA HYPERMOTION", 19: "Bundesliga", 20: "Bundesliga 2", 31: "Serie A", 32: "Serie B",
  16: "Ligue 1", 17: "Ligue 2", 10: "Eredivisie", 308: "Liga Portugal", 39: "MLS", 350: "Saudi Pro League",
  68: "Süper Lig", 4: "Belgian Pro League", 50: "Scottish Premiership", 2118: "Icons" };
const ICON_LEAGUE = 2118, TOTW_RAREFLAG = 3;

const $ = id => document.getElementById(id);
const say = (text, err) => { $("msg").textContent = text; $("msg").className = err ? "err" : ""; };

async function load() { return chrome.storage.local.get(["items", "names", "updated", "scan", "sample"]); }

function toCSV(items, names) {
  const list = Object.values(items);
  // EA stores skill moves / weak foot either as 1-5 or 0-4. If any card has 0, treat the scale as 0-4.
  const zeroBased = key => list.some(i => i[key] === 0);
  const top = key => zeroBased(key) ? 4 : 5;
  const smTop = top("sm"), wfTop = top("wf");
  const clean = s => String(s).replace(/,/g, " ");
  return list.map(i => {
    const flags = [];
    if (i.fo) flags.push("fo");
    if (i.rareflag === TOTW_RAREFLAG) flags.push("totw");
    if (i.holo) flags.push("holo");
    if (i.league === ICON_LEAGUE) flags.push("icon");
    if (i.sm === smTop) flags.push("sm5");
    if (i.wf === wfTop) flags.push("wf5");
    const name = names[i.assetId] || "Player " + i.assetId;
    return [clean(name), i.rating, i.pos, clean(LEAGUES[i.league] || "League " + i.league),
      "Club " + i.club, "Nation " + i.nation, flags.join("|"), ""].join(",");
  }).join("\n");
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { $("fallback").hidden = false; $("fallback").value = text; $("fallback").select(); return false; }
}

async function render() {
  const { items = {}, updated, scan } = await load();
  const list = Object.values(items);
  $("n").textContent = list.length;
  $("fo").textContent = list.filter(i => i.fo).length;
  if (updated) $("updated").textContent = "Last updated " + new Date(updated).toLocaleString() + ".";
  if (scan && Date.now() - scan.at < 10 * 60 * 1000) {
    if (scan.kind === "scan" && scan.status === "progress") say(`Scanning… ${scan.total} players so far. Keep the web app tab open.`);
    if (scan.kind === "scan" && scan.status === "done") say(`Scan finished: ${scan.total} players read.`);
    if (scan.kind === "scan" && scan.status === "error") say(scan.message, true);
  }
}

$("copy").addEventListener("click", async () => {
  const { items = {}, names = {} } = await load();
  const n = Object.keys(items).length;
  if (!n) return say("No players recorded yet. Open Club > Players in the web app first.", true);
  const ok = await copy(toCSV(items, names));
  say(ok ? `Copied ${n} players.` : "Copy was blocked. Select the text below and copy it yourself.");
});

$("sample").addEventListener("click", async () => {
  const { sample } = await load();
  if (!sample) return say("No card recorded yet.", true);
  const ok = await copy(JSON.stringify(sample, null, 1));
  say(ok ? "Copied one raw card. Paste it to Claude if something looks wrong." : "Copy was blocked. Select the text below.");
});

$("scan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.tabs.sendMessage(tab.id, { cmd: "scan" });
    say("Starting scan. If nothing happens, open Club > Players in the web app first, then press Scan again.");
  } catch {
    say("Open this from the FC 27 Web App tab.", true);
  }
});

let confirmClear = false;
$("clear").addEventListener("click", async () => {
  if (!confirmClear) { confirmClear = true; $("clear").textContent = "Press again to delete everything recorded"; return; }
  await chrome.storage.local.remove(["items", "updated", "sample", "scan"]);
  confirmClear = false; $("clear").textContent = "Delete recorded players";
  say("Deleted."); render();
});

chrome.storage.onChanged.addListener(render);
render();
