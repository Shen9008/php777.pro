'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fetchPosts, assertStrictSiteFilter } = require('./lib/fetch-posts.js');
const { normalizePost, validatePost } = require('./lib/normalize-post.js');
const { renderArticle } = require('./lib/render-article.js');
const { generateSitemap } = require('./lib/generate-sitemap.js');

const ROOT = path.resolve(__dirname, '..');
const BLOGS_JSON_PATH = path.join(ROOT, 'assets/data/blogs.json');

const BLOGS_JSON_FIELDS = [
  'slug', 'title', 'meta_title', 'meta_description', 'focus_keyword',
  'category', 'search_intent', 'published_date', 'reading_time',
  'excerpt', 'placeholder_gradient', 'related_posts', 'keywords',
  'cms_updated_at', 'content_hash', 'synced_at',
];

function sortBlogsByLatestSyncFirst(a, b) {
  const tb = new Date(b.synced_at || b.published_date || 0).getTime();
  const ta = new Date(a.synced_at || a.published_date || 0).getTime();
  if (tb !== ta) return tb - ta;
  return String(b.slug).localeCompare(String(a.slug));
}

const sortBlogsForIndex = sortBlogsByLatestSyncFirst;

function parseArgs(argv) {
  const args = {
    all: false,
    refresh: false,
    force: false,
    daily: false,
    limit: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') args.all = true;
    else if (arg === '--refresh') args.refresh = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--daily') args.daily = true;
    else if (arg === '--limit') {
      const n = parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new Error('--limit requires a positive integer');
      }
      args.limit = n;
    }
  }

  return args;
}

function getSlug(raw) {
  return String(raw.slug || raw.documentId || '').trim();
}

function getRawContent(raw) {
  return raw.content || '';
}

function hashContent(content) {
  const str = typeof content === 'string' ? content : JSON.stringify(content || '');
  return crypto.createHash('sha256').update(str).digest('hex');
}

function buildSyncMeta(raw) {
  const updatedAt = raw.updatedAt || raw.publishedAt || '';
  return {
    cms_updated_at: updatedAt ? new Date(updatedAt).toISOString() : '',
    content_hash: hashContent(getRawContent(raw)),
  };
}

function postNeedsRefresh(entry, raw) {
  const meta = buildSyncMeta(raw);
  if (!entry.content_hash || !entry.cms_updated_at) return true;
  if (entry.content_hash !== meta.content_hash) return true;
  if (entry.cms_updated_at !== meta.cms_updated_at) return true;
  return false;
}

function sortByPublishedAsc(a, b) {
  return new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0);
}

function toBlogsEntry(normalized, raw) {
  const entry = {};
  for (const k of BLOGS_JSON_FIELDS) {
    if (normalized[k] !== undefined) entry[k] = normalized[k];
  }
  Object.assign(entry, buildSyncMeta(raw));
  entry.synced_at = new Date().toISOString();
  return entry;
}

function getRelatedSlugs(blogs, currentSlug, opts = {}, limit = 3) {
  const searchIntent = (opts.searchIntent || 'informational').toLowerCase();
  const category = (opts.category || '').toLowerCase();
  const others = blogs.filter((b) => b.slug !== currentSlug);

  const sameIntent = others
    .filter((b) => (b.search_intent || '').toLowerCase() === searchIntent)
    .sort(sortBlogsByLatestSyncFirst);
  const sameIntentSlugs = new Set(sameIntent.map((b) => b.slug));
  const sameCategory = others
    .filter((b) => !sameIntentSlugs.has(b.slug) && category && (b.category || '').toLowerCase() === category)
    .sort(sortBlogsByLatestSyncFirst);
  const sameCategorySlugs = new Set(sameCategory.map((b) => b.slug));
  const rest = others
    .filter((b) => !sameIntentSlugs.has(b.slug) && !sameCategorySlugs.has(b.slug))
    .sort(sortBlogsByLatestSyncFirst);

  const merged = [...sameIntent, ...sameCategory, ...rest];
  return merged.slice(0, limit).map((b) => b.slug);
}

function loadBlogsJson() {
  try {
    const raw = fs.readFileSync(BLOGS_JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveBlogsJson(blogs) {
  const json = JSON.stringify(blogs, null, 2);
  fs.writeFileSync(BLOGS_JSON_PATH, json + '\n', 'utf8');
}

function buildWorklist(strapiPosts, existingBlogs, args) {
  const blogsBySlug = new Map(existingBlogs.map((b) => [b.slug, b]));
  const apiPosts = strapiPosts.filter((raw) => getSlug(raw));

  if (args.force) {
    return {
      creates: [],
      refreshes: [...apiPosts],
    };
  }

  const newPosts = apiPosts
    .filter((raw) => !blogsBySlug.has(getSlug(raw)))
    .sort(sortByPublishedAsc);

  const changedPosts = apiPosts.filter((raw) => {
    const slug = getSlug(raw);
    const entry = blogsBySlug.get(slug);
    return entry && postNeedsRefresh(entry, raw);
  });

  let creates = [];
  let refreshes = [];

  if (args.daily) {
    creates = newPosts.slice(0, 1);
    refreshes = changedPosts;
  } else if (args.refresh) {
    creates = newPosts;
    refreshes = changedPosts;
  } else {
    creates = args.all ? newPosts : newPosts.slice(0, 1);
    refreshes = [];
  }

  if (args.limit != null) {
    creates = creates.slice(0, args.limit);
  }

  return { creates, refreshes };
}

function upsertPost(blogs, raw) {
  const slug = getSlug(raw);
  const related = getRelatedSlugs(blogs, slug, {
    searchIntent: raw.search_intent,
    category: raw.category,
  });

  const normalized = normalizePost(raw, { relatedPosts: related });
  validatePost(normalized);

  renderArticle(normalized, { blogs });
  const entry = toBlogsEntry(normalized, raw);

  const idx = blogs.findIndex((b) => b.slug === slug);
  if (idx >= 0) blogs[idx] = entry;
  else blogs.push(entry);

  return { slug, title: normalized.title };
}

async function run() {
  assertStrictSiteFilter();

  const args = parseArgs(process.argv);
  const apiUrl = process.env.STRAPI_API_URL || 'http://localhost:1337/api';

  console.log('Fetching posts from API...');
  const strapiPosts = await fetchPosts({ baseUrl: apiUrl });
  const existingBlogs = loadBlogsJson();
  const { creates, refreshes } = buildWorklist(strapiPosts, existingBlogs, args);

  if (creates.length === 0 && refreshes.length === 0) {
    console.log('No new or changed articles to publish.');
    return;
  }

  if (creates.length) {
    console.log(`Creating ${creates.length} article(s)...`);
  }
  if (refreshes.length) {
    console.log(`Refreshing ${refreshes.length} changed article(s)...`);
  }

  let blogs = [...existingBlogs];

  for (const raw of creates) {
    const { slug, title } = upsertPost(blogs, raw);
    console.log(`  + ${title} (${slug})`);
  }

  for (const raw of refreshes) {
    const { slug, title } = upsertPost(blogs, raw);
    console.log(`  ~ ${title} (${slug})`);
  }

  blogs.sort(sortBlogsForIndex);
  saveBlogsJson(blogs);
  generateSitemap();
  console.log('Done. blogs.json and sitemap.xml updated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
