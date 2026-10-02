// Trope Utilities splash-page controller.
// After the splash display, open the Trope Utilities menu page.
window.addEventListener("load", () => {
  const splash = document.getElementById("splash-screen");

  // Keep the splash visible briefly, then use the existing 2-second fade.
  setTimeout(() => {
    splash.classList.add("fade-out");

    setTimeout(() => {
      window.location.replace("TropeUtilities.html");
    }, 2000);
  }, 1200);
});
