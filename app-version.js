const APP_VERSION = "1.0.1";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-app-version]").forEach((element) => {
    element.textContent = `نسخه ${APP_VERSION}`;
  });
});