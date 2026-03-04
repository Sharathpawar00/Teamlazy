const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmt = (n) => (n < 10 ? `0${n}` : `${n}`);
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
const HackathonDemoData = {
  ticker: [
    { s: "AAPL", p: 189.4, ch: 1.2 },
    { s: "TSLA", p: 204.6, ch: -0.5 },
    { s: "BTC", p: 58500, ch: -0.8 },
    { s: "ETH", p: 3250, ch: 0.6 },
    { s: "RELIANCE", p: 2450, ch: 0.4 },
    { s: "TCS", p: 3595, ch: -0.3 },
  ],
};
const store = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};
const state = {
  profile: { income: 0, expenses: 0, savings: 0, emergency: 0 },
  debts: [],
  assets: [],
  goals: [],
  news: [],
};
function init() {
  const p = store.get("ff_profile", state.profile);
  const d = store.get("ff_debts", []);
  const a = store.get("ff_assets", []);
  const g = store.get("ff_goals", []);
  const n = store.get("ff_news", []);
  state.profile = p;
  state.debts = d;
  state.assets = a;
  state.goals = g;
  state.news = n;
  $("#income").value = p.income || "";
  $("#expenses").value = p.expenses || "";
  $("#savings").value = p.savings || "";
  $("#emergency").value = p.emergency || "";
  bindNav();
  bindActions();
  renderAll();
  initTicker();
  initCopilot();
  bindAISummaries();
  bindBreadcrumbs();
  bindTemplateSwitcher();
  initMiniNews();
}
function bindNav() {
  $$(".ff-nav button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".ff-nav button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const tab = b.getAttribute("data-tab");
      $$(".ff-tab").forEach((t) => t.classList.add("hidden"));
      $(`#tab-${tab}`).classList.remove("hidden");
    });
  });
}
function bindActions() {
  $("#saveProfile").addEventListener("click", () => {
    state.profile.income = parseFloat($("#income").value) || 0;
    state.profile.expenses = parseFloat($("#expenses").value) || 0;
    state.profile.savings = parseFloat($("#savings").value) || 0;
    state.profile.emergency = parseFloat($("#emergency").value) || 0;
    store.set("ff_profile", state.profile);
    renderDashboard();
  });
  ["income","expenses","savings","emergency"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        state.profile.income = parseFloat(document.getElementById("income").value) || 0;
        state.profile.expenses = parseFloat(document.getElementById("expenses").value) || 0;
        state.profile.savings = parseFloat(document.getElementById("savings").value) || 0;
        state.profile.emergency = parseFloat(document.getElementById("emergency").value) || 0;
        renderDashboard();
      });
    }
  });
  $("#recomputeScore").addEventListener("click", renderDashboard);
  $("#askAdvisor").addEventListener("click", askAdvisor);
  $("#evaluatePurchase").addEventListener("click", evaluatePurchase);
  $("#addDebt").addEventListener("click", addDebt);
  $("#strategySnowball").addEventListener("click", () => payoffStrategy("snowball"));
  $("#strategyAvalanche").addEventListener("click", () => payoffStrategy("avalanche"));
  $("#addAsset").addEventListener("click", addAsset);
  $("#runSim").addEventListener("click", runSimulation);
  $("#addGoal").addEventListener("click", addGoal);
  const rn = document.getElementById("refreshNews");
  const sl = document.getElementById("summarizeLatest");
  if (rn) rn.addEventListener("click", fetchNews);
  if (sl) sl.addEventListener("click", summarizeLatest);
  $("#clearData").addEventListener("click", clearData);
  const lo = document.getElementById("logout");
  if (lo) lo.addEventListener("click", logout);
}
function renderAll() {
  renderDashboard();
  renderDebts();
  renderAssets();
  renderGoals();
  renderNews();
  renderIntelligence();
  initCharts();
}
function healthScore() {
  const income = state.profile.income;
  const expenses = state.profile.expenses;
  const savings = state.profile.savings;
  const emergency = state.profile.emergency;
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  if (income <= 0) return { score: 0, status: "Unknown", breakdown: {} };
  const sr = clamp(savings / income, 0, 1);
  const er = clamp(expenses / income, 0, 1);
  const dti = clamp(totalEmi / income, 0, 1);
  const ecMonths = expenses > 0 ? emergency / expenses : 0;
  const srScore = Math.round(sr * 100);
  const erScore = Math.round((1 - er) * 100);
  const dtiScore = Math.round((1 - dti) * 100);
  const ecScore = Math.round(clamp(ecMonths / 6, 0, 1) * 100);
  const score = Math.round(srScore * 0.3 + erScore * 0.3 + dtiScore * 0.25 + ecScore * 0.15);
  const status = score >= 70 ? "Stable" : score >= 50 ? "Risk" : "Critical";
  return { score, status, breakdown: { srScore, erScore, dtiScore, ecScore } };
}
function renderDashboard() {
  const h = healthScore();
  $("#healthScore").textContent = h.score;
  $("#healthStatus").textContent = h.status;
  $("#healthBreakdown").textContent = `Savings ${h.breakdown.srScore}, Expenses ${h.breakdown.erScore}, DTI ${h.breakdown.dtiScore}, Emergency ${h.breakdown.ecScore}`;
  const alerts = [];
  const income = state.profile.income;
  const expenses = state.profile.expenses;
  const savings = state.profile.savings;
  const emergency = state.profile.emergency;
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  if (income > 0 && expenses / income > 0.85) alerts.push("Warning: Your spending is above 85% of your income.");
  if (income > 0 && savings / income < 0.1) alerts.push("Alert: Savings rate below 10%.");
  if (income > 0 && totalEmi / income > 0.4) alerts.push("Alert: Debt-to-Income exceeds 40%.");
  if (expenses > 0 && emergency / expenses < 2) alerts.push("Critical: Emergency fund covers less than 2 months.");
  const ul = $("#riskAlerts");
  ul.innerHTML = "";
  alerts.forEach((m) => {
    const li = document.createElement("div");
    li.className = "ff-item";
    li.innerHTML = `<div>${m}</div>`;
    ul.appendChild(li);
  });
  const totalAssets = state.assets.reduce((a, b) => a + (parseFloat(b.value) || 0), 0);
  const totalLiabilities = state.debts.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
  $("#totalAssets").textContent = `${totalAssets}`;
  $("#totalLiabilities").textContent = `${totalLiabilities}`;
  $("#netWorth").textContent = `${totalAssets - totalLiabilities}`;
  drawAssetChart();
}
function askAdvisor() {
  const q = $("#advisorQuestion").value.trim();
  const h = healthScore();
  const income = state.profile.income;
  const expenses = state.profile.expenses;
  const savings = state.profile.savings;
  const emergency = state.profile.emergency;
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  const er = income > 0 ? expenses / income : 0;
  const dti = income > 0 ? totalEmi / income : 0;
  const ec = expenses > 0 ? emergency / expenses : 0;
  let advice = `Financial Health Score: ${h.score}/100 (${h.status}). `;
  advice += `Expense Ratio: ${(er * 100).toFixed(0)}%. DTI: ${(dti * 100).toFixed(0)}%. Emergency Coverage: ${ec.toFixed(1)} months. `;
  if (/buy|purchase|phone|laptop|emi/i.test(q)) advice += `For purchases, ensure DTI ≤ 25% and emergency ≥ 3 months. If price ≤ 0.5× monthly savings, it is safer. `;
  if (/save|saving/i.test(q)) advice += `Increase savings rate toward 20%+ by trimming non-essentials and automating monthly transfers. `;
  if (/emi/i.test(q)) advice += `Keep EMI total under 25–35% of income; avoid new EMI if current DTI ≥ 35%. `;
  $("#advisorAnswer").textContent = advice;
}
function evaluatePurchase() {
  const name = $("#purchaseName").value.trim() || "Item";
  const price = parseFloat($("#purchasePrice").value) || 0;
  const income = state.profile.income;
  const expenses = state.profile.expenses;
  const savings = state.profile.savings;
  const emergency = state.profile.emergency;
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  const dti = income > 0 ? totalEmi / income : 0;
  const ecMonths = expenses > 0 ? emergency / expenses : 0;
  let rec = "Decline";
  if (price <= 0.5 * savings && dti <= 0.25 && ecMonths >= 3) rec = "Approve";
  else if (price <= savings || dti <= 0.35) rec = "Caution";
  const msg = `${name} ₹${price}: Recommendation: ${rec}. DTI ${(dti * 100).toFixed(0)}%, Emergency ${ecMonths.toFixed(1)} months.`;
  $("#purchaseResult").textContent = msg;
}
function addDebt() {
  const type = $("#debtType").value;
  const amount = parseFloat($("#debtAmount").value) || 0;
  const emi = parseFloat($("#debtEmi").value) || 0;
  const rate = parseFloat($("#debtRate").value) || 0;
  const debt = { id: Math.random().toString(36).slice(2), type, amount, emi, rate };
  state.debts.push(debt);
  store.set("ff_debts", state.debts);
  renderDebts();
  renderDashboard();
}
function renderDebts() {
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  const income = state.profile.income;
  const dti = income > 0 ? totalEmi / income : 0;
  $("#dtiValue").textContent = `${Math.round(dti * 100)}%`;
  $("#dtiRisk").textContent = dti < 0.25 ? "Safe" : dti < 0.4 ? "Moderate" : "High risk";
  const list = $("#debtList");
  list.innerHTML = "";
  state.debts.forEach((d) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${d.type}</strong> • Amount ₹${d.amount} • EMI ₹${d.emi} • Rate ${d.rate}%`;
    const right = document.createElement("div");
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      state.debts = state.debts.filter((x) => x.id !== d.id);
      store.set("ff_debts", state.debts);
      renderDebts();
      renderDashboard();
    });
    right.appendChild(del);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
}
function payoffStrategy(kind) {
  const debts = [...state.debts];
  let ordered = [];
  if (kind === "snowball") ordered = debts.sort((a, b) => a.amount - b.amount);
  else ordered = debts.sort((a, b) => b.rate - a.rate);
  const plan = ordered.map((d, i) => `${i + 1}. ${d.type} • Amount ₹${d.amount} • EMI ₹${d.emi} • Rate ${d.rate}%`).join("\n");
  $("#strategyOutput").textContent = plan || "No debts yet.";
}
function addAsset() {
  const category = $("#assetCategory").value;
  const name = $("#assetName").value.trim() || category;
  const value = parseFloat($("#assetValue").value) || 0;
  const asset = { id: Math.random().toString(36).slice(2), category, name, value };
  state.assets.push(asset);
  store.set("ff_assets", state.assets);
  renderAssets();
  renderDashboard();
}
function renderAssets() {
  const list = $("#assetList");
  list.innerHTML = "";
  state.assets.forEach((a) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${a.category}</strong> • ${a.name} • ₹${a.value}`;
    const right = document.createElement("div");
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      state.assets = state.assets.filter((x) => x.id !== a.id);
      store.set("ff_assets", state.assets);
      renderAssets();
      renderDashboard();
    });
    right.appendChild(del);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
}
function drawAssetChart() {
  const canvas = $("#assetChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const groups = {};
  state.assets.forEach((a) => {
    groups[a.category] = (groups[a.category] || 0) + (parseFloat(a.value) || 0);
  });
  const cats = Object.keys(groups);
  const values = cats.map((k) => groups[k]);
  const w = canvas.width;
  const h = canvas.height;
  const bw = Math.floor((w - 20) / (values.length || 1));
  values.forEach((v, i) => {
    const x = 10 + i * bw;
    const bh = Math.round(((v || 0) / Math.max(...values, 1)) * (h - 30));
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(x, h - bh - 10, bw - 8, bh);
    ctx.fillStyle = "#9aa3b2";
    ctx.font = "10px sans-serif";
    ctx.fillText(cats[i] || "", x + 4, h - 4);
  });
}
function openModal(title, text, series) {
  const ov = document.getElementById("modalOverlay");
  const mt = document.getElementById("modalTitle");
  const mb = document.getElementById("modalBody");
  mt.textContent = title || "";
  mb.textContent = text || "";
  ov.style.display = "flex";
  const c = document.getElementById("modalChart");
  if (c && window.Chart) {
    const ctx = c.getContext("2d");
    new Chart(ctx, { type: "line", data: { labels: series.map((_, i) => i + 1), datasets: [{ label: title, data: series, borderColor: "#00E5FF", tension: 0.3 }] }, options: { plugins: { legend: { labels: { color: "#E9EEF7" } } }, scales: { x: { ticks: { color: "#9AA6B2" } }, y: { ticks: { color: "#9AA6B2" }, grid: { color: "#1B2434" } } } } });
  }
  document.getElementById("modalClose").onclick = () => { ov.style.display = "none"; };
  ov.addEventListener("click", (e) => { if (e.target === ov) ov.style.display = "none"; });
}
function bindBreadcrumbs() {
  const back = document.getElementById("ffBack");
  const crumbs = document.getElementById("ffCrumbs");
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
  $$(".ff-nav button").forEach((b) => {
    b.addEventListener("click", () => {
      const tab = b.getAttribute("data-tab");
      crumbs.textContent = `Home / ${tab.charAt(0).toUpperCase()+tab.slice(1)}`;
    });
  });
  const analyze = document.getElementById("ffAnalyzeNet");
  if (analyze) analyze.addEventListener("click", () => {
    const nw = parseFloat($("#netWorth").textContent) || 0;
    const series = Array.from({ length: 12 }, (_, i) => Math.round(nw * 0.8 + i * (nw * 0.02)));
    openModal("Net Worth Analysis", "AI suggests building emergency to 3–6 months and increasing Index ETF allocation.", series);
  });
}
function bindTemplateSwitcher() {
  const sel = document.getElementById("ffTemplate");
  if (!sel) return;
  sel.addEventListener("change", () => {
    document.body.classList.remove("template-pro","template-news");
    if (sel.value === "pro") document.body.classList.add("template-pro");
    if (sel.value === "news") document.body.classList.add("template-news");
  });
}
function initMiniNews() {
  const box = document.getElementById("ffMiniNews");
  if (!box) return;
  const items = (state.news && state.news.length ? state.news : [
    { title: "Markets edge higher on strong earnings", content: "IT lifts indices, energy softens." },
    { title: "RBI holds rates; liquidity ample", content: "Policy continuity supports banks." },
    { title: "Oil slips; demand concerns", content: "Energy under pressure; FMCG steady." },
  ]).slice(0, 3);
  let idx = 0;
  const render = () => {
    const n = items[idx % items.length];
    box.innerHTML = "";
    const row = document.createElement("div");
    row.className = "mini-news-item";
    row.innerHTML = `<div class="mini-news-title">${n.title}</div><div>${n.content || ""}</div>`;
    box.appendChild(row);
    idx++;
  };
  render();
  setInterval(render, 4000);
}
function initCharts() {
  const simCanvas = document.getElementById("simChart");
  if (simCanvas && window.Chart) {
    const ctx = simCanvas.getContext("2d");
    const data = Array.from({ length: 12 }, (_, i) => i + 1);
    const base = data.map((i) => 10000 + i * 600);
    const ai = data.map((i) => 10000 + i * 700);
    new Chart(ctx, {
      type: "line",
      data: { labels: data, datasets: [
        { label: "Standard Trajectory", data: base, borderColor: "#888", tension: 0.3 },
        { label: "AI Optimized Trajectory", data: ai, borderColor: "#00E676", tension: 0.3 },
      ] },
      options: { plugins: { legend: { labels: { color: "#E9EEF7" } } }, scales: { x: { ticks: { color: "#9AA6B2" } }, y: { ticks: { color: "#9AA6B2" }, grid: { color: "#1B2434" } } } }
    });
  }
  const gCanvas = document.getElementById("goalsChart");
  if (gCanvas && window.Chart) {
    const ctx = gCanvas.getContext("2d");
    const data = Array.from({ length: 12 }, (_, i) => i + 1);
    const base = data.map((i) => i * 800);
    const ai = data.map((i) => i * 950);
    new Chart(ctx, {
      type: "line",
      data: { labels: data, datasets: [
        { label: "Standard Trajectory", data: base, borderColor: "#888", tension: 0.3 },
        { label: "AI Optimized Trajectory", data: ai, borderColor: "#00E5FF", tension: 0.3 },
      ] },
      options: { plugins: { legend: { labels: { color: "#E9EEF7" } } }, scales: { x: { ticks: { color: "#9AA6B2" } }, y: { ticks: { color: "#9AA6B2" }, grid: { color: "#1B2434" } } } }
    });
  }
}
function runSimulation() {
  const type = $("#simType").value;
  const amt = parseFloat($("#simAmount").value) || 0;
  const income = state.profile.income;
  const expenses = state.profile.expenses;
  const savings = state.profile.savings;
  const emergency = state.profile.emergency;
  let res = "";
  if (type === "Buy Item") {
    const ns = Math.max(0, savings - amt);
    const ne = Math.max(0, emergency - amt * 0.2);
    res = `After purchase: Savings ₹${ns}, Emergency ₹${ne}. Recommendation: keep emergency ≥ 3 months.`;
  } else if (type === "Increase Savings") {
    const ns = savings + amt;
    const sr = income > 0 ? Math.round((ns / income) * 100) : 0;
    res = `New savings: ₹${ns}. Savings rate ≈ ${sr}%`;
  } else {
    const nemi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0) + amt;
    const dti = income > 0 ? Math.round((nemi / income) * 100) : 0;
    res = `Adding debt: new DTI ≈ ${dti}%`;
  }
  $("#simResult").textContent = res;
}
function addGoal() {
  const title = $("#goalTitle").value.trim();
  const amount = parseFloat($("#goalAmount").value) || 0;
  const date = $("#goalDate").value;
  if (!title || !date) return;
  const goal = { id: Math.random().toString(36).slice(2), title, amount, date };
  state.goals.push(goal);
  store.set("ff_goals", state.goals);
  $("#goalTitle").value = "";
  $("#goalAmount").value = "";
  $("#goalDate").value = "";
  renderGoals();
}
function renderGoals() {
  const list = $("#goalList");
  list.innerHTML = "";
  state.goals.forEach((g) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const months = (() => {
      const now = new Date();
      const tgt = new Date(g.date);
      const diff = Math.max(0, Math.round((tgt - now) / 86400000 / 30));
      return diff || 1;
    })();
    const perMonth = Math.round((g.amount || 0) / months);
    const left = document.createElement("div");
    left.innerHTML = `<strong>${g.title}</strong> • Target ₹${g.amount} by ${g.date} • Save ≈ ₹${perMonth}/month`;
    const right = document.createElement("div");
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      state.goals = state.goals.filter((x) => x.id !== g.id);
      store.set("ff_goals", state.goals);
      renderGoals();
    });
    right.appendChild(del);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
}
function addNews() {
  const title = $("#newsTitle").value.trim();
  const content = $("#newsContent").value.trim();
  if (!title || !content) return;
  const item = { id: Math.random().toString(36).slice(2), title, content, published_at: new Date().toISOString() };
  state.news.push(item);
  store.set("ff_news", state.news);
  $("#newsTitle").value = "";
  $("#newsContent").value = "";
  renderNews();
}
function renderNews() {
  const list = $("#newsList");
  list.innerHTML = "";
  state.news.forEach((n) => {
    const { src, text } = parseNewsContent(n.content || n.summary || "");
    const row = document.createElement("div");
    row.className = "news-card";
    const thumb = document.createElement("div");
    thumb.className = "news-thumb";
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = n.title || "news image";
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = `<div class="news-placeholder"><i class="fa-solid fa-newspaper"></i></div>`;
    }
    const content = document.createElement("div");
    content.className = "news-content";
    const sent = analyzeSentiment(`${n.title} ${text}`);
    content.innerHTML = `
      <div class="news-title">${n.title || "Untitled"}</div>
      <div class="news-meta"><span class="badge ${sent==="Positive"?"pos":sent==="Negative"?"neg":""}">${sent}</span> <span class="badge">${(n.published_at||n.created||"").toString().slice(0,25)}</span></div>
      <div class="news-desc">${escapeHtml(text)}</div>
    `;
    const actions = document.createElement("div");
    actions.className = "news-actions";
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      state.news = state.news.filter((x) => x.id !== n.id);
      store.set("ff_news", state.news);
      renderNews();
    });
    actions.appendChild(del);
    row.appendChild(thumb);
    row.appendChild(content);
    row.appendChild(actions);
    list.appendChild(row);
  });
}
function summarizeLatest() {
  if (!state.news.length) {
    $("#newsList").innerHTML = `<div class="ff-item"><div>No news to summarize.</div></div>`;
    return;
  }
  const latest = state.news[state.news.length - 1];
  const text = (latest.content || latest.summary || "").toLowerCase();
  let summary = "";
  if (text.includes("repo")) summary += "Repo rate up may raise EMIs. ";
  if (text.includes("fuel") || text.includes("oil")) summary += "Fuel price rise can increase transport costs. ";
  if (text.includes("tax")) summary += "Tax changes may impact take-home income. ";
  if (text.includes("budget")) summary += "Budget adjustments may change allocations and subsidies. ";
  if (!summary) summary = "Potential impact: expenses or borrowing costs may change.";
  const row = document.createElement("div");
  row.className = "ff-item";
  row.innerHTML = `<div><strong>AI Summary:</strong> ${summary}</div>`;
  $("#newsList").prepend(row);
}

async function fetchNews() {
  const region = (document.getElementById("newsRegion") || { value: "india" }).value;
  const kwInput = document.getElementById("newsKeywords");
  const keywords = kwInput && kwInput.value ? kwInput.value.toLowerCase() : "budget,tax,rbi,inflation,fuel,emi,loan,stocks,mutual,crypto";
  try {
    const res = await fetch(`/api/news?region=${encodeURIComponent(region)}&keywords=${encodeURIComponent(keywords)}`);
    if (res.ok) {
      const data = await res.json();
      state.news = (data.items || []).map((i) => ({ id: i.id, title: i.title, content: i.summary || i.content, published_at: i.created }));
      store.set("ff_news", state.news);
      renderNews();
      return;
    }
  } catch (e) {}
  const fallbackSources = region === "india"
    ? [
        { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
        { name: "TOI Business", url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms" }
      ]
    : [
        { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
        { name: "MarketWatch", url: "https://feeds.feedburner.com/MarketWatch/topstories" }
      ];
  const items = [];
  for (const s of fallbackSources) {
    try {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(s.url)}`);
      if (!res.ok) continue;
      const xml = await res.text();
      parseRSS(xml).forEach((i) => {
        items.push({ id: i.id, title: i.title, content: i.content, published_at: i.created });
      });
    } catch (e) {}
  }
  state.news = items.slice(0, 20);
  store.set("ff_news", state.news);
  renderNews();
}

function parseRSS(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const getTag = (tag) => {
      const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
      const mm = r.exec(block);
      return mm ? mm[1].replace(/<!\\[CDATA\\[(.*?)\\]\\]>/g, "$1").trim() : "";
    };
    const title = getTag("title");
    const link = getTag("link");
    const description = getTag("description");
    const pubDate = getTag("pubDate");
    if (title) items.push({ id: Math.random().toString(36).slice(2), title, url: link, content: description, created: pubDate });
  }
  return items;
}
function parseNewsContent(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const img = doc.querySelector("img");
    const src = img ? (img.getAttribute("src") || img.getAttribute("data-src") || "") : null;
    doc.querySelectorAll("script,style,img").forEach((el) => el.remove());
    const text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    return { src, text };
  } catch {
    const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
    const src = m ? m[1] : null;
    const text = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { src, text };
  }
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
setInterval(() => {
  const tabVisible = !document.getElementById("tab-news").classList.contains("hidden");
  if (tabVisible) fetchNews();
}, 30 * 60 * 1000);
setInterval(() => {
  const v = !document.getElementById("tab-intelligence").classList.contains("hidden");
  const autoOn = (document.getElementById("miAuto") || { checked: true }).checked;
  if (v && autoOn) renderIntelligence();
}, 60 * 1000);
function clearData() {
  ["ff_profile", "ff_debts", "ff_assets", "ff_goals", "ff_news"].forEach((k) => store.del(k));
  state.profile = { income: 0, expenses: 0, savings: 0, emergency: 0 };
  state.debts = [];
  state.assets = [];
  state.goals = [];
  state.news = [];
  $("#income").value = "";
  $("#expenses").value = "";
  $("#savings").value = "";
  $("#emergency").value = "";
  renderAll();
}
function logout() {
  localStorage.removeItem("ff_logged_in");
  sessionStorage.removeItem("ff_logged_in");
  localStorage.removeItem("ff_user");
  window.location.href = "login.html";
}
document.addEventListener("DOMContentLoaded", () => {
  const p = localStorage.getItem("ff_logged_in");
  const s = sessionStorage.getItem("ff_logged_in");
  if (p !== "true" && s !== "true") {
    window.location.href = "login.html";
    return;
  }
  init();
});
function initTicker() {
  const el = document.getElementById("globalTicker");
  if (!el) return;
  const render = () => {
    HackathonDemoData.ticker.forEach((t) => { t.ch += (Math.random() - 0.5) * 0.4; t.p += (Math.random() - 0.5) * (t.p * 0.005); });
    const s = HackathonDemoData.ticker.map((t) => {
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
  const push = (txt) => {
    const div = document.createElement("div");
    div.className = "copilot-msg";
    div.textContent = txt;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };
  const think = () => {
    const d = document.createElement("div");
    d.className = "copilot-msg shimmer";
    d.textContent = "AI is thinking...";
    body.appendChild(d);
    return d;
  };
  const context = () => {
    if (!document.getElementById("tab-dashboard").classList.contains("hidden")) return "dashboard";
    if (!document.getElementById("tab-assets").classList.contains("hidden")) return "portfolio";
    if (!document.getElementById("tab-simulator").classList.contains("hidden")) return "simulator";
    if (!document.getElementById("tab-intelligence").classList.contains("hidden")) return "intelligence";
    return "general";
  };
  fab.addEventListener("click", () => { cp.classList.remove("hidden"); });
  close.addEventListener("click", () => { cp.classList.add("hidden"); });
  send.addEventListener("click", () => {
    const q = (input.value || "").trim();
    if (!q) return;
    push("You: " + q);
    const t = think();
    setTimeout(() => {
      t.remove();
      const ctx = context();
      const msg = ctx === "dashboard"
        ? "Your savings rate looks improvable. Aim for 20%+. Emergency fund is below 3 months."
        : ctx === "portfolio"
        ? "Tech weighting is high. Consider adding FMCG and Banking ETFs to diversify."
        : ctx === "simulator"
        ? "AI suggests optimizing by reducing discretionary spending to save ₹1,200/month."
        : ctx === "intelligence"
        ? "Bias is Neutral with moderate volatility. Accumulate quality large caps on dips."
        : "I can help with budgeting, debt safety, and investment allocation.";
      push("AI: " + msg);
    }, 900);
    input.value = "";
  });
}
function bindAISummaries() {
  const dashBtn = document.getElementById("aiDashSummary");
  const dashOut = document.getElementById("aiDashOut");
  if (dashBtn && dashOut) {
    dashBtn.addEventListener("click", () => {
      dashOut.classList.add("shimmer");
      dashOut.textContent = "AI is analyzing your data...";
      setTimeout(() => {
        const h = healthScore();
        dashOut.classList.remove("shimmer");
        dashOut.textContent = `Financial Health ${h.score}/100 (${h.status}). Savings ${h.breakdown.srScore}/100, Expenses ${h.breakdown.erScore}/100, DTI ${h.breakdown.dtiScore}/100. Maintain emergency ≥ 3 months.`;
      }, 1200);
    });
  }
  const portBtn = document.getElementById("aiPortfolioSummary");
  const portOut = document.getElementById("aiPortfolioOut");
  if (portBtn && portOut) {
    portBtn.addEventListener("click", () => {
      portOut.classList.add("shimmer");
      portOut.textContent = "AI is analyzing your portfolio...";
      setTimeout(() => {
        const groups = {};
        state.assets.forEach((a) => { groups[a.category] = (groups[a.category] || 0) + (parseFloat(a.value) || 0); });
        const top = Object.entries(groups).sort((a,b)=>b[1]-a[1])[0];
        portOut.classList.remove("shimmer");
        portOut.textContent = top ? `Top exposure in ${top[0]} ≈ ₹${top[1]}. Diversify across sectors. Consider monthly SIP into Index ETFs.` : "Add assets to analyze exposure.";
      }, 1200);
    });
  }
}
function analyzeSentiment(text) {
  const t = (text || "").toLowerCase();
  if (/(rally|growth|record|surge)/.test(t)) return "Positive";
  if (/(crash|fall|inflation|loss)/.test(t)) return "Negative";
  return "Neutral";
}
function generateMarketIntelligence() {
  const vol = Math.round(20 + Math.random() * 60);
  const bias = vol > 65 ? "Bearish" : vol < 35 ? "Bullish" : "Neutral";
  const conf = Math.round(55 + Math.random() * 40);
  const phrases = ["Markets open steady with sector rotation seen", "IT and Banks drive early momentum", "Energy softens amid global cues", "Midcaps show resilience despite volatility"];
  const overview = phrases[Math.floor(Math.random() * phrases.length)];
  const headlines = [
    { title: "Indices edge higher on strong earnings", cat: "Results" },
    { title: "RBI keeps policy unchanged; liquidity stays ample", cat: "Policy" },
    { title: "Oil prices fall as demand outlook softens", cat: "Commodities" },
    { title: "Tech stocks surge on AI growth outlook", cat: "Tech" },
    { title: "Inflation cools slightly; core stable", cat: "Macro" },
  ].map((h) => {
    const sentiment = analyzeSentiment(h.title);
    const impact = sentiment === "Positive" ? "Medium" : sentiment === "Negative" ? "High" : "Low";
    return { ...h, time: new Date().toLocaleTimeString(), sentiment, impact };
  });
  const symbols = ["NSE:RELIANCE", "NSE:TCS", "NSE:INFY", "NASDAQ:AAPL", "NASDAQ:TSLA"];
  const pickSym = symbols[Math.floor(Math.random() * symbols.length)];
  const entry = 900 + Math.round(Math.random() * 1800);
  const rsi = 35 + Math.round(Math.random() * 30);
  const ma50 = entry + Math.round((Math.random() - 0.5) * 40);
  const ma200 = entry + Math.round((Math.random() - 0.5) * 80);
  const volStrength = 40 + Math.round(Math.random() * 60);
  const volScore = 1 + Math.round(Math.random() * 4);
  const trend = ma50 > ma200 ? "Up" : "Down";
  const signal = trend === "Up" && rsi >= 45 && rsi <= 65 ? "BUY" : trend === "Down" && rsi > 60 ? "SELL" : "HOLD";
  const stop = signal === "BUY" ? Math.round(entry * (1 - volScore / 100)) : Math.round(entry * (1 + volScore / 100));
  const target = signal === "BUY" ? Math.round(entry * (1 + (volScore * 1.6) / 100)) : Math.round(entry * (1 - (volScore * 1.6) / 100));
  const rr = Math.abs((target - entry) / Math.max(1, entry - stop));
  const hold = trend === "Up" ? `${8 + Math.round(Math.random() * 6)} days` : `${4 + Math.round(Math.random() * 4)} days`;
  const pickConf = Math.min(95, Math.round((trend === "Up" ? 60 : 40) + volStrength / 4));
  return { overview, vol, bias, conf, headlines, pick: { pickSym, rsi, ma50, ma200, volStrength, trend, volScore, signal, entry, target, stop, rr, hold, pickConf } };
}
function calculateTradePlan(capital, ctx) {
  const riskPct = 2;
  const riskAmt = Math.round((capital * riskPct) / 100);
  const stopDist = Math.max(1, Math.abs(ctx.entry - ctx.stop));
  const qty = Math.max(1, Math.floor(riskAmt / stopDist));
  const rr = Math.abs((ctx.target - ctx.entry) / stopDist);
  const capitalReq = Math.round(qty * ctx.entry);
  return { riskAmt, qty, rr, capitalReq, entry: ctx.entry, stop: ctx.stop, t1: Math.round(ctx.entry + stopDist * rr), t2: Math.round(ctx.entry + stopDist * rr * 1.6) };
}
function calculateRiskScore(mi) {
  const vol = mi.vol;
  const groups = {};
  state.assets.forEach((a) => { groups[a.category] = (groups[a.category] || 0) + (parseFloat(a.value) || 0); });
  const vals = Object.values(groups);
  const conc = vals.length ? Math.max(...vals) / Math.max(vals.reduce((a, b) => a + b, 0), 1) : 0.3;
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  const dti = state.profile.income > 0 ? totalEmi / state.profile.income : 0.2;
  const score = clamp(Math.round(vol * 0.4 + conc * 100 * 0.35 + dti * 100 * 0.25), 0, 100);
  return score;
}
function renderIntelligence() {
  const mi = generateMarketIntelligence();
  window.miLatest = mi.headlines;
  $("#miOverview").textContent = mi.overview;
  $("#miVol").textContent = `${mi.vol}`;
  $("#miBias").textContent = mi.bias;
  $("#miConf").textContent = `${mi.conf}%`;
  $("#miUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
  const nl = $("#miNewsList");
  nl.innerHTML = "";
  mi.headlines.forEach((h) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const sentClass = h.sentiment === "Positive" ? "pos" : h.sentiment === "Negative" ? "neg" : "";
    row.innerHTML = `<div><strong>${h.title}</strong><br/><span class="badge">${h.cat}</span> <span class="badge ${sentClass}">${h.sentiment}</span> <span class="badge">${h.impact}</span></div><div>${h.time}</div>`;
    nl.appendChild(row);
  });
  $("#miPickSymbol").textContent = mi.pick.pickSym;
  $("#miPickSignal").textContent = mi.pick.signal;
  $("#miPickConf").textContent = `${mi.pick.pickConf}%`;
  $("#miRSI").textContent = `${mi.pick.rsi}`;
  $("#miMA50").textContent = `${mi.pick.ma50}`;
  $("#miMA200").textContent = `${mi.pick.ma200}`;
  $("#miVolStrength").textContent = `${mi.pick.volStrength}`;
  $("#miTrend").textContent = mi.pick.trend;
  $("#miVolScore").textContent = `${mi.pick.volScore}%`;
  $("#miEntry").textContent = `₹${mi.pick.entry}`;
  $("#miTarget").textContent = `₹${mi.pick.target}`;
  $("#miStop").textContent = `₹${mi.pick.stop}`;
  $("#miRR").textContent = `${mi.pick.rr.toFixed(2)}x`;
  $("#miHold").textContent = mi.pick.hold;
  const cap = parseFloat($("#miCapital").value) || 100000;
  const plan = calculateTradePlan(cap, mi.pick);
  const pl = $("#miPlan");
  pl.innerHTML = "";
  const rows = [
    ["Risk per trade", `₹${plan.riskAmt} (2%)`],
    ["Position size", `${plan.qty}`],
    ["Entry", `₹${plan.entry}`],
    ["Stoploss", `₹${plan.stop}`],
    ["Target 1", `₹${plan.t1}`],
    ["Target 2", `₹${plan.t2}`],
    ["Risk/Reward", `${plan.rr.toFixed(2)}x`],
    ["Capital required", `₹${plan.capitalReq}`],
  ];
  rows.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    row.innerHTML = `<div>${k}</div><div>${v}</div>`;
    pl.appendChild(row);
  });
  const sentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
  mi.headlines.forEach((h) => { sentCounts[h.sentiment]++; });
  const ss = $("#miSentSummary");
  ss.innerHTML = "";
  ["Positive","Negative","Neutral"].forEach((k) => {
    const c = sentCounts[k];
    const cls = k === "Positive" ? "pos" : k === "Negative" ? "neg" : "";
    const item = document.createElement("div");
    item.className = "ff-item";
    item.innerHTML = `<div><span class="badge ${cls}">${k}</span></div><div>${c}</div>`;
    ss.appendChild(item);
  });
  drawSparkline();
  const riskScore = calculateRiskScore(mi);
  $("#miRiskFill").style.width = `${riskScore}%`;
  const riskLabel = riskScore <= 30 ? "Low Risk" : riskScore <= 60 ? "Moderate" : "High Risk";
  $("#miRiskLabel").textContent = `${riskScore}/100 • ${riskLabel}`;
  const imp = $("#miImpact");
  imp.innerHTML = "";
  const sectors = ["IT", "Banking", "Energy", "FMCG", "Metal"];
  const gain = sectors[Math.floor(Math.random() * sectors.length)];
  let pressure = sectors[Math.floor(Math.random() * sectors.length)];
  if (pressure === gain) pressure = sectors[(sectors.indexOf(pressure) + 1) % sectors.length];
  const action = riskLabel === "Low Risk" ? "Accumulate" : riskLabel === "Moderate" ? "Cautious" : "Book profits";
  [["Likely to gain", gain], ["Under pressure", pressure], ["Suggested action", action]].forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    row.innerHTML = `<div>${k}</div><div>${v}</div>`;
    imp.appendChild(row);
  });
  const sym = (document.getElementById("miSymbol") || { value: "NSE:RELIANCE" }).value;
  const chart = document.getElementById("miChart");
  const tf = (document.getElementById("miTF") || { value: "D" }).value;
  chart.innerHTML = `<div class="tradingview-widget-container" style="height:100%;"><div id="tvchart" style="height:100%"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>{"autosize": true,"symbol": "${sym}","interval": "${tf}","timezone": "Etc/UTC","theme": "dark","style": "1","locale": "en","enable_publishing": false,"hide_top_toolbar": false,"allow_symbol_change": false}</script></div>`;
  const macro = generateMacroSnapshot();
  const ml = document.getElementById("miMacroList");
  ml.innerHTML = "";
  [
    ["GDP growth", `${macro.gdp}%`],
    ["CPI", `${macro.cpi}%`],
    ["WPI", `${macro.wpi}%`],
    ["Repo rate", `${macro.repo}%`],
    ["USD/INR", `${macro.usdinr}`],
    ["Brent crude", `₹${macro.crude}`],
  ].forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "kpi";
    row.innerHTML = `<div>${k}</div><div>${v}</div>`;
    ml.appendChild(row);
  });
  const fl = document.getElementById("miFxCommoList");
  fl.innerHTML = "";
  [
    ["USDINR", macro.usdinr],
    ["EURINR", macro.eurinr],
    ["GOLD (10g)", `₹${macro.gold}`],
    ["SILVER (kg)", `₹${macro.silver}`],
    ["CRUDE", `₹${macro.crude}`],
  ].forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "kpi";
    row.innerHTML = `<div>${k}</div><div>${v}</div>`;
    fl.appendChild(row);
  });
  const sipText = computeSIPSuggestion();
  document.getElementById("miSIP").textContent = sipText;
  renderNewsActions();
  renderMatchedTickers();
  renderAllocationPlan();
}
function drawSparkline() {
  const c = document.getElementById("miSpark");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  const pts = Array.from({ length: 36 }, () => 100 + Math.round((Math.random() - 0.3) * 12));
  const w = c.width, h = c.height;
  const max = Math.max(...pts), min = Math.min(...pts);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((v, i) => {
    const x = (i / (pts.length - 1)) * (w - 10) + 5;
    const y = h - 6 - ((v - min) / Math.max(1, max - min)) * (h - 12);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "miCopyPlan") {
    const text = Array.from(document.querySelectorAll("#miPlan .ff-item"))
      .map((n) => `${n.children[0].textContent}: ${n.children[1].textContent}`).join("\n");
    try { await navigator.clipboard.writeText(text); } catch {}
  }
  if (e.target && e.target.id === "miApplyTax") {
    const pct = parseFloat(document.getElementById("miTaxPct").value) || 0;
    const res = taxChangeSimulator(pct);
    document.getElementById("miTaxResult").textContent = res;
  }
  if (e.target && e.target.id === "miCalcEmi") {
    const bps = parseFloat(document.getElementById("miRepoDelta").value) || 0;
    const txt = computeEMIImpact(bps);
    document.getElementById("miEMIImpact").textContent = txt;
  }
  if (e.target && e.target.id === "miGenNewsActions") {
    renderNewsActions();
  }
});
function renderMatchedTickers() {
  const headlines = state.news && state.news.length ? state.news.map((n) => n.title) : (window.miLatest || []).map((n) => n.title);
  const matches = matchTickersFromNews(headlines);
  const list = document.getElementById("miMatched");
  list.innerHTML = "";
  matches.forEach((m) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const cls = m.action === "Accumulate" ? "pos" : m.action === "Sell" ? "neg" : "";
    row.innerHTML = `<div><strong>${m.symbol}</strong> • ${m.reason}</div><div><span class="badge ${cls}">${m.action}</span> <button data-symbol="${m.symbol}">Open</button></div>`;
    list.appendChild(row);
  });
}
function matchTickersFromNews(lines) {
  const dict = [
    { re: /(reliance|oil|energy)/i, sym: "NSE:RELIANCE" },
    { re: /(tcs|it|software|outsourcing)/i, sym: "NSE:TCS" },
    { re: /(infosys|infy|it)/i, sym: "NSE:INFY" },
    { re: /(hdfc|bank)/i, sym: "NSE:HDFCBANK" },
    { re: /(sbi|state bank)/i, sym: "NSE:SBIN" },
    { re: /(itc|fmcg|consumer)/i, sym: "NSE:ITC" },
    { re: /(ports|adan|logistics)/i, sym: "NSE:ADANIPORTS" },
    { re: /(apple|iphone|mac)/i, sym: "NASDAQ:AAPL" },
    { re: /(tesla|ev|elon)/i, sym: "NASDAQ:TSLA" },
    { re: /(nvidia|ai|gpu)/i, sym: "NASDAQ:NVDA" },
    { re: /(google|alphabet|search)/i, sym: "NASDAQ:GOOGL" },
  ];
  const results = [];
  lines.forEach((t) => {
    const s = analyzeSentiment(t);
    dict.forEach((d) => {
      if (d.re.test(t)) {
        const action = s === "Positive" ? "Accumulate" : s === "Negative" ? "Sell" : "Cautious";
        const reason = `${s} news: ${t.slice(0, 80)}${t.length > 80 ? "..." : ""}`;
        results.push({ symbol: d.sym, action, reason });
      }
    });
  });
  const uniq = {};
  results.forEach((r) => { uniq[r.symbol] = uniq[r.symbol] || r; });
  return Object.values(uniq).slice(0, 10);
}
function renderAllocationPlan() {
  const risk = (document.getElementById("miAllocRisk") || { value: "Medium" }).value;
  const budget = parseFloat((document.getElementById("miAllocBudget") || { value: "100000" }).value) || 100000;
  const headlines = state.news && state.news.length ? state.news.map((n) => n.title) : (window.miLatest || []).map((n) => n.title);
  const matches = matchTickersFromNews(headlines);
  const plan = generateAllocationPlan(risk, budget, matches);
  const list = document.getElementById("miAllocList");
  list.innerHTML = "";
  plan.forEach((p) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const cls = p.action === "Accumulate" ? "pos" : p.action === "Sell" ? "neg" : "";
    row.innerHTML = `<div><strong>${p.symbol}</strong> • ${p.reason}</div><div><span class="badge ${cls}">${p.action}</span> • ${p.percent}% • ₹${p.amount}</div>`;
    list.appendChild(row);
  });
}
function generateAllocationPlan(risk, budget, matches) {
  const cap = risk === "High" ? 15 : 10;
  const minPct = 2;
  const baseTickers = matches.length ? matches : [
    { symbol: "NSE:RELIANCE", action: "Cautious", reason: "Core energy anchor" },
    { symbol: "NSE:TCS", action: "Accumulate", reason: "IT quality" },
    { symbol: "NSE:INFY", action: "Accumulate", reason: "IT secular" },
    { symbol: "NSE:HDFCBANK", action: "Accumulate", reason: "Banking core" },
    { symbol: "NSE:ITC", action: "Cautious", reason: "FMCG defensive" },
  ];
  const wMap = { Accumulate: 1.0, Cautious: 0.6, Sell: 0.0 };
  const items = baseTickers.slice(0, 8);
  let weights = items.map((x) => wMap[x.action] || 0.5);
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  let percents = weights.map((w) => Math.round((w / sumW) * 100));
  // enforce caps and minimums
  percents = percents.map((p, i) => {
    if (items[i].action === "Sell") return 0;
    return Math.max(minPct, Math.min(cap, p));
  });
  const sumP = percents.reduce((a, b) => a + b, 0) || 1;
  percents = percents.map((p) => Math.round((p / sumP) * 100));
  return items.map((it, i) => ({
    symbol: it.symbol,
    action: it.action,
    reason: it.reason,
    percent: percents[i],
    amount: Math.round((percents[i] / 100) * budget),
  }));
}
function renderNewsActions() {
  const news = state.news && state.news.length ? state.news.map((n) => ({ title: n.title })) : (window.miLatest || []);
  const actions = generateActionsFromNews(news);
  const list = document.getElementById("miNewsActions");
  list.innerHTML = "";
  actions.forEach((a) => {
    const row = document.createElement("div");
    row.className = "ff-item";
    const cls = a.action === "Accumulate" ? "pos" : a.action === "Book profits" ? "neg" : "";
    row.innerHTML = `<div>${a.text}</div><div><span class="badge ${cls}">${a.action}</span></div>`;
    list.appendChild(row);
  });
}
function generateActionsFromNews(items) {
  const map = {
    IT: /(tech|software|it|ai)/i,
    Banking: /(rbi|bank|policy|rate|repo)/i,
    Energy: /(oil|crude|energy|gas)/i,
    FMCG: /(consumer|fmcg|staples)/i,
    Metal: /(steel|metal|commodity)/i,
  };
  const tally = { IT: { pos: 0, neg: 0 }, Banking: { pos: 0, neg: 0 }, Energy: { pos: 0, neg: 0 }, FMCG: { pos: 0, neg: 0 }, Metal: { pos: 0, neg: 0 } };
  items.forEach((n) => {
    const s = analyzeSentiment(n.title);
    Object.entries(map).forEach(([sec, re]) => {
      if (re.test(n.title)) {
        if (s === "Positive") tally[sec].pos++;
        else if (s === "Negative") tally[sec].neg++;
      }
    });
  });
  const actions = [];
  Object.entries(tally).forEach(([sec, t]) => {
    const score = t.pos - t.neg;
    if (score > 0) actions.push({ text: `${sec}: news tilt positive`, action: "Accumulate" });
    else if (score < 0) actions.push({ text: `${sec}: headline pressure`, action: "Cautious" });
  });
  if (!actions.length) actions.push({ text: "Overall neutral headlines", action: "Cautious" });
  return actions;
}
function generateMacroSnapshot() {
  return {
    gdp: (5 + Math.random() * 3).toFixed(1),
    cpi: (3.5 + Math.random() * 3).toFixed(1),
    wpi: (2.0 + Math.random() * 3).toFixed(1),
    repo: (6 + (Math.random() - 0.5) * 0.5).toFixed(2),
    usdinr: (82 + (Math.random() - 0.5) * 1.2).toFixed(2),
    eurinr: (88 + (Math.random() - 0.5) * 1.5).toFixed(2),
    gold: (62000 + Math.round((Math.random() - 0.5) * 1500)),
    silver: (75000 + Math.round((Math.random() - 0.5) * 3000)),
    crude: (6400 + Math.round((Math.random() - 0.5) * 300)),
  };
}
function computeSIPSuggestion() {
  const income = state.profile.income;
  const expenses = state.profile.expenses;
  const savings = state.profile.savings;
  const surplus = Math.max(0, income - expenses);
  const sip = Math.round(Math.max(0, surplus * 0.15));
  const idx = Math.round(sip * 0.5);
  const large = Math.round(sip * 0.3);
  const mid = Math.round(sip * 0.2);
  return `Suggested monthly SIP ≈ ₹${sip}. Split: Index ETF ₹${idx}, Large Cap ₹${large}, Mid Cap ₹${mid}. Adjust based on goals and risk.`;
}
function computeEMIImpact(deltaBps) {
  const totalEmi = state.debts.reduce((a, b) => a + (parseFloat(b.emi) || 0), 0);
  const passThrough = 0.6;
  const deltaRate = (deltaBps || 0) / 10000;
  const change = Math.round(totalEmi * passThrough * deltaRate);
  const sign = change >= 0 ? "+" : "-";
  return `Estimated EMI change: ${sign}₹${Math.abs(change)} for total monthly EMIs ₹${totalEmi}.`;
}
function taxChangeSimulator(pct) {
  const income = state.profile.income;
  if (!income) return "Enter income in Dashboard to simulate.";
  const delta = Math.round((income * pct) / 100);
  const takeHome = income - delta;
  const sign = delta >= 0 ? "decrease" : "increase";
  return `Estimated monthly take-home ${sign} by ₹${Math.abs(delta)} → new ≈ ₹${takeHome}.`;
}
const miCapitalInput = () => document.getElementById("miCapital");
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "miBuildPlan") {
    renderIntelligence();
  }
});
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "miSymbol") {
    renderIntelligence();
  }
});
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "miAddSymbol") {
    const input = document.getElementById("miCustomSymbol");
    const val = (input && input.value || "").trim();
    if (val) {
      const sel = document.getElementById("miSymbol");
      const opt = document.createElement("option");
      opt.textContent = val;
      sel.appendChild(opt);
      sel.value = val;
      renderIntelligence();
      input.value = "";
    }
  }
  if (e.target && e.target.dataset && e.target.dataset.symbol) {
    const sel = document.getElementById("miSymbol");
    const sym = e.target.dataset.symbol;
    let found = false;
    Array.from(sel.options).forEach((o) => { if (o.value === sym) found = true; });
    if (!found) {
      const opt = document.createElement("option");
      opt.textContent = sym;
      sel.appendChild(opt);
    }
    sel.value = sym;
    renderIntelligence();
  }
  if (e.target && e.target.id === "miGenAlloc") {
    renderAllocationPlan();
  }
  if (e.target && e.target.id === "miCopyAlloc") {
    const text = Array.from(document.querySelectorAll("#miAllocList .ff-item"))
      .map((n) => `${n.children[0].textContent}: ${n.children[1].textContent}`).join("\n");
    navigator.clipboard.writeText(text).catch(()=>{});
  }
});
