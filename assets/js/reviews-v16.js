(function () {
  "use strict";
  const form = document.querySelector("[data-review-form]");
  if (!form) return;
  const status = form.querySelector("[data-review-status]");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!QSApi.token()) {
      location.href = "login.html?next=" + encodeURIComponent("index.html#rate-us");
      return;
    }
    status.textContent = "Submitting your review…";
    try {
      await QSApi.post("submitReview", Object.fromEntries(new FormData(form)), QSApi.token());
      form.reset();
      status.textContent = "Thank you. Your review is pending approval.";
    } catch (error) { status.textContent = error.message; status.classList.add("error"); }
  });
})();
