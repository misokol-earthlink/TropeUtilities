// View Lyrics JSON Files utility. Independent of the merge and audio utilities.
(() => {
  "use strict";
  let initialized = false;
  const byId = id => document.getElementById(id);

  window.ViewLyrics = {
    start() {
      const panel = byId("viewLyricsPanel");
      if (!panel) return;
      panel.classList.add("visible");
      if (initialized) return;
      initialized = true;
      byId("vl-file").addEventListener("change", loadFile);
    }
  };

  function status(message, error = false) {
    const el = byId("vl-status");
    el.textContent = message;
    el.classList.toggle("error", error);
  }

  async function loadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    byId("vl-title").textContent = "";
    byId("vl-lines").replaceChildren();
    try {
      if (!/\.json$/i.test(file.name)) throw new Error("Please select a JSON file.");
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.lines)) throw new Error("JSON must contain a lines array.");
      const title = typeof data.title === "string" ? data.title : "";
      const pt = /-PT$/i.test(title.trim());
      byId("vl-title").textContent = title || file.name;
      const fragment = document.createDocumentFragment();
      data.lines.forEach((line, i) => {
        if (!line || !Array.isArray(line.words)) throw new Error(`Line ${i + 1} has no words array.`);
        const row = document.createElement("div"); row.className = "vl-line";
        const meta = document.createElement("div"); meta.className = "vl-meta";
        const ordinal = document.createElement("div"); ordinal.className = "vl-ordinal";
        ordinal.textContent = String(i + 1); meta.append(ordinal);
        const ref = typeof line.lineName === "string" ? line.lineName.trim() : "";
        // Only biblical book:chapter:verse identifiers are displayed as citations.
        if (/^(GE|EX|LE|NU|DE):\d{2}:\d{2}$/i.test(ref)) {
          const citation = document.createElement("div"); citation.className = "vl-reference";
          citation.textContent = ref + (pt ? " (PT)" : ""); meta.append(citation);
        }
        const words = document.createElement("div"); words.className = "vl-words";
        line.words.forEach(word => {
          const pair = document.createElement("div"); pair.className = "vl-pair";
          const hebrew = document.createElement("div"); hebrew.className = "vl-hebrew";
          hebrew.textContent = typeof word?.hebrew === "string" ? word.hebrew : "";
          const translit = document.createElement("div"); translit.className = "vl-translit";
          translit.textContent = typeof word?.translit === "string" ? word.translit : "";
          pair.append(hebrew, translit); words.append(pair);
        });
        row.append(meta, words); fragment.append(row);
      });
      byId("vl-lines").append(fragment);
      status(`${file.name} — ${data.lines.length} lines loaded.`);
    } catch (error) { status(`Unable to display file: ${error.message}`, true); }
  }
})();
