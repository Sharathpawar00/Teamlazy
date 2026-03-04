const $ = (s) => document.querySelector(s);
function alreadyLoggedIn() {
  const p = localStorage.getItem("ff_logged_in");
  const s = sessionStorage.getItem("ff_logged_in");
  return p === "true" || s === "true";
}
function go() {
  window.location.href = "finance.html";
}
function submit() {
  const u = $("#authUser").value.trim();
  const p = $("#authPass").value.trim();
  const r = $("#rememberMe").checked;
  if (!u || !p) return;
  const user = { id: Math.random().toString(36).slice(2), name: u };
  localStorage.setItem("ff_user", JSON.stringify(user));
  if (r) localStorage.setItem("ff_logged_in", "true");
  else sessionStorage.setItem("ff_logged_in", "true");
  go();
}
document.addEventListener("DOMContentLoaded", () => {
  if (alreadyLoggedIn()) go();
  $("#doLogin").addEventListener("click", submit);
  $("#authPass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
  initTicker();
  initCopilot();
});
function initTicker() {
  const el = document.getElementById("globalTicker");
  if (!el) return;
  const arr = [{ s: "AAPL", p: 189.4, ch: 1.2 }, { s: "TSLA", p: 204.6, ch: -0.5 }, { s: "BTC", p: 58500, ch: -0.8 }, { s: "RELIANCE", p: 2450, ch: 0.4 }];
  const render = () => {
    arr.forEach((t) => { t.ch += (Math.random() - 0.5) * 0.4; t.p += (Math.random() - 0.5) * (t.p * 0.005); });
    const s = arr.map((t) => {
      const up = t.ch >= 0;
      const color = up ? "var(--success)" : "var(--danger)";
      const icon = up ? "🟩" : "🟥";
      return `<span style="margin-right:24px;color:${color}">${t.s} ${t.p.toFixed(2)} ${up?"+":""}${t.ch.toFixed(2)}% ${icon}</span>`;
    }).join("");
    el.innerHTML = s + " " + s;
  };
  render();
  setInterval(render, 4000);
}
function initCopilot() {
  const fab = document.getElementById("aiFab");
  const cp = document.getElementById("aiCopilot");
  const body = document.getElementById("aiBody");
  const input = document.getElementById("aiInput");
  const send = document.getElementById("aiSend");
  const close = document.getElementById("aiClose");
  if (!fab || !cp) return;
  const push = (txt) => { const div = document.createElement("div"); div.className = "copilot-msg"; div.textContent = txt; body.appendChild(div); body.scrollTop = body.scrollHeight; };
  const think = () => { const d = document.createElement("div"); d.className = "copilot-msg shimmer"; d.textContent = "AI is thinking..."; body.appendChild(d); return d; };
  fab.addEventListener("click", () => { cp.classList.remove("hidden"); });
  close.addEventListener("click", () => { cp.classList.add("hidden"); });
  send.addEventListener("click", () => {
    const q = (input.value || "").trim();
    if (!q) return;
    push("You: " + q);
    const t = think();
    setTimeout(() => { t.remove(); push("AI: If you forgot your password, use 'Forgot password' or contact support. I can also help you assess your DTI after login."); }, 900);
    input.value = "";
  });
}
