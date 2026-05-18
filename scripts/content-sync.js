'use strict';

const fs = require('fs');
const path = require('path');
const { fetchPosts } = require('./lib/fetch-posts.js');
const { normalizePost, validatePost } = require('./lib/normalize-post.js');
const { renderArticle } = require('./lib/render-article.js');
const { generateSitemap } = require('./lib/generate-sitemap.js');

const ROOT = path.resolve(__dirname, '..');
const BLOGS_JSON_PATH = path.join(ROOT, 'assets/data/blogs.json');

const BLOGS_JSON_FIELDS = [
  'slug', 'title', 'meta_title', 'meta_description', 'focus_keyword',
  'category', 'search_intent', 'published_date', 'reading_time',
  'excerpt', 'placeholder_gradient', 'related_posts', 'keywords',
  'synced_at',
];

function sortBlogsByLatestSyncFirst(a, b) {
  const tb = new Date(b.synced_at || b.published_date || 0).getTime();
  const ta = new Date(a.synced_at || a.published_date || 0).getTime();
  if (tb !== ta) return tb - ta;
  return String(b.slug).localeCompare(String(a.slug));
}

function toBlogsEntry(normalized) {
  const entry = {};
  for (const k of BLOGS_JSON_FIELDS) {
    if (normalized[k] !== undefined) entry[k] = normalized[k];
  }
  return entry;
}

function getRelatedSlugs(blogs, currentSlug, opts = {}, limit = 3) {
  const searchIntent = (opts.searchIntent || 'informational').toLowerCase();
  const category = (opts.category || '').toLowerCase();
  const others = blogs.filter((b) => b.slug !== currentSlug);

  const sameIntent = others.filter((b) => (b.search_intent || '').toLowerCase() === searchIntent).sort(sortBlogsByLatestSyncFirst);
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

async function run() {
  const all = process.argv.includes('--all');
  const apiUrl = process.env.STRAPI_API_URL || 'http://localhost:1337/api';

  console.log('Fetching posts from API...');
  const strapiPosts = await fetchPosts({ baseUrl: apiUrl });

  const existingBlogs = loadBlogsJson();
  const knownSlugs = new Set(existingBlogs.map((b) => b.slug));

  const unprocessed = strapiPosts
    .filter((p) => {
      const slug = p.slug || p.documentId || '';
      return slug && !knownSlugs.has(slug);
    })
    .sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0));

  if (unprocessed.length === 0) {
    console.log('No new articles to publish.');
    return;
  }

  const toProcess = all ? unprocessed : unprocessed.slice(0, 1);
  console.log(`Publishing ${toProcess.length} article(s)...`);

  let blogs = [...existingBlogs];
  const allSlugs = blogs.map((b) => b.slug);

  for (const raw of toProcess) {
    const slug = raw.slug || raw.documentId || '';
    const related = getRelatedSlugs(blogs, slug, {
      searchIntent: raw.search_intent,
      category: raw.category,
    });

    const normalized = normalizePost(raw, {
      relatedPosts: related,
    });
    validatePost(normalized);

    console.log(`  - ${normalized.title} (${slug})`);
    renderArticle(normalized, { blogs });

    const entry = toBlogsEntry(normalized);
    entry.synced_at = new Date().toISOString();
    blogs.push(entry);
    allSlugs.push(slug);
  }

  blogs.sort(sortBlogsByLatestSyncFirst);
  saveBlogsJson(blogs);
  generateSitemap();
  console.log('Done. blogs.json and sitemap.xml updated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
