// Merge Lyrics JSON Files utility.
// Stage: select two files, read titles, determine whether Pocket Torah title tagging is allowed.
(() => {
  "use strict";

  const state = { file1: null, file2: null, json1: null, json2: null, ptAllowed: false };
  const el = id => document.getElementById(id);

  function showPrompt(text, buttonText, handler) {
    el("mergePromptText").textContent = text;
    const button = el("mergePromptButton");
    button.textContent = buttonText;
    button.onclick = handler;
    el("mergePrompt").classList.add("visible");
  }
  function hidePrompt() { el("mergePrompt").classList.remove("visible"); }

  function proposedMergedName(filename) {
    const dot = filename.toLowerCase().endsWith(".json") ? filename.length - 5 : filename.lastIndexOf(".");
    if (dot > 0) return filename.slice(0, dot) + "-Merged" + filename.slice(dot);
    return filename + "-Merged";
  }

  function openPicker(id) {
    const picker = el(id);
    picker.value = "";
    picker.click();
  }

  function requestFirstFile() {
    showPrompt("Please select the first file for the merge.", "Select First File",
      () => { hidePrompt(); openPicker("mergeLyricsFile1Picker"); });
  }
  function requestSecondFile() {
    showPrompt("First file selected. Please select the second file for the merge.", "Select Second File",
      () => { hidePrompt(); openPicker("mergeLyricsFile2Picker"); });
  }

  function isLyricsFilename(filename) {
    return /_Lyrics\.json$/i.test(String(filename || "").trim());
  }

  async function readJson(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  function isPTTitle(title) {
    return typeof title === "string" && /-PT$/i.test(title.trim());
  }

  function withoutPT(title) {
    return String(title || "").trim().replace(/-PT$/i, "");
  }

  function setMergedTitleFromFirst() {
    const title1 = state.json1?.title || "";
    const base = withoutPT(title1);
    if (state.ptAllowed && el("ptEnable").checked) el("mergedJsonTitle").value = base + "-PT";
    else el("mergedJsonTitle").value = base;
  }

  function updatePTControls() {
    state.ptAllowed = isPTTitle(state.json1?.title) && isPTTitle(state.json2?.title);
    const box = el("ptAllowedBox");
    if (state.ptAllowed) {
      box.classList.add("visible");
      el("ptEnable").checked = true;
      el("ptDisable").checked = false;
    } else {
      box.classList.remove("visible");
      el("ptEnable").checked = false;
      el("ptDisable").checked = true;
    }
    const lineBox = el("lineNameChoiceBox");
    if (lineBox) {
      lineBox.classList.toggle("visible", !state.ptAllowed);
      el("keepLineNames").checked = true;
      el("renameLineNames").checked = false;
    }
    setMergedTitleFromFirst();
  }

  function start() {
    Object.assign(state, { file1:null, file2:null, json1:null, json2:null, ptAllowed:false });
    el("mergePanel").classList.add("visible");
    ["mergeFile1Name","mergeFile2Name","mergeTitle1","mergeTitle2"].forEach(id => el(id).textContent = "");
    el("mergedFileName").value = "";
    el("mergedJsonTitle").value = "";
    el("ptAllowedBox").classList.remove("visible");
    el("lineNameChoiceBox").classList.remove("visible");
    el("keepLineNames").checked = true;
    el("renameLineNames").checked = false;
    el("mergeStatus").textContent = "";
    el("mergeDownloadBtn").disabled = true;
    requestFirstFile();
  }


  function mergeAndDownload() {
    if (!state.json1 || !state.json2) return;
    if (!Array.isArray(state.json1.lines) || !Array.isArray(state.json2.lines)) {
      el("mergeStatus").textContent = "Both JSON files must contain a lines array before they can be merged.";
      return;
    }

    let mergedTitle = el("mergedJsonTitle").value.trim();
    if (state.ptAllowed) {
      mergedTitle = withoutPT(mergedTitle);
      if (el("ptEnable").checked) mergedTitle += "-PT";
    } else {
      mergedTitle = withoutPT(mergedTitle);
    }

    let mergedLines = [...state.json1.lines, ...state.json2.lines].map(line => ({ ...line }));

    // Sequential renaming is available only when the two source files are not PT-eligible.
    if (!state.ptAllowed && el("renameLineNames").checked) {
      mergedLines = mergedLines.map((line, index) => ({
        ...line,
        lineName: String(index + 1).padStart(2, "0")
      }));
    }

    const merged = {
      title: mergedTitle,
      lines: mergedLines
    };

    let filename = el("mergedFileName").value.trim() || proposedMergedName(state.file1.name);
    if (!/\.json$/i.test(filename)) filename += ".json";

    const blob = new Blob([JSON.stringify(merged, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    el("mergeStatus").textContent = `Merged ${state.json1.lines.length + state.json2.lines.length} lines and downloaded ${filename}.`;
  }

  function initialize() {
    const picker1 = el("mergeLyricsFile1Picker");
    const picker2 = el("mergeLyricsFile2Picker");
    if (!picker1 || !picker2) return;

    el("ptEnable").addEventListener("change", () => {
      if (el("ptEnable").checked) el("ptDisable").checked = false;
      else el("ptEnable").checked = true;
      setMergedTitleFromFirst();
    });
    el("ptDisable").addEventListener("change", () => {
      if (el("ptDisable").checked) el("ptEnable").checked = false;
      else el("ptDisable").checked = true;
      setMergedTitleFromFirst();
    });

    el("mergeDownloadBtn").addEventListener("click", mergeAndDownload);

    picker1.addEventListener("change", async () => {
      const file = picker1.files && picker1.files[0];
      if (!file) { el("mergeStatus").textContent = "First file selection cancelled."; requestFirstFile(); return; }
      if (!isLyricsFilename(file.name)) {
        state.file1 = state.json1 = null;
        el("mergeStatus").textContent = "The first filename must end with _Lyrics.json. Please select another file.";
        requestFirstFile();
        return;
      }
      try {
        state.file1 = file;
        state.json1 = await readJson(file);
        el("mergeFile1Name").textContent = file.name;
        el("mergeTitle1").textContent = state.json1.title ?? "(No title found)";
        el("mergedFileName").value = proposedMergedName(file.name);
        el("mergeStatus").textContent = "";
        requestSecondFile();
      } catch (err) {
        state.file1 = state.json1 = null;
        el("mergeStatus").textContent = "The first file could not be read as JSON. Please select another file.";
        requestFirstFile();
      }
    });

    picker2.addEventListener("change", async () => {
      const file = picker2.files && picker2.files[0];
      if (!file) { el("mergeStatus").textContent = "Second file selection cancelled."; requestSecondFile(); return; }
      if (!isLyricsFilename(file.name)) {
        state.file2 = state.json2 = null;
        el("mergeStatus").textContent = "The second filename must end with _Lyrics.json. Please select another file.";
        requestSecondFile();
        return;
      }
      try {
        state.file2 = file;
        state.json2 = await readJson(file);
        el("mergeFile2Name").textContent = file.name;
        el("mergeTitle2").textContent = state.json2.title ?? "(No title found)";
        updatePTControls();
        el("mergeStatus").textContent = state.ptAllowed
          ? "Both titles are Pocket Torah titles. Pocket Torah is allowed for the merged title."
          : "Pocket Torah is not available for the merged title because both source titles are not -PT.";
        el("mergeDownloadBtn").disabled = false;
      } catch (err) {
        state.file2 = state.json2 = null;
        el("mergeStatus").textContent = "The second file could not be read as JSON. Please select another file.";
        requestSecondFile();
      }
    });
  }

  window.addEventListener("DOMContentLoaded", initialize);
  window.MergeLyrics = { start };
})();
