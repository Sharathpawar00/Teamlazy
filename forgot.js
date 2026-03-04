const $ = (s) => document.querySelector(s);
async function send() {
  const email = ($("#fpEmail").value || "").trim();
  if (!email) {
    $("#fpMsg").textContent = "Please enter your email.";
    return;
  }
  try {
    const res = await fetch("/api/password-reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      $("#fpMsg").textContent = "If the email exists, a reset link was sent.";
      return;
    }
  } catch (e) {}
  $("#fpMsg").textContent = "Unable to send request. Try again later.";
}
document.addEventListener("DOMContentLoaded", () => {
  $("#sendReset").addEventListener("click", send);
  $("#fpEmail").addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
});
