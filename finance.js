const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmt = (n) => (n < 10 ? `0${n}` : `${n}`);
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
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
}
function renderAll() {
  renderDashboard();
  renderDebts();
  renderAssets();
  renderGoals();
  renderNews();
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
    const row = document.createElement("div");
    row.className = "ff-item";
    const left = document.createElement("div");
    const content = n.content || n.summary || "";
    left.innerHTML = `<strong>${n.title}</strong><br/>${content}`;
    const right = document.createElement("div");
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      state.news = state.news.filter((x) => x.id !== n.id);
      store.set("ff_news", state.news);
      renderNews();
    });
    right.appendChild(del);
    row.appendChild(left);
    row.appendChild(right);
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
setInterval(() => {
  const tabVisible = !document.getElementById("tab-news").classList.contains("hidden");
  if (tabVisible) fetchNews();
}, 30 * 60 * 1000);
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
document.addEventListener("DOMContentLoaded", init);
