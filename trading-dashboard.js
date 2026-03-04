const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const Demo = { ticker: [{ s: "AAPL", p: 189.4, ch: 1.2 }, { s: "TSLA", p: 204.6, ch: -0.5 }, { s: "BTC", p: 58500, ch: -0.8 }, { s: "RELIANCE", p: 2450, ch: 0.4 }, { s: "TCS", p: 3595, ch: -0.3 }] };
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
function initTicker() {
  const el = document.getElementById("globalTicker");
  if (!el) return;
  const render = () => {
    Demo.ticker.forEach((t) => { t.ch += (Math.random() - 0.5) * 0.4; t.p += (Math.random() - 0.5) * (t.p * 0.005); });
    const s = Demo.ticker.map((t) => {
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
function fillStats() {
  const pv = 125000 + Math.round(Math.random() * 50000);
  const pnl = Math.round((Math.random() - 0.5) * 5000);
  const orders = 200 + Math.round(Math.random() * 80);
  const cash = 25000 + Math.round(Math.random() * 15000);
  $("#tdStat1").textContent = `₹${fmt(pv)}`;
  $("#tdStat2").textContent = `₹${fmt(pnl)}`;
  $("#tdStat3").textContent = `${orders}`;
  $("#tdStat4").textContent = `₹${fmt(cash)}`;
  $("#tdPortfolioValue").textContent = `₹${fmt(pv)}`;
}
function drawBalanceTrend() {
  const c = $("#tdBalanceTrend");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  const pts = Array.from({ length: 24 }, () => 100 + Math.round((Math.random() - 0.3) * 15));
  const w = c.width, h = c.height;
  const max = Math.max(...pts), min = Math.min(...pts);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((v, i) => {
    const x = (i / (pts.length - 1)) * (w - 20) + 10;
    const y = h - 10 - ((v - min) / Math.max(1, max - min)) * (h - 20);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
function drawStatsChart() {
  const c = $("#tdStatsChart");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  const barsA = Array.from({ length: 6 }, () => 40 + Math.round(Math.random() * 60));
  const barsB = Array.from({ length: 6 }, () => 20 + Math.round(Math.random() * 40));
  const w = c.width, h = c.height;
  const bw = Math.floor((w - 40) / barsA.length);
  barsA.forEach((v, i) => {
    const x = 20 + i * bw;
    const bhA = Math.round((v / 100) * (h - 30));
    const bhB = Math.round((barsB[i] / 100) * (h - 30));
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(x, h - bhA - 10, bw - 14, bhA);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(x + 6, h - bhB - 10, bw - 14, bhB);
  });
}
function fillTxns() {
  const el = $("#tdTxns");
  el.innerHTML = "";
  const txns = [
    { n: "Order #2481", a: 4678.59, s: "Completed" },
    { n: "HSI Express", a: 89.00, s: "Pending" },
    { n: "Investments Bank", a: 13487.69, s: "Completed" },
    { n: "AmadeaLife Inc", a: 2078.69, s: "Failed" },
    { n: "Dividend Credit", a: 356.75, s: "Completed" },
  ];
  txns.forEach((t) => {
    const row = document.createElement("div");
    row.className = "td-row3";
    row.innerHTML = `<div>${t.n}</div><div>₹${fmt(t.a)}</div><div>${t.s}</div>`;
    el.appendChild(row);
  });
}
function fillBalanceDetails() {
  const el = $("#tdBalanceDetails");
  el.innerHTML = "";
  [
    { k: "Reserve", v: 221478 },
    { k: "Cash Limit", v: 14849 },
    { k: "Exposure", v: 14849 },
    { k: "Charges", v: 256.25 },
    { k: "Dues", v: 365.47 },
  ].forEach((x) => {
    const item = document.createElement("div");
    item.className = "td-item";
    item.innerHTML = `<div>${x.k}</div><div>₹${fmt(x.v)}</div>`;
    el.appendChild(item);
  });
}
function fillActivity() {
  const el = $("#tdActivity");
  el.innerHTML = "";
  [
    { k: "Orders", v: 287 },
    { k: "Deposits", v: 312 },
    { k: "Withdrawals", v: 176 },
  ].forEach((x) => {
    const item = document.createElement("div");
    item.className = "td-item";
    item.innerHTML = `<div>${x.k}</div><div>${x.v}</div>`;
    el.appendChild(item);
  });
}
function fillHoldings() {
  const el = $("#tdHoldings");
  el.innerHTML = "";
  const rows = [
    { s: "INFY", q: 12, avg: 1610, ltp: 1645 },
    { s: "TCS", q: 6, avg: 3600, ltp: 3575 },
    { s: "HDFCBANK", q: 8, avg: 1520, ltp: 1555 },
    { s: "RELIANCE", q: 5, avg: 2650, ltp: 2710 },
  ];
  rows.forEach((r) => {
    const pnl = Math.round((r.ltp - r.avg) * r.q);
    const div = document.createElement("div");
    div.className = "td-row";
    div.innerHTML = `<div>${r.s}</div><div>${r.q}</div><div>₹${fmt(r.avg)}</div><div>₹${fmt(r.ltp)}</div><div>${pnl >= 0 ? "+" : ""}₹${fmt(pnl)}</div>`;
    el.appendChild(div);
  });
}
function fillWatchlist() {
  const wl = $("#tdWatchlist");
  wl.innerHTML = "";
  ["NIFTY", "BANKNIFTY", "SENSEX", "GOLD", "CRUDE"].forEach((s) => {
    const ch = Math.round((Math.random() - 0.5) * 2 * 100) / 100;
    const item = document.createElement("div");
    item.className = "td-item";
    const sentiment = Math.round(60 + (Math.random() - 0.5) * 30);
    item.innerHTML = `<div>${s} <span class="badge">${sentiment}% ${sentiment>60?"Bullish":"Watch"}</span></div><div style="color:${ch>=0?"var(--success)":"var(--danger)"}">${ch}%</div>`;
    wl.appendChild(item);
  });
}
function fillMovers() {
  const mv = $("#tdMovers");
  mv.innerHTML = "";
  ["ITC", "SBIN", "ADANIPORTS", "TATASTEEL", "AXISBANK"].forEach((s) => {
    const ch = Math.round((Math.random() - 0.5) * 4 * 100) / 100;
    const item = document.createElement("div");
    item.className = "td-item";
    const sentiment = Math.round(60 + (Math.random() - 0.5) * 30);
    item.innerHTML = `<div>${s} <span class="badge">${sentiment}% ${sentiment>60?"Bullish":"Watch"}</span></div><div style="color:${ch>=0?"var(--success)":"var(--danger)"}">${ch}%</div>`;
    mv.appendChild(item);
  });
}
function fillSignals() {
  const el = $("#tdSignals");
  el.innerHTML = "";
  const arr = [
    { s: "INFY", a: "Buy", r: "Breakout above 1650" },
    { s: "TCS", a: "Hold", r: "Range-bound, wait" },
    { s: "RELIANCE", a: "Sell", r: "RSI overbought" },
  ];
  arr.forEach((x) => {
    const item = document.createElement("div");
    item.className = "td-item";
    item.innerHTML = `<div>${x.s} • ${x.a}</div><div>${x.r}</div>`;
    el.appendChild(item);
  });
}
function fillNews() {
  const el = $("#tdNews");
  el.innerHTML = "";
  ["Markets close higher led by IT", "RBI policy review hints at steady rates", "Crude slips on demand concerns"].forEach((t) => {
    const item = document.createElement("div");
    item.className = "td-item";
    item.innerHTML = `<div>${t}</div><div><a href="finance-news.html" target="_blank">Open</a></div>`;
    el.appendChild(item);
  });
}
function bindUI() {
  $$("#tdSidebar .td-nav button").forEach((b) => {
    b.addEventListener("click", () => {
      $$("#tdSidebar .td-nav button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const v = b.getAttribute("data-view");
      $$(".td-view").forEach((s) => s.classList.add("hidden"));
      $(`#view-${v}`).classList.remove("hidden");
    });
  });
  $("#tdProfileBtn").addEventListener("click", () => {
    $("#tdProfileMenu").classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!$("#tdProfileMenu").contains(e.target) && !$("#tdProfileBtn").contains(e.target)) {
      $("#tdProfileMenu").classList.add("hidden");
    }
  });
  $("#tdLogout").addEventListener("click", () => {
    localStorage.removeItem("ff_logged_in");
    sessionStorage.removeItem("ff_logged_in");
    localStorage.removeItem("ff_user");
    window.location.href = "login.html";
  });
  $("#tdMenuToggle").addEventListener("click", () => {
    $("#tdSidebar").classList.toggle("open");
  });
  $("#tdClear").addEventListener("click", () => {
    ["ff_profile", "ff_debts", "ff_assets", "ff_goals", "ff_news"].forEach((k) => localStorage.removeItem(k));
  });
  $("#tdSearch").addEventListener("input", () => {
    const q = $("#tdSearch").value.toLowerCase();
    $$("#tdTxns .td-row3").forEach((r) => {
      const t = r.children[0].textContent.toLowerCase();
      r.style.display = t.includes(q) ? "" : "none";
    });
  });
  const back = document.getElementById("tdBack");
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
  const sel = document.getElementById("tdTemplate");
  if (sel) sel.addEventListener("change", () => {
    document.body.classList.remove("template-pro","template-news");
    if (sel.value === "pro") document.body.classList.add("template-pro");
    if (sel.value === "news") document.body.classList.add("template-news");
  });
  const analyze = document.getElementById("tdAnalyzeBalance");
  if (analyze) analyze.addEventListener("click", () => {
    const pvTxt = document.getElementById("tdPortfolioValue").textContent.replace(/[^\d]/g,"");
    const pv = parseFloat(pvTxt) || 0;
    openModal("Balance Analysis", "AI notes steady growth. Consider allocating higher to momentum names with strict risk.", Array.from({ length: 12 }, (_, i) => pv*0.8 + i*pv*0.02));
  });
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
  const ctx = () => "trading";
  fab.addEventListener("click", () => { cp.classList.remove("hidden"); });
  close.addEventListener("click", () => { cp.classList.add("hidden"); });
  send.addEventListener("click", () => {
    const q = (input.value || "").trim();
    if (!q) return;
    push("You: " + q);
    const t = think();
    setTimeout(() => { t.remove(); push("AI: Monitoring order flow and momentum. Consider scaling entries with tight stops."); }, 900);
    input.value = "";
  });
}
function initOrderBook() {
  const el = document.getElementById("tdOrderBook");
  if (!el) return;
  const render = () => {
    el.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      const side = Math.random() > 0.5 ? "Buy" : "Sell";
      const qty = 1 + Math.round(Math.random() * 9);
      const price = 2400 + Math.round((Math.random() - 0.5) * 40);
      const row = document.createElement("div");
      row.className = "td-ob-row";
      row.innerHTML = `<div style="color:${side==="Buy"?"var(--success)":"var(--danger)"}">${side}</div><div>${qty}</div><div>₹${price}</div>`;
      el.appendChild(row);
    }
  };
  render();
  setInterval(render, 1000);
}
function initAutoTrader() {
  const t = document.getElementById("tdTerminal");
  const toggle = document.getElementById("tdAutoToggle");
  let timer = null;
  const symbols = ["NSE:RELIANCE","NSE:TCS","NSE:INFY","NSE:HDFCBANK","NASDAQ:AAPL","NASDAQ:TSLA"];
  const log = (x) => { const line = document.createElement("div"); line.textContent = x; t.appendChild(line); t.scrollTop = t.scrollHeight; };
  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      log("AI Auto-Trading enabled");
      timer = setInterval(() => {
        const s = symbols[Math.floor(Math.random()*symbols.length)];
        const act = Math.random()>0.5 ? "Buy" : "Sell";
        const px = 1000 + Math.round(Math.random()*2000);
        log(`Analyzing ${s}... Pattern found... Executing ${act} at ₹${px}`);
      }, 1500);
    } else {
      log("AI Auto-Trading disabled");
      clearInterval(timer);
    }
  });
}
function renderMiniNews() {
  const box = document.getElementById("tdMiniNews");
  if (!box) return;
  const items = ["Indices firm led by IT","Banks steady post policy","Energy softens; FMCG resilient"];
  let idx = 0;
  const render = () => {
    const t = items[idx % items.length];
    box.innerHTML = "";
    const row = document.createElement("div");
    row.className = "mini-news-item";
    row.innerHTML = `<div class="mini-news-title">${t}</div><div><span class="badge">Trending</span></div>`;
    box.appendChild(row);
    idx++;
  };
  render();
  setInterval(render, 4000);
}
function openModal(title, text, series) {
  let ov = document.getElementById("modalOverlay");
  if (!ov) {
    const div = document.createElement("div");
    div.id = "modalOverlay";
    div.className = "modal-overlay";
    div.innerHTML = `<div class="modal"><div class="modal-head"><div id="modalTitle"></div><button id="modalClose" class="modal-close">Close</button></div><div id="modalBody"></div><canvas id="modalChart" width="520" height="220"></canvas></div>`;
    document.body.appendChild(div);
    ov = div;
  }
  const mt = document.getElementById("modalTitle");
  const mb = document.getElementById("modalBody");
  mt.textContent = title || "";
  mb.textContent = text || "";
  ov.style.display = "flex";
  const c = document.getElementById("modalChart").getContext("2d");
  try {
    new Chart(c, { type: "line", data: { labels: series.map((_, i) => i + 1), datasets: [{ label: title, data: series, borderColor: "#00E5FF", tension: 0.3 }] } });
  } catch {}
  document.getElementById("modalClose").onclick = () => { ov.style.display = "none"; };
  ov.addEventListener("click", (e) => { if (e.target === ov) ov.style.display = "none"; });
}
document.addEventListener("DOMContentLoaded", () => {
  if (!ensureAuth()) return;
  bindUI();
  initTicker();
  initCopilot();
  fillStats();
  drawBalanceTrend();
  drawStatsChart();
  fillHoldings();
  fillWatchlist();
  fillMovers();
  fillSignals();
  fillNews();
  fillTxns();
  fillBalanceDetails();
  fillActivity();
  initOrderBook();
  initAutoTrader();
  renderMiniNews();
});
