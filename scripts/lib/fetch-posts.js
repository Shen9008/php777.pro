'use strict';

require('./load-env.js');

const API_BASE = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const SITE_DOMAIN = process.env.SITE_DOMAIN || process.env.site_domain;

const DEFAULT_FILTER_KEY = 'filters[site][domain][$eq]';

/**
 * Resolved config for GET {base}/{collection} (used by sync + doctor).
 * @param {object} [opts]
 * @param {string} [opts.baseUrl]
 * @param {string} [opts.siteDomain] - override SITE_DOMAIN for this fetch only
 */
function getPostsSyncConfig(opts = {}) {
  const base = String(opts.baseUrl || API_BASE).replace(/\/$/, '');
  const collection = String(process.env.POSTS_COLLECTION || 'posts')
    .trim()
    .replace(/^\/+/, '')
    .split('/')[0]
    .replace(/\/+$/, '');
  const siteDomain = String(opts.siteDomain !== undefined ? opts.siteDomain : SITE_DOMAIN || '')
    .trim();
  const skipFilter = /^1|true|yes$/i.test(String(process.env.SKIP_POSTS_SITE_FILTER || '').trim());

  const rawKey = process.env.POSTS_SITE_FILTER_KEY;
  let filterKey;
  if (rawKey === undefined || rawKey === null) {
    filterKey = DEFAULT_FILTER_KEY;
  } else {
    filterKey = String(rawKey).trim();
  }

  const applySiteFilter = Boolean(siteDomain && !skipFilter && filterKey);

  return {
    base,
    collection,
    siteDomain,
    skipFilter,
    filterKey,
    applySiteFilter,
    endpoint: `${base}/${collection}`,
  };
}

/**
 * Build a sample URL for tooling / docs (page 1 by default).
 * @param {object} cfg - from getPostsSyncConfig()
 * @param {number} [page]
 */
function buildSamplePostsUrl(cfg, page = 1) {
  const url = new URL(cfg.endpoint);
  if (cfg.applySiteFilter) {
    url.searchParams.set(cfg.filterKey, cfg.siteDomain);
  }
  url.searchParams.set('sort', 'publishedAt:asc');
  url.searchParams.set('pagination[page]', String(page));
  url.searchParams.set('pagination[pageSize]', '100');
  return url.toString();
}

/**
 * Fetches all published posts from Strapi REST `{base}/{POSTS_COLLECTION}`.
 * Optional site filter via POSTS_SITE_FILTER_KEY + SITE_DOMAIN unless SKIP_POSTS_SITE_FILTER is set.
 * @param {object} [opts]
 * @param {string} [opts.baseUrl]
 * @param {string} [opts.siteDomain]
 * @returns {Promise<Array>} Normalised post objects
 */
async function fetchPosts(opts = {}) {
  const cfg = getPostsSyncConfig(opts);
  const allPosts = [];
  let page = 1;
  const pageSize = 100;

  if (!cfg.siteDomain && !cfg.skipFilter) {
    console.warn('fetch-posts: SITE_DOMAIN / site_domain not set; request is unfiltered by site.');
  }

  const headers = {};
  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }

  while (true) {
    const url = new URL(cfg.endpoint);
    if (cfg.applySiteFilter) {
      url.searchParams.set(cfg.filterKey, cfg.siteDomain);
    }
    url.searchParams.set('sort', 'publishedAt:asc');
    url.searchParams.set('pagination[page]', String(page));
    url.searchParams.set('pagination[pageSize]', String(pageSize));

    let response;
    try {
      response = await fetch(url.toString(), { headers });
    } catch (err) {
      const addr = `${url.protocol}//${url.host}`;
      const detail = err.cause && err.cause.code ? ` (${String(err.cause.code)})` : '';
      let hint =
        ' Check STRAPI_API_URL and network/firewall. If the URL uses HTTPS from Node, TLS or proxy issues can also trigger this.';
      if (/localhost|127\.0\.0\.1/.test(cfg.base)) {
        hint =
          ' Nothing is answering at that address  -  start Strapi locally or set STRAPI_API_URL to your hosted API (see .env.example). Scripts load `.env` then `.env.local` (`.env.local` overrides).';
      }
      throw new Error(`Fetch failed to ${addr}${detail}: ${err.message}.${hint}`, { cause: err });
    }
    if (!response.ok) {
      throw new Error(`Strapi API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const raw = Array.isArray(data) ? data : (data.data || []);
    const posts = Array.isArray(raw) ? raw : [raw];

    for (const p of posts) {
      if (!p || typeof p !== 'object') continue;
      const attrs = p.attributes || p;
      allPosts.push({ id: p.id, ...attrs });
    }

    const pagination = data.meta?.pagination || data.pagination;
    if (!pagination || page >= (pagination.pageCount || 1)) break;
    page++;
  }

  return allPosts;
}

module.exports = {
  fetchPosts,
  getPostsSyncConfig,
  buildSamplePostsUrl,
};
