// Merge Lyrics JSON Files utility.
// This first test only selects File 1 and displays its filename.
(() => {
  "use strict";

  function start() {
    const panel = document.getElementById("mergePanel");
    const picker = document.getElementById("mergeLyricsFile1Picker");
    const display = document.getElementById("mergeFile1Name");
    const status = document.getElementById("mergeStatus");

    if (!panel || !picker || !display || !status) return;

    panel.classList.add("visible");
    display.textContent = "";
    status.textContent = "Select the first Lyrics JSON file.";

    // Clear the value so selecting the same file again still raises change.
    picker.value = "";
    picker.click();
  }

  function initialize() {
    const picker = document.getElementById("mergeLyricsFile1Picker");
    if (!picker) return;

    picker.addEventListener("change", () => {
      const file = picker.files && picker.files[0];
      if (!file) {
        document.getElementById("mergeStatus").textContent = "File selection cancelled.";
        return;
      }

      document.getElementById("mergeFile1Name").textContent = file.name;
      document.getElementById("mergeStatus").textContent = "First file selected. No processing has been performed yet.";
    });
  }

  window.addEventListener("DOMContentLoaded", initialize);
  window.MergeLyrics = { start };
})();
