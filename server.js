import express from "express";
import fetch from "node-fetch";
import { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER, GMAIL_APP_SENDER, GMAIL_APP_PASSWORD } from "./gmail.config.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static("."));

async function sendResetEmail(email, link) {
  try {
    const { google } = await import("googleapis");
    const nodemailer = (await import("nodemailer")).default;
    const appSender = GMAIL_APP_SENDER || process.env.GMAIL_APP_SENDER || "";
    const appPassword = GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "";
    let transporter;
    let sender;
    if (appSender && appPassword) {
      sender = appSender;
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: appSender, pass: appPassword },
      });
    } else {
      const clientId = GMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID || "";
      const clientSecret = GMAIL_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || "";
      const refreshToken = GMAIL_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN || "";
      sender = GMAIL_SENDER || process.env.GMAIL_SENDER || "";
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oAuth2Client.setCredentials({ refresh_token: refreshToken });
      const accessToken = await oAuth2Client.getAccessToken();
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: sender,
          clientId,
          clientSecret,
          refreshToken,
          accessToken: accessToken && accessToken.token ? accessToken.token : undefined,
        },
      });
    }
    const mail = {
      from: sender,
      to: email,
      subject: "Future Finance AI • Password Reset",
      html: `<p>You requested a password reset.</p><p>Click the link to reset: <a href="${link}">${link}</a></p><p>If you did not request this, ignore this email.</p>`,
    };
    await transporter.sendMail(mail);
    return true;
  } catch (e) {
    console.log("Email send failed", e && e.message ? e.message : e);
    return false;
  }
}

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

app.post("/api/password-reset-request", (req, res) => {
  const email = (req.body && req.body.email) || "";
  const token = Math.random().toString(36).slice(2);
  const link = `http://localhost:${PORT}/reset.html?token=${token}`;
  console.log(`Password reset requested for ${email}. Link: ${link}`);
  sendResetEmail(email, link).then(() => {
    res.json({ ok: true });
  }).catch(() => {
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
