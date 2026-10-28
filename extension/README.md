# Gallery Grade Club Recorder

A Chrome extension that records the players in your EA FC 27 Ultimate Team club while you use the
FC 27 Web App, so you can import them into the Gallery Grade Maximizer (`../index.html`).

- **First Owner:** a card is marked First Owner when the web app shows it has had one owner (you).
  The mark stays after you sell the card.
- **Sold cards:** every card the extension has seen is kept, even after you sell it or use it in an SBC.
  Cards you sold before installing the extension can't be found; add those by hand on the site.
- **Loan cards** are skipped because they don't count for the Gallery.
- It only reads data. It never buys, sells, lists or searches the transfer market. "Scan whole club"
  repeats the web app's own club search one page at a time, with a pause between pages.
- Everything stays in your browser. Nothing is sent anywhere else.

This is unofficial and not approved by EA. Use it at your own risk.

## Install (Chrome or Edge, desktop)

1. Download this repository: on GitHub press **Code → Download ZIP**, then unzip it.
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Press **Load unpacked** and choose the `extension` folder.
4. Pin the extension so its button shows in the toolbar.

## Use

1. Open the FC 27 Web App and sign in.
2. Go to **Club → Players**. Then open the extension and press **Scan whole club**
   (or page through your club yourself; every page you view is recorded).
3. Press **Copy players for the site**, open the Gallery Grade Maximizer, open
   **Bulk import / export**, paste, and press **Replace with CSV**.
4. Pick the Set's league, club or nation in the filter on the site.

Open the web app now and then (after opening packs, before selling) so new cards and First Owner
marks get recorded.

## Known gaps

Club and nation names show as numbers (for example `Club 1`); the site lists example players next to
each so you can tell them apart. Hero detection isn't automatic yet, and TOTW, Holographic and 5★
detection are best guesses until tested on FC 27. If something looks wrong, press
**Copy one raw card** in the extension and share it so the detection can be fixed.
