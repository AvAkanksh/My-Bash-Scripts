// ==UserScript==
// @name         LeetCode Recent AC - Difficulty & Tags
// @namespace    https://github.com/AvAkanksh
// @version      1.0.0
// @description  Shows difficulty (Easy/Medium/Hard) and topic tags next to each problem in the "Recent AC" section of a LeetCode user profile.
// @author       AvAkanksh
// @match        https://leetcode.com/u/*
// @icon         https://leetcode.com/favicon-32x32.png
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, difficulty/tags rarely change
  const RECENT_AC_LIMIT = 20;
  const FETCH_CONCURRENCY = 4;

  const RECENT_AC_QUERY = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }`;

  const QUESTION_QUERY = `
    query questionTitle($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
      }
    }`;

  injectStyle();

  let lastPath = null;

  init();
  window.addEventListener('load', init);
  hookSpaNavigation(init);

  function init() {
    if (!/^\/u\/[^/]+\/?/.test(location.pathname)) return;
    if (lastPath === location.pathname) return;
    lastPath = location.pathname;
    run().catch((e) => console.error('[LC Enhancer] fatal error', e));
  }

  async function run() {
    const username = extractUsername();
    if (!username) return;

    let recent;
    try {
      const data = await gqlFetch(RECENT_AC_QUERY, { username, limit: RECENT_AC_LIMIT });
      recent = (data && data.recentAcSubmissionList) || [];
    } catch (e) {
      console.error('[LC Enhancer] failed to fetch recentAcSubmissionList', e);
      return;
    }
    if (!recent.length) return;

    const uniqueSlugs = [...new Set(recent.map((r) => r.titleSlug))];
    const results = await mapWithConcurrency(uniqueSlugs, FETCH_CONCURRENCY, getQuestionData);

    const slugData = new Map();
    uniqueSlugs.forEach((slug, i) => {
      if (results[i]) slugData.set(slug, results[i]);
    });
    if (!slugData.size) return;

    // Recent AC rows link to /submissions/detail/<submissionId>/, not /problems/<slug>/,
    // so key the lookup by submission id (unique per row, unlike title text which can repeat).
    const idMap = new Map();
    recent.forEach((r) => {
      const qData = slugData.get(r.titleSlug);
      if (qData) idMap.set(r.id, qData);
    });
    if (!idMap.size) return;

    annotateAll(idMap);
    observeForNewAnchors(idMap);
  }

  function extractUsername() {
    const m = location.pathname.match(/\/u\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function gqlFetch(query, variables) {
    const res = await fetch('https://leetcode.com/graphql', {
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

  async function getQuestionData(slug) {
    const cacheKey = 'lc_enh_q_' + slug;
    const cached = GM_getValue(cacheKey, null);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached;

    try {
      const data = await gqlFetch(QUESTION_QUERY, { titleSlug: slug });
      const q = data && data.question;
      if (!q) return null;
      const result = {
        difficulty: q.difficulty,
        tags: (q.topicTags || []).map((t) => t.name),
        ts: Date.now(),
      };
      GM_setValue(cacheKey, result);
      return result;
    } catch (e) {
      console.error('[LC Enhancer] failed to fetch question data for', slug, e);
      return cached || null; // fall back to stale cache if available
    }
  }

  async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let idx = 0;
    async function worker() {
      while (idx < items.length) {
        const cur = idx++;
        try {
          results[cur] = await fn(items[cur]);
        } catch (e) {
          results[cur] = null;
        }
      }
    }
    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
    return results;
  }

  function annotateAll(idMap) {
    const anchors = document.querySelectorAll('a[href^="/submissions/detail/"]');
    anchors.forEach((a) => {
      if (a.dataset.lcEnhanced) return;
      const m = a.getAttribute('href').match(/\/submissions\/detail\/(\d+)/);
      if (!m) return;
      const qData = idMap.get(m[1]);
      if (!qData) return;
      a.classList.add('lc-enh-anchor');
      a.appendChild(buildBadgeRow(qData));
      a.dataset.lcEnhanced = '1';
    });
  }

  function buildBadgeRow(qData) {
    const row = document.createElement('div');
    row.className = 'lc-enh-row';

    const diff = document.createElement('span');
    diff.className = 'lc-enh-diff lc-enh-diff-' + (qData.difficulty || '').toLowerCase();
    diff.textContent = qData.difficulty;
    row.appendChild(diff);

    if (qData.tags && qData.tags.length) {
      const tags = document.createElement('span');
      tags.className = 'lc-enh-tags';
      tags.textContent = qData.tags.join(', ');
      tags.title = qData.tags.join(', ');
      row.appendChild(tags);
    }
    return row;
  }

  function observeForNewAnchors(idMap) {
    if (window.__lcEnhObserver) window.__lcEnhObserver.disconnect();
    const obs = new MutationObserver(debounce(() => annotateAll(idMap), 300));
    obs.observe(document.body, { childList: true, subtree: true });
    window.__lcEnhObserver = obs;
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function hookSpaNavigation(onNav) {
    const fire = () => setTimeout(onNav, 500);
    const _push = history.pushState;
    const _replace = history.replaceState;
    history.pushState = function (...args) {
      _push.apply(this, args);
      fire();
    };
    history.replaceState = function (...args) {
      _replace.apply(this, args);
      fire();
    };
    window.addEventListener('popstate', fire);
  }

  function injectStyle() {
    const style = document.createElement('style');
    style.textContent = `
      .lc-enh-anchor {
        flex-direction: column !important;
        align-items: stretch !important;
        height: auto !important;
        min-height: 56px;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
        gap: 4px;
      }
      .lc-enh-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .lc-enh-diff {
        font-size: 11px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .lc-enh-diff-easy { color: #22c55e; background: rgba(34, 197, 94, 0.14); }
      .lc-enh-diff-medium { color: #f59e0b; background: rgba(245, 158, 11, 0.14); }
      .lc-enh-diff-hard { color: #ef4444; background: rgba(239, 68, 68, 0.14); }
      .lc-enh-tags {
        font-size: 11px;
        color: #8b8b98;
        font-weight: 400;
      }
    `;
    document.head.appendChild(style);
  }
})();
