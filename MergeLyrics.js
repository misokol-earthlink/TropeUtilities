// Merge Lyrics JSON Files utility.
// Stage: select two files and establish the proposed merged output filename.
(() => {
  "use strict";

  const state = { file1: null, file2: null };

  function el(id) { return document.getElementById(id); }

  function showPrompt(text, buttonText, handler) {
    el("mergePromptText").textContent = text;
    const button = el("mergePromptButton");
    button.textContent = buttonText;
    button.onclick = handler;
    el("mergePrompt").classList.add("visible");
  }

  function hidePrompt() {
    el("mergePrompt").classList.remove("visible");
  }

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
    showPrompt(
      "Please select the first file for the merge.",
      "Select First File",
      () => { hidePrompt(); openPicker("mergeLyricsFile1Picker"); }
    );
  }

  function requestSecondFile() {
    showPrompt(
      "First file selected. Please select the second file for the merge.",
      "Select Second File",
      () => { hidePrompt(); openPicker("mergeLyricsFile2Picker"); }
    );
  }

  function start() {
    state.file1 = null;
    state.file2 = null;
    el("mergePanel").classList.add("visible");
    el("mergeFile1Name").textContent = "";
    el("mergeFile2Name").textContent = "";
    el("mergedFileName").value = "";
    el("mergeStatus").textContent = "";
    requestFirstFile();
  }

  function initialize() {
    const picker1 = el("mergeLyricsFile1Picker");
    const picker2 = el("mergeLyricsFile2Picker");
    if (!picker1 || !picker2) return;

    picker1.addEventListener("change", () => {
      const file = picker1.files && picker1.files[0];
      if (!file) {
        el("mergeStatus").textContent = "First file selection cancelled.";
        requestFirstFile();
        return;
      }
      state.file1 = file;
      el("mergeFile1Name").textContent = file.name;
      el("mergedFileName").value = proposedMergedName(file.name);
      el("mergeStatus").textContent = "";
      requestSecondFile();
    });

    picker2.addEventListener("change", () => {
      const file = picker2.files && picker2.files[0];
      if (!file) {
        el("mergeStatus").textContent = "Second file selection cancelled.";
        requestSecondFile();
        return;
      }
      state.file2 = file;
      el("mergeFile2Name").textContent = file.name;
      el("mergeStatus").textContent = "Both files selected. Proposed merged filename may be edited.";
    });
  }

  window.addEventListener("DOMContentLoaded", initialize);
  window.MergeLyrics = { start };
})();
