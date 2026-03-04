import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static("."));

const SOURCES = {
  india: [
    { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", type: "rss" },
    { name: "TOI Business", url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", type: "rss" },
    { name: "RBI (Unofficial)", url: "https://www.reddit.com/r/IndiaEconomy/.json", type: "reddit" },
    { name: "PersonalFinanceIndia", url: "https://www.reddit.com/r/PersonalFinanceIndia/.json", type: "reddit" }
  ],
  global: [
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", type: "rss" },
    { name: "MarketWatch", url: "https://feeds.feedburner.com/MarketWatch/topstories", type: "rss" },
    { name: "personalfinance", url: "https://www.reddit.com/r/personalfinance/.json", type: "reddit" }
  ],
};

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
    if (title) items.push({ title, url: link, content: description, created: pubDate });
  }
  return items;
}

async function fetchSource(src) {
  try {
    const res = await fetch(src.url, { headers: { "Accept": "application/rss+xml,application/xml,text/xml,application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (src.type === "rss") {
      const xml = await res.text();
      const items = parseRSS(xml);
      return items.map((i) => ({ ...i, source: src.name }));
    } else {
      const data = await res.json();
      const posts = (data && data.data && data.data.children) || [];
      return posts.map((p) => {
        const t = (p.data && p.data.title) || "";
        const selftext = (p.data && p.data.selftext) || "";
        const url = (p.data && p.data.url) || "";
        const created = (p.data && p.data.created_utc) ? new Date(p.data.created_utc * 1000).toISOString() : new Date().toISOString();
        return { title: t, url, content: selftext, created, source: src.name };
      });
    }
  } catch (e) {
    return [];
  }
}

function categorize(text) {
  const lower = (text || "").toLowerCase();
  const tags = [];
  const tagMap = {
    budget: ["budget", "finance bill", "union budget"],
    tax: ["tax", "income tax", "gst"],
    rbi: ["rbi", "repo", "policy"],
    inflation: ["inflation", "cpi", "wpi"],
    stocks: ["stocks", "sensex", "nifty", "market", "equity"],
    mutual: ["mutual fund", "sip", "nav"],
    crypto: ["crypto", "bitcoin", "ethereum"],
    loan: ["loan", "emi", "credit", "mortgage"],
    fuel: ["fuel", "petrol", "diesel", "oil"],
    property: ["property", "real estate", "housing"],
    gold: ["gold", "bullion"]
  };
  Object.entries(tagMap).forEach(([k, arr]) => {
    if (arr.some((kw) => lower.includes(kw))) tags.push(k);
  });
  return tags;
}

function summarize(text) {
  const lower = (text || "").toLowerCase();
  let s = "";
  if (lower.includes("repo")) s += "Repo rate change may affect EMIs. ";
  if (lower.includes("budget")) s += "Budget changes may alter taxes/subsidies. ";
  if (lower.includes("tax")) s += "Tax adjustments can impact take-home pay. ";
  if (lower.includes("inflation")) s += "Inflation affects household costs. ";
  if (lower.includes("fuel") || lower.includes("diesel") || lower.includes("petrol")) s += "Fuel prices impact transportation costs. ";
  if (lower.includes("stocks") || lower.includes("sensex") || lower.includes("nifty")) s += "Stock movements affect portfolio value. ";
  if (!s) s = "Potential impact: expenses or borrowing costs may change.";
  return s;
}

app.get("/api/news", async (req, res) => {
  const region = (req.query.region || "india").toLowerCase();
  const keywords = (req.query.keywords || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  const sources = SOURCES[region] || SOURCES.india;
  const results = [];
  for (const src of sources) {
    const items = await fetchSource(src);
    items.forEach((i) => {
      const text = `${i.title} ${i.content || ""}`;
      if (!keywords.length || keywords.some((k) => text.toLowerCase().includes(k))) {
        results.push({
          id: Math.random().toString(36).slice(2),
          title: i.title,
          url: i.url,
          content: i.content,
          created: i.created,
          source: i.source,
          tags: categorize(text),
          summary: summarize(text),
        });
      }
    });
  }
  results.sort((a, b) => new Date(b.created) - new Date(a.created));
  res.json({ items: results.slice(0, 80), updated_at: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
