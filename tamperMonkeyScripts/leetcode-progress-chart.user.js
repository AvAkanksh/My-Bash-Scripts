// ==UserScript==
// @name         LeetCode Progress Chart (Profile)
// @namespace    https://github.com/AvAkanksh
// @version      2.0.0
// @description  On your own profile: mirrors the leetcode.com/progress/ solved-per-day chart (difficulty-colored bars). On other profiles: falls back to a submissions-per-day bar + cumulative line, since LeetCode doesn't expose the solved-per-day data publicly.
// @author       AvAkanksh
// @match        https://leetcode.com/u/*
// @icon         https://leetcode.com/favicon-32x32.png
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

/*
 * Two data sources, switched on whether you're looking at your own profile:
 *
 * - Own profile: `userProgressCalendarV2`, the exact GraphQL query behind
 *   leetcode.com/progress/ (found by grepping that page's own bundle). It
 *   returns real distinct-problems-solved-per-day, broken down by
 *   difficulty - but takes no `username` argument, so it is always scoped
 *   to whoever is logged in regardless of which profile URL you call it
 *   from. Verified live: totals match the official page exactly.
 *
 * - Any other profile: `matchedUser.userCalendar.submissionCalendar`, a
 *   full trailing year of per-day *submission* counts (any verdict, not
 *   just accepted/distinct). This is public data, works for any username,
 *   and is what LeetCode's own profile calendar heatmap is built from.
 *   (`recentAcSubmissionList`, which does have per-problem accepted
 *   detail, is hard-capped by the backend at 20 results regardless of the
 *   requested limit - confirmed live - so it can't cover a real date
 *   range and isn't used here.)
 */

(function () {
  'use strict';

  const CACHE_TTL_MS = 15 * 60 * 1000;
  const DAY_SEC = 86400;
  const DAY_MS = DAY_SEC * 1000;
  const DIFF_COLORS = { easy: '#00b8a3', medium: '#ffc01e', hard: '#ff375f' };

  const RANGES = {
    week: { label: 'Week', days: 7 },
    month: { label: 'Month', days: 30 },
    quarter: { label: '3 Months', days: 90 },
    half: { label: '6 Months', days: 182 },
    year: { label: 'Year', days: 365, yearly: true }, // uses the monthly rollup instead of daily fetches
  };

  const PROGRESS_CALENDAR_QUERY = `
    query userProgressCalendarV2($queryType: ProgressCalendarQueryTypeEnum!, $year: Int!, $month: Int, $groupByWeek: Boolean) {
      userProgressCalendarV2(queryType: $queryType, year: $year, month: $month, groupByWeek: $groupByWeek) {
        dateSolvedInfoWithinMonth { date easySolvedNum mediumSolvedNum hardSolvedNum }
        dateSubmissionNumWithinMonth { date numSubmitted }
        monthSolvedInfoWithinYear { month easySolvedNum mediumSolvedNum hardSolvedNum }
        monthSubmissionNumWithinYear { month numSubmitted }
      }
    }`;

  const SUBMISSION_CALENDAR_QUERY = `
    query userProfileCalendar($username: String!) {
      matchedUser(username: $username) {
        userCalendar { submissionCalendar }
      }
    }`;

  const STATUS_QUERY = `
    query globalData {
      userStatus { isSignedIn username }
    }`;

  const state = {
    urlUsername: null,
    loggedInUsername: null,
    isOwnProfile: false,
    mode: 'SOLVED', // own profile only: 'SOLVED' | 'SUBMISSION'
    range: 'month',
    chart: null,
  };

  let lastPath = null;

  injectStyle();
  init();
  window.addEventListener('load', init);
  hookSpaNavigation(init);
  watchThemeToggle();

  function init() {
    if (!/^\/u\/[^/]+\/?/.test(location.pathname)) return;
    if (lastPath === location.pathname) return;
    lastPath = location.pathname;
    run().catch((e) => console.error('[LC Progress] fatal error', e));
  }

  async function run() {
    const username = extractUsername();
    if (!username) return;
    state.urlUsername = username;
    state.mode = 'SOLVED';
    state.range = 'month';

    let status = null;
    try {
      status = await fetchUserStatus();
    } catch (e) {
      console.error('[LC Progress] failed to fetch userStatus', e);
    }
    state.loggedInUsername = status && status.isSignedIn ? status.username : null;
    state.isOwnProfile = !!state.loggedInUsername && state.loggedInUsername.toLowerCase() === username.toLowerCase();

    const root = await mountSection();
    if (!root) return;
    renderAll(root).catch((e) => console.error('[LC Progress] render failed', e));
  }

  // ---------- shared fetch/cache helpers ----------

  function extractUsername() {
    const m = location.pathname.match(/\/u\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function gqlFetch(query, variables) {
    const res = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error('GraphQL HTTP ' + res.status);
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data;
  }

  async function fetchUserStatus() {
    const data = await gqlFetch(STATUS_QUERY, {});
    return data && data.userStatus;
  }

  function cacheGet(key) {
    const raw = GM_getValue(key, null);
    if (!raw) return null;
    if (Date.now() - raw.fetchedAt > CACHE_TTL_MS) return null;
    return raw.value;
  }

  function cacheSet(key, value) {
    GM_setValue(key, { value, fetchedAt: Date.now() });
  }

  // Every calendar month (year/month pair) needed to cover the trailing
  // `days`-day window ending today - e.g. "Week" near the start of a
  // month needs both this month and last month's data.
  function monthsSpanning(days, today) {
    const start = new Date(today.getTime() - (days - 1) * DAY_MS);
    const out = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCursor = new Date(today.getFullYear(), today.getMonth(), 1);
    while (cursor <= endCursor) {
      out.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return out;
  }

  // ---------- own-profile data (userProgressCalendarV2) ----------

  async function fetchOwnMonth(username, year, month, queryType) {
    const key = 'lc_progress_month_' + username + '_' + year + '_' + month + '_' + queryType;
    const cached = cacheGet(key);
    if (cached) return cached;
    const data = await gqlFetch(PROGRESS_CALENDAR_QUERY, { queryType, year, month, groupByWeek: false });
    const cal = data.userProgressCalendarV2;
    let days;
    if (queryType === 'SOLVED') {
      days = (cal.dateSolvedInfoWithinMonth || []).map((d) => ({
        // keep as the raw "YYYY-MM-DD" string - a Date object doesn't
        // survive GM_setValue's JSON round-trip (it comes back as a
        // plain string on the next cache hit, so .toLocaleDateString()
        // would throw on any *second* visit to a cached range).
        date: d.date,
        easy: d.easySolvedNum, medium: d.mediumSolvedNum, hard: d.hardSolvedNum,
        total: d.easySolvedNum + d.mediumSolvedNum + d.hardSolvedNum,
      }));
    } else {
      days = (cal.dateSubmissionNumWithinMonth || []).map((d) => ({
        date: d.date,
        easy: 0, medium: 0, hard: 0, total: d.numSubmitted,
      }));
    }
    cacheSet(key, days);
    return days;
  }

  async function fetchOwnYear(username, year, queryType) {
    const key = 'lc_progress_year_' + username + '_' + year + '_' + queryType;
    const cached = cacheGet(key);
    if (cached) return cached;
    const data = await gqlFetch(PROGRESS_CALENDAR_QUERY, { queryType, year, month: null, groupByWeek: false });
    const cal = data.userProgressCalendarV2;
    let months;
    if (queryType === 'SOLVED') {
      months = (cal.monthSolvedInfoWithinYear || []).map((m) => ({
        month: m.month, easy: m.easySolvedNum, medium: m.mediumSolvedNum, hard: m.hardSolvedNum,
        total: m.easySolvedNum + m.mediumSolvedNum + m.hardSolvedNum,
      }));
    } else {
      months = (cal.monthSubmissionNumWithinYear || []).map((m) => ({
        month: m.month, easy: 0, medium: 0, hard: 0, total: m.numSubmitted,
      }));
    }
    cacheSet(key, months);
    return months;
  }

  async function generateOwnData(range, mode, username) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cfg = RANGES[range];

    if (cfg.yearly) {
      const months = await fetchOwnYear(username, today.getFullYear(), mode);
      const rows = months
        .filter((m) => m.month <= today.getMonth() + 1)
        .map((m) => ({
          label: new Date(today.getFullYear(), m.month - 1, 1).toLocaleDateString(undefined, { month: 'short' }),
          easy: m.easy, medium: m.medium, hard: m.hard, total: m.total,
        }));
      return finishOwnData(rows, 'months');
    }

    const start = new Date(today.getTime() - (cfg.days - 1) * DAY_MS);
    const monthsToFetch = monthsSpanning(cfg.days, today);
    const perMonth = await Promise.all(monthsToFetch.map((m) => fetchOwnMonth(username, m.year, m.month, mode)));
    const rows = [];
    for (const days of perMonth) {
      for (const d of days) {
        const dDate = new Date(d.date + 'T00:00:00');
        if (dDate < start || dDate > today) continue;
        rows.push({
          label: dDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          easy: d.easy, medium: d.medium, hard: d.hard, total: d.total,
        });
      }
    }
    return finishOwnData(rows, 'days');
  }

  function finishOwnData(rows, unitLabel) {
    let easySum = 0, medSum = 0, hardSum = 0, total = 0, active = 0, cumulative = 0;
    for (const r of rows) {
      easySum += r.easy; medSum += r.medium; hardSum += r.hard; total += r.total;
      cumulative += r.total;
      r.cumulative = cumulative;
      if (r.total > 0) active++;
    }
    return { rows, total, easySum, medSum, hardSum, active, unitLabel };
  }

  // ---------- other-profile data (submissionCalendar) ----------

  async function fetchSubmissionCalendar(username) {
    const key = 'lc_progress_subcal_' + username;
    const cached = cacheGet(key);
    if (cached) return new Map(cached);
    const data = await gqlFetch(SUBMISSION_CALENDAR_QUERY, { username });
    const cal = data.matchedUser && data.matchedUser.userCalendar;
    if (!cal) return null;
    const raw = JSON.parse(cal.submissionCalendar || '{}');
    const map = new Map();
    for (const [epochSec, count] of Object.entries(raw)) map.set(Number(epochSec), Number(count));
    cacheSet(key, [...map.entries()]);
    return map;
  }

  function epochDay(sec) {
    return Math.floor(sec / DAY_SEC);
  }

  function generateOtherData(range, calendar) {
    const days = RANGES[range].days;
    const today = epochDay(Math.floor(Date.now() / 1000));
    const startDay = today - (days - 1);

    const byDay = new Map();
    for (const [epochSec, count] of calendar) byDay.set(epochDay(epochSec), count);

    const rows = [];
    let cumulative = 0, total = 0, active = 0;
    for (let d = startDay; d <= today; d++) {
      const count = byDay.get(d) || 0;
      cumulative += count;
      total += count;
      if (count > 0) active++;
      rows.push({
        label: new Date(d * DAY_SEC * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count, cumulative,
      });
    }
    return { rows, total, active };
  }

  // ---------- DOM mounting ----------

  async function mountSection() {
    const existing = document.getElementById('lc-progress-root');
    if (existing) existing.remove();

    const anchor = await findCalendarAnchor(6000);

    const root = document.createElement('section');
    root.id = 'lc-progress-root';
    root.className = 'lc-progress-card';

    const rangeButtonsHtml = Object.keys(RANGES)
      .map((key) => `<button type="button" class="lc-progress-range-btn${key === state.range ? ' active' : ''}" data-range="${key}">${RANGES[key].label}</button>`)
      .join('');

    if (state.isOwnProfile) {
      root.innerHTML = `
        <div class="lc-progress-header">
          <h3>Coding Activity</h3>
          <div class="lc-progress-controls">
            <div class="lc-progress-mode-group" role="tablist">
              <button type="button" class="lc-progress-mode-btn active" data-mode="SOLVED">Solved</button>
              <button type="button" class="lc-progress-mode-btn" data-mode="SUBMISSION">Submissions</button>
            </div>
            <div class="lc-progress-range-group" role="tablist">${rangeButtonsHtml}</div>
          </div>
        </div>
        <div class="lc-progress-summary"></div>
        <div class="lc-progress-chart-wrap"><canvas class="lc-progress-chart"></canvas></div>
      `;
      root.querySelectorAll('.lc-progress-mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.mode = btn.dataset.mode;
          root.querySelectorAll('.lc-progress-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
          renderAll(root).catch((e) => console.error('[LC Progress] render failed', e));
        });
      });
    } else {
      root.innerHTML = `
        <div class="lc-progress-header">
          <h3>Coding Activity</h3>
          <div class="lc-progress-range-group" role="tablist">${rangeButtonsHtml}</div>
        </div>
        <div class="lc-progress-summary"></div>
        <div class="lc-progress-chart-wrap"><canvas class="lc-progress-chart"></canvas></div>
      `;
    }

    root.querySelectorAll('.lc-progress-range-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.range = btn.dataset.range;
        root.querySelectorAll('.lc-progress-range-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderAll(root).catch((e) => console.error('[LC Progress] render failed', e));
      });
    });

    if (anchor && anchor.parentElement) {
      anchor.insertAdjacentElement('afterend', root);
    } else {
      // Some profile layouts (e.g. official/staff accounts) don't have the
      // usual calendar card at all - fall back to the top of <main> itself
      // rather than above it, so we don't land above the navbar.
      const main = await waitForElement('main', 3000);
      if (main) main.insertBefore(root, main.firstChild);
      else document.body.insertBefore(root, document.body.firstChild);
    }

    applyThemeClass(root);
    return root;
  }

  // Finds LeetCode's own activity-calendar card by locating the "submissions
  // in the past ..." label and climbing to its card wrapper.
  function findCalendarAnchor(timeoutMs) {
    return new Promise((resolve) => {
      const tryFind = () => {
        const label = [...document.querySelectorAll('span, div')].find(
          (el) => el.children.length === 0 && /submissions? in the past/i.test(el.textContent || '')
        );
        if (!label) return null;
        let cur = label;
        for (let i = 0; i < 10 && cur; i++) {
          if (cur.classList && cur.classList.contains('rounded-lg') && /bg-layer-1/.test(cur.className)) {
            return cur.parentElement || cur;
          }
          cur = cur.parentElement;
        }
        return null;
      };
      const found = tryFind();
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = tryFind();
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(tryFind()); }, timeoutMs);
    });
  }

  // ---------- render dispatch ----------

  // Bumped on every renderAll call (button click, theme toggle, initial
  // load) so a slower, older fetch can never overwrite what a newer one
  // already rendered - without this, rapid clicking between mode/range
  // buttons could apply an old response after a newer one, or crash
  // trying to draw into a canvas a newer call already tore down.
  let renderGen = 0;

  async function renderAll(root) {
    const myGen = ++renderGen;
    if (state.isOwnProfile) {
      let data;
      try {
        data = await generateOwnData(state.range, state.mode, state.urlUsername);
      } catch (e) {
        console.error('[LC Progress] failed to load own progress data', e);
        if (myGen === renderGen) renderNote(root, "Couldn't load your progress data - see the console for details.");
        return;
      }
      if (myGen !== renderGen) return; // superseded by a newer click
      renderOwnSummary(root, data);
      renderOwnChart(root, data);
    } else {
      let calendar;
      try {
        calendar = await fetchSubmissionCalendar(state.urlUsername);
      } catch (e) {
        console.error('[LC Progress] failed to load submission calendar', e);
        if (myGen === renderGen) {
          const privacyError = /no permission/i.test(String(e.message));
          renderNote(root, privacyError ? 'This user has made their submission activity private.' : "Couldn't load this user's activity - see the console for details.");
        }
        return;
      }
      if (myGen !== renderGen) return;
      if (!calendar) {
        renderNote(root, "This user's activity isn't available.");
        return;
      }
      const data = generateOtherData(state.range, calendar);
      renderOtherSummary(root, data);
      renderOtherChart(root, data);
    }
  }

  // Shown in place of the chart when data can't be loaded (private
  // calendar, deleted account, transient API error, etc). Leaves a fresh
  // canvas in the DOM rather than just clearing chart-wrap, so a later
  // successful render always has something to draw into.
  function renderNote(root, text) {
    destroyChart();
    root.querySelector('.lc-progress-summary').innerHTML = `<p class="lc-progress-note">${text}</p>`;
    const chartWrap = root.querySelector('.lc-progress-chart-wrap');
    if (chartWrap) chartWrap.innerHTML = '<canvas class="lc-progress-chart"></canvas>';
  }

  // ---------- own-profile rendering (matches leetcode.com/progress/) ----------

  function renderOwnSummary(root, data) {
    const activeLabel = data.unitLabel === 'months' ? 'Active months' : 'Active days';
    const label = state.mode === 'SOLVED' ? 'Solved' : 'Submissions';
    const diffRow = state.mode === 'SOLVED'
      ? `<div class="lc-progress-diff">
          <span class="lc-progress-diff-item" style="color:${DIFF_COLORS.easy}">Easy ${data.easySum}</span>
          <span class="lc-progress-diff-item" style="color:${DIFF_COLORS.medium}">Med. ${data.medSum}</span>
          <span class="lc-progress-diff-item" style="color:${DIFF_COLORS.hard}">Hard ${data.hardSum}</span>
        </div>`
      : '';
    root.querySelector('.lc-progress-summary').innerHTML = `
      <div class="lc-progress-stats">
        <div class="lc-progress-stat"><span class="lc-progress-stat-value">${data.total}</span><span class="lc-progress-stat-label">${label}</span></div>
        <div class="lc-progress-stat"><span class="lc-progress-stat-value">${data.active}</span><span class="lc-progress-stat-label">${activeLabel}</span></div>
      </div>
      ${diffRow}
    `;
  }

  function renderOwnChart(root, data) {
    const canvas = root.querySelector('.lc-progress-chart');
    const styles = getComputedStyle(root);
    const gridColor = styles.getPropertyValue('--lc-gridline').trim();
    const textColor = styles.getPropertyValue('--lc-text-secondary').trim();
    const barColor = styles.getPropertyValue('--lc-green').trim();
    const lineColor = styles.getPropertyValue('--lc-series-1').trim();

    destroyChart();

    const labels = data.rows.map((r) => r.label);
    let datasets;
    if (state.mode === 'SOLVED') {
      datasets = [
        { label: 'Easy', data: data.rows.map((r) => r.easy), backgroundColor: DIFF_COLORS.easy, stack: 's' },
        { label: 'Medium', data: data.rows.map((r) => r.medium), backgroundColor: DIFF_COLORS.medium, stack: 's' },
        { label: 'Hard', data: data.rows.map((r) => r.hard), backgroundColor: DIFF_COLORS.hard, stack: 's' },
      ].map((d) => Object.assign(d, { type: 'bar', borderRadius: 1, barPercentage: 0.7, categoryPercentage: 0.9, yAxisID: 'y' }));
    } else {
      datasets = [{
        type: 'bar', label: 'Submissions', data: data.rows.map((r) => r.total),
        backgroundColor: hexToRgba(barColor, 0.55), borderRadius: 2, barPercentage: 0.7, categoryPercentage: 0.9, stack: 's', yAxisID: 'y',
      }];
    }
    datasets.push({
      type: 'line', label: 'Cumulative', data: data.rows.map((r) => r.cumulative),
      borderColor: lineColor, backgroundColor: lineColor, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
      tension: 0.2, fill: false, yAxisID: 'y1', order: 0,
    });

    state.chart = new Chart(canvas, {
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', align: 'end', labels: { color: textColor, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rect', font: { size: 11 } } },
          tooltip: { callbacks: { title: (items) => items[0].label } },
        },
        scales: {
          x: { stacked: true, ticks: { color: textColor, maxTicksLimit: 8, autoSkip: true }, grid: { display: false } },
          y: { stacked: true, position: 'left', beginAtZero: true, ticks: { color: textColor, precision: 0, maxTicksLimit: 5 }, grid: { color: gridColor }, title: { display: true, text: state.mode === 'SOLVED' ? 'Solved' : 'Submissions', color: textColor, font: { size: 11 } } },
          y1: { position: 'right', beginAtZero: true, ticks: { color: textColor, precision: 0, maxTicksLimit: 5 }, grid: { display: false }, title: { display: true, text: 'Cumulative', color: textColor, font: { size: 11 } } },
        },
      },
    });
  }

  // ---------- other-profile rendering (submissions + cumulative) ----------

  function renderOtherSummary(root, data) {
    const avg = data.active ? (data.total / data.active).toFixed(1) : '0.0';
    root.querySelector('.lc-progress-summary').innerHTML = `
      <div class="lc-progress-stats">
        <div class="lc-progress-stat"><span class="lc-progress-stat-value">${data.total}</span><span class="lc-progress-stat-label">Submissions</span></div>
        <div class="lc-progress-stat"><span class="lc-progress-stat-value">${data.active}</span><span class="lc-progress-stat-label">Active days</span></div>
        <div class="lc-progress-stat"><span class="lc-progress-stat-value">${avg}</span><span class="lc-progress-stat-label">Avg per active day</span></div>
      </div>
    `;
  }

  function renderOtherChart(root, data) {
    const canvas = root.querySelector('.lc-progress-chart');
    const styles = getComputedStyle(root);
    const barColor = styles.getPropertyValue('--lc-green').trim();
    const lineColor = styles.getPropertyValue('--lc-series-1').trim();
    const gridColor = styles.getPropertyValue('--lc-gridline').trim();
    const textColor = styles.getPropertyValue('--lc-text-secondary').trim();

    destroyChart();

    state.chart = new Chart(canvas, {
      data: {
        labels: data.rows.map((r) => r.label),
        datasets: [
          { type: 'bar', label: 'Submissions', data: data.rows.map((r) => r.count), backgroundColor: hexToRgba(barColor, 0.55), borderRadius: 2, barPercentage: 0.7, categoryPercentage: 0.9, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Cumulative', data: data.rows.map((r) => r.cumulative), borderColor: lineColor, backgroundColor: lineColor, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.2, fill: false, yAxisID: 'y1', order: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', align: 'end', labels: { color: textColor, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rect', font: { size: 11 } } },
          tooltip: { callbacks: { title: (items) => items[0].label } },
        },
        scales: {
          x: { ticks: { color: textColor, maxTicksLimit: 8, autoSkip: true }, grid: { display: false } },
          y: { position: 'left', beginAtZero: true, ticks: { color: textColor, precision: 0, maxTicksLimit: 5 }, grid: { color: gridColor }, title: { display: true, text: 'Per day', color: textColor, font: { size: 11 } } },
          y1: { position: 'right', beginAtZero: true, ticks: { color: textColor, precision: 0, maxTicksLimit: 5 }, grid: { display: false }, title: { display: true, text: 'Cumulative', color: textColor, font: { size: 11 } } },
        },
      },
    });
  }

  function destroyChart() {
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
  }

  function hexToRgba(hex, alpha) {
    const m = hex.replace('#', '');
    const r = parseInt(m.substring(0, 2), 16);
    const g = parseInt(m.substring(2, 4), 16);
    const b = parseInt(m.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ---------- theme ----------

  function isDarkMode() {
    return document.documentElement.classList.contains('dark');
  }

  function applyThemeClass(root) {
    root.classList.toggle('lc-progress-dark', isDarkMode());
  }

  function watchThemeToggle() {
    const obs = new MutationObserver(() => {
      const root = document.getElementById('lc-progress-root');
      if (root) {
        applyThemeClass(root);
        if (state.chart) renderAll(root).catch((e) => console.error('[LC Progress] render failed', e));
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // ---------- utilities ----------

  function waitForElement(selector, timeoutMs) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(document.querySelector(selector)); }, timeoutMs);
    });
  }

  function hookSpaNavigation(onNav) {
    const fire = () => setTimeout(onNav, 500);
    const _push = history.pushState;
    const _replace = history.replaceState;
    history.pushState = function (...args) { _push.apply(this, args); fire(); };
    history.replaceState = function (...args) { _replace.apply(this, args); fire(); };
    window.addEventListener('popstate', fire);
  }

  function injectStyle() {
    const style = document.createElement('style');
    style.textContent = `
      .lc-progress-card {
        --lc-surface: #fcfcfb;
        --lc-text-primary: #0b0b0b;
        --lc-text-secondary: #52514e;
        --lc-gridline: #e1e0d9;
        --lc-border: rgba(11,11,11,0.10);
        --lc-green: #008300;
        --lc-series-1: #2a78d6;

        background: var(--lc-surface);
        color: var(--lc-text-primary);
        border: 1px solid var(--lc-border);
        border-radius: 12px;
        padding: 16px 18px;
        margin-top: 16px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .lc-progress-card.lc-progress-dark {
        --lc-surface: #1a1a19;
        --lc-text-primary: #ffffff;
        --lc-text-secondary: #c3c2b7;
        --lc-gridline: #2c2c2a;
        --lc-border: rgba(255,255,255,0.10);
        --lc-green: #008300;
        --lc-series-1: #3987e5;
      }
      .lc-progress-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 12px;
      }
      .lc-progress-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--lc-text-primary);
      }
      .lc-progress-controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .lc-progress-mode-group,
      .lc-progress-range-group {
        display: flex;
        gap: 4px;
        background: var(--lc-gridline);
        border-radius: 8px;
        padding: 3px;
      }
      .lc-progress-mode-btn,
      .lc-progress-range-btn {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--lc-text-secondary);
        cursor: pointer;
      }
      .lc-progress-mode-btn:hover,
      .lc-progress-range-btn:hover {
        color: var(--lc-text-primary);
      }
      .lc-progress-mode-btn.active,
      .lc-progress-range-btn.active {
        background: var(--lc-surface);
        color: var(--lc-text-primary);
        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
      }
      .lc-progress-summary {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
      }
      .lc-progress-stats {
        display: flex;
        gap: 24px;
      }
      .lc-progress-stat {
        display: flex;
        flex-direction: column;
      }
      .lc-progress-stat-value {
        font-size: 20px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .lc-progress-stat-label {
        font-size: 11px;
        color: var(--lc-text-secondary);
      }
      .lc-progress-diff {
        display: flex;
        gap: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      .lc-progress-note {
        margin: 0;
        font-size: 12px;
        color: var(--lc-text-secondary);
      }
      .lc-progress-chart-wrap {
        height: 200px;
      }
    `;
    document.head.appendChild(style);
  }
})();
