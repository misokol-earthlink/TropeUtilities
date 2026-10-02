// Shared Trope Utilities controller.
// Keep utility-specific processing in each utility's own script.
(() => {
  "use strict";

  window.addEventListener("load", () => {
    const splash = document.getElementById("splash-screen");

    if (splash) {
      setTimeout(() => {
        splash.classList.add("fade-out");

        setTimeout(() => {
          window.location.replace("TropeUtilities.html");
        }, 2000);

      }, 5000);

      return;
    }

    initializeUtilitiesPage();
  });

  function initializeUtilitiesPage() {
    const mergeButton = document.getElementById("mergeLyricsFilesBtn");
    if (mergeButton) {
      mergeButton.addEventListener("click", () => {
        if (window.MergeLyrics && typeof window.MergeLyrics.start === "function") {
          window.MergeLyrics.start();
        }
      });
    }
  }
})();
