const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function ensureAuth() {
  const p = localStorage.getItem("ff_logged_in");
  const s = sessionStorage.getItem("ff_logged_in");
  if (p !== "true" && s !== "true") {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
function fmt(n) { return n.toLocaleString("en-IN"); }
function bindNav() {
  $$(".dx-nav button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".dx-nav button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const v = b.getAttribute("data-view");
      $$(".dx-view").forEach((s) => s.classList.add("hidden"));
      $(`#view-${v}`).classList.remove("hidden");
    });
  });
  $("#dxLogout").addEventListener("click", () => {
    localStorage.removeItem("ff_logged_in");
    sessionStorage.removeItem("ff_logged_in");
    localStorage.removeItem("ff_user");
    window.location.href = "login.html";
  });
  $("#dxClear").addEventListener("click", () => {
    ["ff_profile", "ff_debts", "ff_assets", "ff_goals", "ff_news"].forEach((k) => localStorage.removeItem(k));
  });
}
function advise() {
  const income = parseFloat($("#dxIncome").value) || 0;
  const expenses = parseFloat($("#dxExpenses").value) || 0;
  const savings = parseFloat($("#dxSavings").value) || 0;
  const risk = $("#dxRisk").value;
  const exp = $("#dxExp").value;
  const surplus = Math.max(0, income - expenses) + Math.max(0, savings * 0.2);
  const monthsEF = risk === "Low" ? 6 : risk === "Medium" ? 4 : 3;
  const efNeed = Math.round((expenses || 0) * monthsEF);
  const base = risk === "Low"
    ? { large: 0.35, mid: 0.10, index: 0.30, sip: 0.20, swing: 0.05 }
    : risk === "High"
    ? { large: 0.20, mid: 0.25, index: 0.15, sip: 0.15, swing: 0.25 }
    : { large: 0.28, mid: 0.18, index: 0.22, sip: 0.18, swing: 0.14 };
  const adj = exp === "Beginner" ? 0.8 : exp === "Pro" ? 1.1 : 1;
  const returns = { large: 0.10, mid: 0.14, index: 0.09, sip: 0.12, swing: 0.18 };
  const keys = Object.keys(base);
  const alloc = {};
  keys.forEach((k) => { alloc[k] = Math.round(base[k] * 100); });
  const expected = Math.round(keys.reduce((a, k) => a + base[k] * returns[k], 0) * 100 * adj) / 100;
  $("#dxSurplus").textContent = `₹${fmt(Math.round(surplus))}`;
  $("#dxExpected").textContent = `${Math.round(expected * 100)}%`;
  $("#dxEmergencyNeed").textContent = `₹${fmt(efNeed)}`;
  renderAlloc(alloc, surplus);
  const divScore = diversificationScore(alloc);
  $("#dxDivScore").textContent = `${divScore}`;
  const note = riskExplain(risk, exp);
  $("#dxRiskExplain").textContent = note;
}
function renderAlloc(alloc, surplus) {
  const bars = $("#dxAllocBars");
  bars.innerHTML = "";
  const map = { large: "Large cap", mid: "Mid cap", index: "Index ETF", sip: "SIP", swing: "Swing trading" };
  Object.entries(alloc).forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "dx-bar";
    const fill = document.createElement("div");
    fill.className = "dx-bar-fill";
    fill.style.width = `${v}%`;
    row.appendChild(fill);
    const label = document.createElement("div");
    label.className = "dx-item";
    const amt = Math.round((surplus * v) / 100);
    label.innerHTML = `<div>${map[k]} • ${v}%</div><div>₹${fmt(amt)}</div>`;
    bars.appendChild(row);
    bars.appendChild(label);
  });
  const list = $("#dxAllocTable");
  list.innerHTML = "";
  Object.entries(alloc).forEach(([k, v]) => {
    const item = document.createElement("div");
    item.className = "dx-item";
    item.innerHTML = `<div>${map[k]}</div><div>${v}%</div>`;
    list.appendChild(item);
  });
}
function diversificationScore(alloc) {
  const arr = Object.values(alloc).map((p) => p / 100);
  const H = -arr.reduce((a, p) => a + (p > 0 ? p * Math.log(p) : 0), 0);
  const maxH = Math.log(arr.length);
  return Math.round((H / maxH) * 100);
}
function riskExplain(risk, exp) {
  const r = risk === "Low" ? "Capital preservation and steady growth focus." : risk === "High" ? "Aggressive growth with higher drawdown tolerance." : "Balanced growth with moderate drawdowns.";
  const e = exp === "Beginner" ? "Limit swing trades and prefer ETFs/SIPs." : exp === "Pro" ? "Higher swing allocation allowed with tighter risk control." : "Use measured exposure and avoid over-trading.";
  return `${r} ${e}`;
}
function bindBreadcrumbs() {
  const back = document.getElementById("dxBack");
  const crumbs = document.getElementById("dxCrumbs");
  if (back) {
    let clickTimer = null;
    back.addEventListener("click", () => {
      clickTimer = setTimeout(() => { history.back(); clickTimer = null; }, 250);
    });
    back.addEventListener("dblclick", () => {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      window.location.href = "finance.html";
    });
  }
  $$(".dx-nav button").forEach((b) => {
    b.addEventListener("click", () => {
      const v = b.getAttribute("data-view");
      crumbs.textContent = `Investor / ${v.replace("-", " ")}`;
    });
  });
}
function bindTemplateSwitcher() {
  const sel = document.getElementById("dxTemplate");
  if (!sel) return;
  sel.addEventListener("change", () => {
    document.body.classList.remove("template-pro","template-news");
    if (sel.value === "pro") document.body.classList.add("template-pro");
    if (sel.value === "news") document.body.classList.add("template-news");
  });
}
function renderMiniNews() {
  const box = document.getElementById("dxMiniNews");
  if (!box) return;
  const items = ["Markets edge higher led by IT","Banking supports rally; energy soft","Macro stable; volatility moderate"].map((t,i)=>({t, s:["Bullish","Neutral","Watch"][i]}));
  let idx = 0;
  const render = () => {
    const n = items[idx % items.length];
    box.innerHTML = "";
    const row = document.createElement("div");
    row.className = "mini-news-item";
    row.innerHTML = `<div class="mini-news-title">${n.t}</div><div><span class="badge">${n.s}</span></div>`;
    box.appendChild(row);
    idx++;
  };
  render();
  setInterval(render, 4000);
}
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
    setTimeout(() => { t.remove(); push("AI: Based on your surplus and risk, tilt toward Index ETFs and quality large caps. Keep emergency ≥ 3 months."); }, 900);
    input.value = "";
  });
}
function bindAdvisorSummaries() {
  const btn = document.getElementById("dxAdvSummary");
  const out = document.getElementById("dxAdvOut");
  if (btn && out) {
    btn.addEventListener("click", () => {
      out.textContent = "AI is analyzing...";
      setTimeout(() => {
        const income = parseFloat($("#dxIncome").value) || 0;
        const expenses = parseFloat($("#dxExpenses").value) || 0;
        const savings = parseFloat($("#dxSavings").value) || 0;
        const surplus = Math.max(0, income - expenses);
        out.textContent = `Surplus ≈ ₹${fmt(Math.round(surplus))}. Suggest SIP ≈ ₹${fmt(Math.round(surplus*0.15))} with tilt toward Index and Large Cap.`;
      }, 1000);
    });
  }
  const pbtn = document.getElementById("dxPortSummary");
  const pout = document.getElementById("dxPortOut");
  if (pbtn && pout) {
    pbtn.addEventListener("click", () => {
      pout.textContent = "AI is analyzing portfolio...";
      setTimeout(() => { pout.textContent = "Banking and IT appear dominant. Add FMCG or Energy for balance."; }, 1000);
    });
  }
}
function aiPick() {
  const symbols = ["INFY", "RELIANCE", "TCS", "HDFCBANK", "SBIN", "ADANIPORTS"];
  const s = symbols[Math.floor(Math.random() * symbols.length)];
  const price = 1000 + Math.round(Math.random() * 1500);
  const rsi = 35 + Math.round(Math.random() * 30);
  const ma50 = price + Math.round((Math.random() - 0.5) * 40);
  const ma200 = price + Math.round((Math.random() - 0.5) * 80);
  const volStrength = 40 + Math.round(Math.random() * 60);
  const volPct = 1 + Math.round(Math.random() * 4);
  const trendUp = ma50 > ma200;
  const signal = (trendUp && rsi >= 45 && rsi <= 65) ? "BUY" : (!trendUp && rsi > 60 ? "SELL" : "HOLD");
  const entry = price;
  const stop = signal === "BUY" ? Math.round(entry * (1 - volPct / 100)) : Math.round(entry * (1 + volPct / 100));
  const target = signal === "BUY" ? Math.round(entry * (1 + (volPct * 1.6) / 100)) : Math.round(entry * (1 - (volPct * 1.6) / 100));
  const rr = Math.abs((target - entry) / Math.max(1, entry - stop));
  const conf = Math.round((trendUp ? 60 : 40) + (volStrength / 4));
  $("#dxPickHeader").innerHTML = `${s} • ₹${fmt(entry)} • ${signal} • Confidence ${Math.min(95, conf)}%`;
  const tech = $("#dxTech");
  tech.innerHTML = "";
  [
    ["RSI", `${rsi}`],
    ["MA50", `₹${fmt(ma50)}`],
    ["MA200", `₹${fmt(ma200)}`],
    ["Volume strength", `${volStrength}`],
    ["Trend", trendUp ? "Up" : "Down"],
    ["Volatility", `${volPct}%`],
  ].forEach(([k, v]) => {
    const item = document.createElement("div");
    item.className = "dx-item";
    item.innerHTML = `<div>${k}</div><div>${v}</div>`;
    tech.appendChild(item);
  });
  const sig = $("#dxSignal");
  sig.innerHTML = "";
  [
    ["Entry", `₹${fmt(entry)}`],
    ["Target", `₹${fmt(target)}`],
    ["Stop loss", `₹${fmt(stop)}`],
    ["Risk-Reward", `${rr.toFixed(2)}x`],
    ["Suggested holding", `${trendUp ? 10 : 5} days`],
  ].forEach(([k, v]) => {
    const item = document.createElement("div");
    item.className = "dx-item";
    item.innerHTML = `<div>${k}</div><div>${v}</div>`;
    sig.appendChild(item);
  });
  $("#dxCapital").value = $("#dxCapital").value || "100000";
  $("#dxStopDist").value = $("#dxStopDist").value || `${Math.abs(entry - stop)}`;
  return { entry, stop, target };
}
function buildPlan(ctx) {
  const capital = parseFloat($("#dxCapital").value) || 0;
  const riskPct = Math.min(10, Math.max(0.5, parseFloat($("#dxRiskPct").value) || 2));
  const stopDist = Math.max(0.5, parseFloat($("#dxStopDist").value) || Math.abs(ctx.entry - ctx.stop));
  const riskAmt = Math.round((capital * riskPct) / 100);
  const qty = Math.max(1, Math.floor(riskAmt / stopDist));
  const rr = Math.abs((ctx.target - ctx.entry) / stopDist);
  const plan = $("#dxPlan");
  plan.innerHTML = "";
  [
    ["Risk per trade", `₹${fmt(riskAmt)} (${riskPct}%)`],
    ["Position size", `${qty} shares`],
    ["Entry", `₹${fmt(ctx.entry)}`],
    ["Stoploss", `₹${fmt(ctx.entry - stopDist)}`],
    ["Target 1", `₹${fmt(Math.round(ctx.entry + stopDist * rr))}`],
    ["Target 2", `₹${fmt(Math.round(ctx.entry + stopDist * rr * 1.6))}`],
    ["Risk/Reward", `${rr.toFixed(2)}x`],
  ].forEach(([k, v]) => {
    const item = document.createElement("div");
    item.className = "dx-item";
    item.innerHTML = `<div>${k}</div><div>${v}</div>`;
    plan.appendChild(item);
  });
}
function portfolioAnalysis() {
  const holdings = [
    { s: "INFY", sector: "IT", w: 0.22, vol: 0.18 },
    { s: "HDFCBANK", sector: "Banking", w: 0.18, vol: 0.16 },
    { s: "RELIANCE", sector: "Energy", w: 0.20, vol: 0.20 },
    { s: "ITC", sector: "FMCG", w: 0.15, vol: 0.14 },
    { s: "TATASTEEL", sector: "Metal", w: 0.10, vol: 0.22 },
    { s: "SBIN", sector: "Banking", w: 0.15, vol: 0.19 },
  ];
  const sectors = {};
  holdings.forEach((h) => { sectors[h.sector] = (sectors[h.sector] || 0) + h.w; });
  const conc = Math.max(...Object.values(sectors));
  const divScore = Math.round((1 - conc) * 100);
  const volRating = Math.round(holdings.reduce((a, h) => a + h.vol * h.w, 0) * 100);
  const riskMeter = Math.round((conc * 50) + (volRating * 0.5));
  const sum = $("#dxPortfolioSummary");
  sum.innerHTML = `
    <div class="dx-kpi"><div class="dx-kpi-title">Diversification</div><div class="dx-kpi-num">${divScore}</div></div>
    <div class="dx-kpi"><div class="dx-kpi-title">Sector concentration</div><div class="dx-kpi-num">${Math.round(conc * 100)}%</div></div>
    <div class="dx-kpi"><div class="dx-kpi-title">Volatility rating</div><div class="dx-kpi-num">${volRating}</div></div>
    <div class="dx-kpi"><div class="dx-kpi-title">Risk meter</div><div class="dx-kpi-num">${riskMeter}/100</div></div>
  `;
  const secList = $("#dxPortfolioSectors");
  secList.innerHTML = "";
  Object.entries(sectors).forEach(([k, v]) => {
    const item = document.createElement("div");
    item.className = "dx-item";
    item.innerHTML = `<div>${k}</div><div>${Math.round(v * 100)}%</div>`;
    secList.appendChild(item);
  });
  const adv = $("#dxPortfolioAdvice");
  adv.innerHTML = "";
  const tips = [];
  if (conc > 0.35) tips.push("Reduce exposure to the dominant sector.");
  if (volRating > 18) tips.push("Add low-volatility ETFs to stabilize returns.");
  if (divScore < 60) tips.push("Increase number of sectors for better diversification.");
  if (!tips.length) tips.push("Portfolio is balanced; maintain periodic rebalancing.");
  tips.forEach((t) => {
    const item = document.createElement("div");
    item.className = "dx-item";
    item.innerHTML = `<div>${t}</div><div></div>`;
    adv.appendChild(item);
  });
}
function renderProfile() {
  const u = (() => { try { return JSON.parse(localStorage.getItem("ff_user") || "{}"); } catch { return {}; } })();
  const pSession = localStorage.getItem("ff_logged_in") === "true";
  const sSession = sessionStorage.getItem("ff_logged_in") === "true";
  $("#dxUserName").textContent = u.name || "Unknown";
  $("#dxSessionType").textContent = pSession ? "Remembered (Local)" : sSession ? "Session" : "Unknown";
  const fp = (() => { try { return JSON.parse(localStorage.getItem("ff_profile") || "{}"); } catch { return {}; } })();
  $("#dxSnapIncome").textContent = `₹${fmt(fp.income || 0)}`;
  $("#dxSnapExpenses").textContent = `₹${fmt(fp.expenses || 0)}`;
  $("#dxSnapSavings").textContent = `₹${fmt(fp.savings || 0)}`;
  $("#dxSnapEmergency").textContent = `₹${fmt(fp.emergency || 0)}`;
}
document.addEventListener("DOMContentLoaded", () => {
  if (!ensureAuth()) return;
  bindNav();
  initTicker();
  initCopilot();
  bindBreadcrumbs();
  bindTemplateSwitcher();
  renderMiniNews();
  $("#dxAdvise").addEventListener("click", advise);
  const pickCtx = aiPick();
  $("#dxBuildPlan").addEventListener("click", () => buildPlan(pickCtx));
  portfolioAnalysis();
  renderProfile();
  const syncBtn = document.getElementById("dxSyncFinance");
  if (syncBtn) syncBtn.addEventListener("click", renderProfile);
  bindAdvisorSummaries();
});
