const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const store = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch { return d; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const state = {
  items: [],
  region: "india",
  tags: new Set(),
  search: "",
};
const SOURCES = {
  india: [
    { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", type: "rss" },
    { name: "TOI Business", url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", type: "rss" },
    { name: "IndiaEconomy", url: "https://www.reddit.com/r/IndiaEconomy/.json", type: "reddit" },
    { name: "PersonalFinanceIndia", url: "https://www.reddit.com/r/PersonalFinanceIndia/.json", type: "reddit" }
  ],
  global: [
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", type: "rss" },
    { name: "MarketWatch", url: "https://feeds.feedburner.com/MarketWatch/topstories", type: "rss" },
    { name: "personalfinance", url: "https://www.reddit.com/r/personalfinance/.json", type: "reddit" },
    { name: "StockMarket", url: "https://www.reddit.com/r/StockMarket/.json", type: "reddit" }
  ],
};
const TAGS = {
  budget: ["budget", "union budget", "finance bill"],
  tax: ["tax", "income tax", "gst"],
  rbi: ["rbi", "repo", "monetary policy"],
  inflation: ["inflation", "cpi", "wpi"],
  stocks: ["stocks", "sensex", "nifty", "market", "equity"],
  mutual: ["mutual fund", "sip", "nav"],
  crypto: ["crypto", "bitcoin", "ethereum", "web3"],
  loan: ["loan", "emi", "credit", "mortgage"],
  fuel: ["fuel", "petrol", "diesel", "oil"],
  property: ["property", "real estate", "housing"],
  gold: ["gold", "bullion"],
};
function init() {
  bind();
  state.region = store.get("hub_region", "india");
  $("#region").value = state.region;
  fetchAll();
  setInterval(() => fetchAll(), 15 * 60 * 1000);
}
function bind() {
  $("#region").addEventListener("change", () => {
    state.region = $("#region").value;
    store.set("hub_region", state.region);
    fetchAll();
  });
  $("#search").addEventListener("input", () => {
    state.search = $("#search").value.toLowerCase();
    render();
  });
  $$("#tagFilter .tag").forEach((t) => {
    t.addEventListener("click", () => {
      const tag = t.getAttribute("data-tag");
      if (state.tags.has(tag)) { state.tags.delete(tag); t.classList.remove("active"); }
      else { state.tags.add(tag); t.classList.add("active"); }
      render();
    });
  });
  $("#refresh").addEventListener("click", fetchAll);
  $("#summarize").addEventListener("click", summarizeLatest);
}
async function fetchAll() {
  try {
    const res = await fetch(`/api/news?region=${encodeURIComponent(state.region)}`);
    if (res.ok) {
      const data = await res.json();
      state.items = (data.items || []).map((i) => ({ ...i }));
      render();
      return;
    }
  } catch (e) {}
  const sources = SOURCES[state.region] || [];
  const items = [];
  for (const s of sources) {
    try {
      if (s.type === "rss") {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(s.url)}`);
        if (!res.ok) continue;
        const xml = await res.text();
        const parsed = parseRSS(xml).map((i) => ({ ...i, source: s.name, tags: detectTags(`${i.title} ${i.content || ""}`) }));
        items.push(...parsed);
      } else {
        const res = await fetch(s.url, { headers: { "Accept": "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const posts = (data && data.data && data.data.children) || [];
        posts.forEach((p) => {
          const t = (p.data && p.data.title) || "";
          const selftext = (p.data && p.data.selftext) || "";
          const url = (p.data && p.data.url) || "";
          const created = (p.data && p.data.created_utc) ? new Date(p.data.created_utc * 1000).toISOString() : new Date().toISOString();
          const cats = detectTags(`${t} ${selftext}`);
          items.push({ id: Math.random().toString(36).slice(2), title: t, source: s.name, url, content: selftext, tags: cats, created });
        });
      }
    } catch (e) {}
  }
  state.items = items.slice(0, 60);
  render();
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
function detectTags(text) {
  const lower = text.toLowerCase();
  const cats = [];
  Object.entries(TAGS).forEach(([k, arr]) => {
    if (arr.some((kw) => lower.includes(kw))) cats.push(k);
  });
  return cats;
}
function render() {
  const feed = $("#feed");
  feed.innerHTML = "";
  let items = [...state.items];
  if (state.tags.size) items = items.filter((i) => i.tags.some((t) => state.tags.has(t)));
  if (state.search) items = items.filter((i) => (i.title + " " + i.content).toLowerCase().includes(state.search));
  if (!items.length) {
    feed.innerHTML = `<div class="item"><div>No results. Try refreshing or adjusting filters.</div></div>`;
    return;
  }
  items.slice(0, 50).forEach((i) => {
    const row = document.createElement("div");
    row.className = "item";
    const left = document.createElement("div");
    const tags = i.tags.map((t) => `<span class="badge cat">${t}</span>`).join(" ");
    left.innerHTML = `<div class="title">${i.title}</div><div class="meta">${i.source} • ${new Date(i.created).toLocaleString()}</div><div class="meta">${tags}</div>`;
    const right = document.createElement("div");
    right.className = "right";
    const open = document.createElement("a");
    open.textContent = "Open";
    open.href = i.url || "#";
    open.target = "_blank";
    right.appendChild(open);
    row.appendChild(left);
    row.appendChild(right);
    feed.appendChild(row);
  });
}
function summarizeLatest() {
  if (!state.items.length) return;
  const latest = state.items[0];
  const text = (latest.title + " " + (latest.content || "")).toLowerCase();
  let summary = "";
  if (text.includes("repo")) summary += "Repo rate up may raise EMIs. ";
  if (text.includes("budget")) summary += "Budget changes may alter tax slabs and subsidies. ";
  if (text.includes("tax")) summary += "Tax adjustments could affect take-home pay. ";
  if (text.includes("stocks") || text.includes("sensex") || text.includes("nifty")) summary += "Stock market movements may affect portfolio value. ";
  if (text.includes("fuel") || text.includes("diesel") || text.includes("petrol")) summary += "Fuel price changes impact transportation costs. ";
  if (!summary) summary = "Potential impact: expenses or borrowing costs may change.";
  const feed = $("#feed");
  const row = document.createElement("div");
  row.className = "item";
  row.innerHTML = `<div><strong>Summary:</strong> ${summary}</div>`;
  feed.prepend(row);
}
document.addEventListener("DOMContentLoaded", init);
