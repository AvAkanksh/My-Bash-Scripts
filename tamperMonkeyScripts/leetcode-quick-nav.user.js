// ==UserScript==
// @name         LeetCode Turbo Opener
// @namespace    https://leetcode-turbo-opener.local
// @version      3.5.0
// @description  Fast, minimalist LeetCode problem and contest opener. (Alt+L)
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      leetcode.com
// @connect      www.leetcode.com
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const LC = "https://leetcode.com";
  const GQL = `${LC}/graphql`;
  let busy = false;

  // -----------------------------
  // Utilities
  // -----------------------------

  const make = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") node.textContent = value;
      else if (key === "style") Object.assign(node.style, value);
      else if (key.startsWith("on")) {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        node.setAttribute(key, value);
      }
    }
    children.forEach(child => node.append(child));
    return node;
  };

  const normalize = s =>
    String(s)
      .trim()
      .toLowerCase()
      .replace(/[，]/g, ",")
      .replace(/[／]/g, "/")
      .replace(/\s+/g, " ");

  const slugURL = slug =>
    `${LC}/problems/${slug.replace(/^\/+|\/+$/g, "")}/`;

  function openNewTab(url) {
    if (!/^https:\/\/(www\.)?leetcode\.com\//i.test(url)) {
      throw new Error("Blocked unsafe URL");
    }
    if (typeof GM_openInTab === "function") {
      GM_openInTab(url, { active: true, insert: true, setParent: true });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function request(url, options = {}) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      const timer = setTimeout(() => finish(reject, new Error("Request timed out")), 15000);

      GM_xmlhttpRequest({
        method: options.method || "GET",
        url,
        headers: options.headers || {},
        data: options.data,
        timeout: 15000,
        onload: response => {
          clearTimeout(timer);
          if (response.status < 200 || response.status >= 300) {
            finish(reject, new Error(`HTTP ${response.status}`));
            return;
          }
          finish(resolve, response);
        },
        onerror: () => {
          clearTimeout(timer);
          finish(reject, new Error("Network request failed"));
        },
        ontimeout: () => {
          clearTimeout(timer);
          finish(reject, new Error("Request timed out"));
        }
      });
    });
  }

  async function gql(query, variables = {}) {
    const response = await request(GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ query, variables })
    });
    const json = JSON.parse(response.responseText);
    if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
    return json.data;
  }

  // -----------------------------
  // GraphQL problem resolver
  // -----------------------------

  const QUESTION_LIST_QUERY = `
    query problemSearch($limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(categorySlug: "", limit: $limit, skip: $skip, filters: $filters) {
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
        }
      }
    }
  `;

  async function searchQuestions(keywords, limit = 50) {
    const data = await gql(QUESTION_LIST_QUERY, { limit, skip: 0, filters: { searchKeywords: keywords } });
    return data?.problemsetQuestionList?.questions || [];
  }

  async function findProblem(number) {
    const id = String(Number(number));
    if (!/^\d+$/.test(id) || Number(id) < 1) throw new Error("Invalid problem number");

    const questions = await searchQuestions(id);
    const match = questions.find(q => String(Number(q.frontendQuestionId)) === id);

    if (!match) throw new Error(`Problem #${id} not found`);

    return {
      title: match.title,
      url: slugURL(match.titleSlug)
    };
  }

  async function searchByTitle(text) {
    const questions = await searchQuestions(text);
    if (!questions.length) throw new Error(`No problems found matching "${text}"`);

    const items = questions.map(q => ({
      title: `${q.frontendQuestionId}. ${q.title}`,
      url: slugURL(q.titleSlug)
    }));

    return items.length === 1 ? items[0] : { type: "list", items };
  }

  async function getDaily() {
    const query = `
      query questionOfToday {
        activeDailyCodingChallengeQuestion {
          question { questionFrontendId title titleSlug }
        }
      }
    `;
    const data = await gql(query);
    const q = data?.activeDailyCodingChallengeQuestion?.question;

    if (!q?.titleSlug) throw new Error("Daily problem unavailable");

    return {
      title: q.title,
      url: slugURL(q.titleSlug)
    };
  }

  // -----------------------------
  // Profile stats
  // -----------------------------

  async function getUsername() {
    const data = await gql(`query globalData { userStatus { username isSignedIn } }`);
    const status = data?.userStatus;
    if (!status?.isSignedIn || !status.username) throw new Error("Not signed in to LeetCode");
    return status.username;
  }

  async function getStats() {
    const username = await getUsername();
    const query = `
      query userStats($username: String!) {
        matchedUser(username: $username) {
          submitStats: submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
          userCalendar {
            streak
            totalActiveDays
            submissionCalendar
          }
        }
        streakCounter {
          streakCount
        }
      }
    `;
    const data = await gql(query, { username });
    const user = data?.matchedUser;
    if (!user) throw new Error("Could not load stats");

    const counts = {};
    user.submitStats.acSubmissionNum.forEach(d => { counts[d.difficulty] = d.count; });

    return {
      total: counts.All || 0,
      easy: counts.Easy || 0,
      medium: counts.Medium || 0,
      hard: counts.Hard || 0,
      currentStreak: data?.streakCounter?.streakCount || 0,
      maxStreak: user.userCalendar?.streak || 0,
      activeDays: user.userCalendar?.totalActiveDays || 0,
      calendar: JSON.parse(user.userCalendar?.submissionCalendar || "{}")
    };
  }

  // -----------------------------
  // Contest API parsing
  // -----------------------------

  function contestSlug(type, number) {
    const prefix = type === "w" ? "weekly-contest-" : "biweekly-contest-";
    return `${prefix}${Number(number)}`;
  }

  function contestURL(slug) {
    return `${LC}/contest/${slug}/`;
  }

  async function getContest(slug, qNumber) {
    // Utilize LeetCode's reliable contest info API instead of scraping raw HTML
    const response = await request(`${LC}/contest/api/info/${slug}/`);
    let data;
    
    try {
      data = JSON.parse(response.responseText);
    } catch (e) {
      throw new Error("Failed to parse contest data");
    }

    if (!data || !data.questions || data.questions.length === 0) {
      throw new Error("Contest questions not found. It might not have started yet.");
    }

    const q = Number(qNumber);
    if (!Number.isInteger(q) || q < 1) throw new Error("Question number must be positive");
    if (q > data.questions.length) {
      throw new Error(`Q${q} not found. Found ${data.questions.length} questions.`);
    }

    const problemSlug = data.questions[q - 1].title_slug;
    return {
      title: `${slug} — Q${q}`,
      url: `${LC}/contest/${slug}/problems/${problemSlug}/`
    };
  }

  async function latestContest(type) {
    // GraphQL is reliable here; the /contest/ page is client-rendered so
    // scraping its raw HTML never finds anything.
    const query = `
      query recentContests {
        allContests { titleSlug startTime }
      }
    `;
    const data = await gql(query);
    const prefix = type === "w" ? "weekly-contest-" : "biweekly-contest-";
    const now = Date.now() / 1000;

    const started = (data?.allContests || [])
      .filter(c => c.titleSlug.startsWith(prefix) && c.startTime <= now)
      .sort((a, b) => b.startTime - a.startTime);

    if (!started.length) throw new Error("Could not identify recent contests");
    return started[0].titleSlug;
  }

  async function lastContest(type, q) {
    const slug = await latestContest(type);
    return getContest(slug, q);
  }

  // -----------------------------
  // Command parser
  // -----------------------------

  function tokenizeContest(raw) {
    let s = normalize(raw)
      .replace(/bi-weekly/g, "bw")
      .replace(/biweekly/g, "bw")
      .replace(/weekly/g, "w")
      .replace(/week/g, "w")
      .replace(/[\/,]/g, " ")
      .replace(/q/g, " q ")
      .replace(/\s+/g, " ")
      .trim();

    const m = s.match(/^(bw|w)\s*(\d+)\s*(?:q\s*)?(\d+)$/);
    if (!m) return null;
    return { type: m[1], contest: Number(m[2]), question: Number(m[3]) };
  }

  function tokenizeLast(raw) {
    const s = normalize(raw).replace(/[\/,]/g, " ").replace(/\s+/g, " ");
    let m = s.match(/^(?:last|latest)\s*(?:biweekly|bi-weekly|bw)\s*(?:q\s*)?(\d+)$/);
    if (m) return { type: "bw", question: Number(m[1]) };

    m = s.match(/^(?:last|latest)\s*(?:week|weekly|w)\s*(?:q\s*)?(\d+)$/);
    if (m) return { type: "w", question: Number(m[1]) };

    m = s.match(/^(?:lbw|lastbw)\s*(?:q\s*)?(\d+)$/);
    if (m) return { type: "bw", question: Number(m[1]) };

    m = s.match(/^(?:lw|lastw|last week)\s*(?:q\s*)?(\d+)$/);
    if (m) return { type: "w", question: Number(m[1]) };

    return null;
  }

  async function resolve(input) {
    const raw = normalize(input);
    if (!raw) throw new Error("Enter a command");

    if (/^https:\/\/(www\.)?leetcode\.com\//i.test(raw)) return { title: "LeetCode link", url: raw };
    if (/^(help|h|\?)$/i.test(raw)) return { type: "help" };
    if (/^(stats|me|profile)$/i.test(raw)) return { type: "stats", stats: await getStats() };
    if (/^(potd|daily|today|d)$/i.test(raw)) return getDaily();

    let m = raw.match(/^(?:#|p|problem\s*)?(\d+)$/i);
    if (m) return findProblem(m[1]);

    const last = tokenizeLast(raw);
    if (last) return lastContest(last.type, last.question);

    const contest = tokenizeContest(raw);
    if (contest) {
      const slug = contestSlug(contest.type, contest.contest);
      return getContest(slug, contest.question);
    }

    m = raw.match(/^(bw|w)\s*(\d+)$/);
    if (m) return { title: `Contest ${m[2]}`, url: contestURL(contestSlug(m[1], m[2])) };

    return searchByTitle(raw);
  }

  // -----------------------------
  // UI - Minimalist
  // -----------------------------

  const css = `
    #lc-turbo-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(0, 0, 0, 0.4);
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    #lc-turbo-panel {
      width: 400px;
      max-width: 90vw;
      background: #1e1e1e;
      border: 1px solid #333;
      padding: 16px;
      color: #e5e5e5;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    #lc-turbo-header {
      font-size: 13px;
      margin-bottom: 12px;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
    #lc-turbo-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #444;
      background: #2a2a2a;
      color: #fff;
      outline: none;
    }
    #lc-turbo-input:focus {
      border-color: #666;
    }
    #lc-turbo-status {
      color: #888;
      font-size: 13px;
      margin-top: 10px;
      min-height: 18px;
    }
    #lc-turbo-help-btn {
      cursor: pointer;
      color: #666;
    }
    #lc-turbo-help-btn:hover {
      color: #ccc;
    }
    #lc-turbo-results {
      margin-top: 8px;
      max-height: 45vh;
      overflow-y: auto;
    }
    .lc-turbo-item {
      padding: 8px 10px;
      font-size: 14px;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .lc-turbo-item:hover {
      background: #2a2a2a;
      border-color: #444;
    }
    .lc-turbo-item.active {
      background: #2a2a2a;
      border-color: #6ea8fe;
    }
    .lc-turbo-help-row {
      padding: 6px 2px;
      border-top: 1px solid #2a2a2a;
    }
    .lc-turbo-help-row:first-child {
      border-top: none;
    }
    .lc-turbo-help-cmd {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 12px;
      color: #ddd;
    }
    .lc-turbo-help-desc {
      font-size: 12px;
      color: #888;
      margin-top: 2px;
    }
    .lc-stats-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .lc-stats-solved {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
    }
    .lc-stats-solved-total {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }
    .lc-stats-solved-label {
      font-size: 12px;
      color: #888;
      margin-right: 4px;
    }
    .lc-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
    }
    .lc-pill.easy { color: #2ecc71; }
    .lc-pill.medium { color: #f5a623; }
    .lc-pill.hard { color: #e74c3c; }
    .lc-stats-tiles {
      display: flex;
      gap: 8px;
    }
    .lc-stat-tile {
      flex: 1;
      background: #262626;
      border: 1px solid #383838;
      border-radius: 8px;
      padding: 8px 6px;
      text-align: center;
    }
    .lc-stat-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .lc-stat-tile-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 3px;
    }
    #lc-turbo-cal-label {
      font-size: 11px;
      color: #666;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    #lc-turbo-cal-wrap {
      overflow-x: auto;
      padding-bottom: 4px;
    }
    #lc-turbo-cal-wrap::-webkit-scrollbar {
      height: 6px;
    }
    #lc-turbo-cal-wrap::-webkit-scrollbar-thumb {
      background: #383838;
      border-radius: 3px;
    }
    #lc-turbo-cal {
      display: grid;
      grid-auto-flow: column;
      grid-template-rows: repeat(7, 9px);
      grid-auto-columns: 9px;
      gap: 2px;
      width: max-content;
    }
    .lc-cal-cell {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      background: #2a2a2a;
    }
    .lc-cal-cell.l1 { background: #0e4429; }
    .lc-cal-cell.l2 { background: #006d32; }
    .lc-cal-cell.l3 { background: #26a641; }
    .lc-cal-cell.l4 { background: #39d353; }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const overlay = make("div", { id: "lc-turbo-overlay" });
  const panel = make("div", { id: "lc-turbo-panel" });
  
  const HELP = [
    ["<number> / p<number> / #<number>", "Open problem by number", "1, p42, #200"],
    ["<title text>", "Search by problem title", "two sum"],
    ["potd / daily / today / d", "Today's daily challenge", "potd"],
    ["w<contest>q<question>", "Weekly contest question", "w522q1"],
    ["bw<contest>q<question>", "Biweekly contest question", "bw193q2"],
    ["w<contest> / bw<contest>", "Open a contest's landing page", "w522"],
    ["last week q<n> / lw q<n>", "Question from latest weekly contest", "last week q1"],
    ["last biweekly q<n> / lbw q<n>", "Question from latest biweekly contest", "lbw q2"],
    ["<leetcode.com URL>", "Open the link directly", "leetcode.com/problems/two-sum/"],
    ["help / h / ?", "Show this help", "help"],
    ["↑ / ↓, Enter, or 1-9", "Navigate & open a results list", "(after a title search)"],
    ["stats / me / profile", "Solved count, streak & calendar", "stats"]
  ];

  const helpBtn = make("span", { id: "lc-turbo-help-btn", title: "Show help", text: "?", onclick: showHelp });
  const header = make("div", { id: "lc-turbo-header" }, [
    make("span", { text: "LeetCode Turbo Opener" }),
    make("span", {}, [helpBtn, make("span", { text: " · ESC to close" })])
  ]);

  const input = make("input", {
    id: "lc-turbo-input",
    type: "text",
    placeholder: "e.g., two sum, w522q1, potd, help",
    autocomplete: "off",
    spellcheck: "false"
  });

  const status = make("div", { id: "lc-turbo-status" });
  const results = make("div", { id: "lc-turbo-results" });

  panel.append(header, input, status, results);
  overlay.append(panel);
  document.body.append(overlay);

  let currentItems = [];
  let highlightIndex = -1;

  function open() {
    overlay.style.display = "flex";
    input.focus();
    input.select();
  }

  function close() {
    overlay.style.display = "none";
    status.textContent = "";
    clearResults();
  }

  function message(text, error = false) {
    status.textContent = text;
    status.style.color = error ? "#fca5a5" : "#888";
  }

  function clearResults() {
    currentItems = [];
    highlightIndex = -1;
    results.innerHTML = "";
  }

  function selectItem(index) {
    const item = currentItems[index];
    if (!item) return;
    openNewTab(item.url);
    close();
  }

  function renderHighlight() {
    [...results.children].forEach((el, i) => {
      const active = i === highlightIndex;
      el.classList.toggle("active", active);
      if (active) el.scrollIntoView({ block: "nearest" });
    });
  }

  function moveHighlight(delta) {
    if (!currentItems.length) return;
    highlightIndex = (highlightIndex + delta + currentItems.length) % currentItems.length;
    renderHighlight();
  }

  function showList(items) {
    clearResults();
    currentItems = items;
    items.forEach((item, i) => {
      results.append(make("div", {
        class: "lc-turbo-item",
        text: `${i + 1}. ${item.title}`,
        onclick: () => selectItem(i),
        onmouseenter: () => { highlightIndex = i; renderHighlight(); }
      }));
    });
    highlightIndex = items.length ? 0 : -1;
    renderHighlight();
    message(`${items.length} match${items.length === 1 ? "" : "es"} — ↑↓ + Enter, click, or 1-9`);
  }

  function showHelp() {
    clearResults();
    HELP.forEach(([cmd, desc, example]) => {
      results.append(make("div", { class: "lc-turbo-help-row" }, [
        make("div", { class: "lc-turbo-help-cmd", text: cmd }),
        make("div", { class: "lc-turbo-help-desc", text: `${desc} · e.g. ${example}` })
      ]));
    });
    message("Command reference");
    input.focus();
  }

  function calendarLevel(count) {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  }

  function buildCalendarDays(calendar) {
    const days = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = 370; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = Math.floor(d.getTime() / 1000);
      days.push({ date: d, count: calendar[key] || 0 });
    }
    return days;
  }

  function statTile(value, label) {
    return make("div", { class: "lc-stat-tile" }, [
      make("div", { class: "lc-stat-tile-value", text: value }),
      make("div", { class: "lc-stat-tile-label", text: label })
    ]);
  }

  function showStats(stats) {
    clearResults();

    const card = make("div", { class: "lc-stats-card" }, [
      make("div", { class: "lc-stats-solved" }, [
        make("span", { class: "lc-stats-solved-total", text: String(stats.total) }),
        make("span", { class: "lc-stats-solved-label", text: "solved" }),
        make("span", { class: "lc-pill easy", text: `${stats.easy} Easy` }),
        make("span", { class: "lc-pill medium", text: `${stats.medium} Medium` }),
        make("span", { class: "lc-pill hard", text: `${stats.hard} Hard` })
      ]),
      make("div", { class: "lc-stats-tiles" }, [
        statTile(`🔥 ${stats.currentStreak}`, "Current streak"),
        statTile(String(stats.maxStreak), "Max streak"),
        statTile(String(stats.activeDays), "Active days")
      ])
    ]);

    const calLabel = make("div", { id: "lc-turbo-cal-label", text: "Submissions — last 12 months" });

    const grid = make("div", { id: "lc-turbo-cal" });
    buildCalendarDays(stats.calendar).forEach(day => {
      grid.append(make("div", {
        class: `lc-cal-cell l${calendarLevel(day.count)}`,
        title: `${day.date.toISOString().slice(0, 10)}: ${day.count} submission${day.count === 1 ? "" : "s"}`
      }));
    });
    const calWrap = make("div", { id: "lc-turbo-cal-wrap" }, [grid]);

    results.append(card, calLabel, calWrap);
    message("LeetCode stats");
    input.focus();

    requestAnimationFrame(() => { calWrap.scrollLeft = calWrap.scrollWidth; });
  }

  async function run() {
    if (busy) return;
    const command = input.value.trim();
    if (!command) return;

    busy = true;
    clearResults();
    message("Resolving...");

    try {
      const result = await resolve(command);

      if (result?.type === "help") {
        showHelp();
        return;
      }
      if (result?.type === "list") {
        showList(result.items);
        return;
      }
      if (result?.type === "stats") {
        showStats(result.stats);
        return;
      }
      if (!result?.url) throw new Error("No URL resolved");

      openNewTab(result.url);
      close();
    } catch (err) {
      message(err.message || "Failed to resolve command", true);
    } finally {
      busy = false;
    }
  }

  input.addEventListener("keydown", event => {
    if (currentItems.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (/^[1-9]$/.test(event.key) && Number(event.key) <= currentItems.length) {
        event.preventDefault();
        selectItem(Number(event.key) - 1);
        return;
      }
      if (event.key === "Enter" && highlightIndex >= 0) {
        event.preventDefault();
        selectItem(highlightIndex);
        return;
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      run();
    }
    if (event.key === "Escape") close();
  });

  input.addEventListener("input", () => {
    if (currentItems.length) clearResults();
  });

  overlay.addEventListener("mousedown", event => {
    if (event.target === overlay) close();
  });

  document.addEventListener("keydown", event => {
    if (event.altKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      if (overlay.style.display === "flex") close();
      else open();
    }
    if (event.key === "Escape" && overlay.style.display === "flex") close();
  });

  console.log("[LC Turbo] Loaded minimalist version. Shortcut: Alt+L");
})();
