'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const BLOGS_JSON_PATH = path.join(ROOT, 'assets/data/blogs.json');
const BLOG_BASE = 'https://php777.pro/blog/';

const MARK_START = '  <!-- Blog Posts -->';
const MARK_END = '  <!-- /Blog Posts -->';

/**
 * Rebuilds the blog section of sitemap.xml from blogs.json.
 * Preserves all non-blog URL entries.
 */
function generateSitemap(opts = {}) {
  const sitemapPath = opts.sitemapPath || SITEMAP_PATH;
  const blogsPath = opts.blogsPath || BLOGS_JSON_PATH;

  let blogs = [];
  try {
    const raw = fs.readFileSync(blogsPath, 'utf8');
    blogs = JSON.parse(raw);
    if (!Array.isArray(blogs)) blogs = [];
  } catch (err) {
    throw new Error(`Failed to read blogs.json: ${err.message}`);
  }

  let sitemap = fs.readFileSync(sitemapPath, 'utf8');

  const blogSectionStart = sitemap.indexOf(MARK_START);
  const blogSectionEnd = sitemap.indexOf(MARK_END, blogSectionStart);

  if (blogSectionStart < 0 || blogSectionEnd < 0) {
    throw new Error(
      `Could not find blog markers in sitemap.xml (expected "${MARK_START.trim()}" and "${MARK_END.trim()}").`,
    );
  }

  const before = sitemap.slice(0, blogSectionStart + MARK_START.length);
  const after = sitemap.slice(blogSectionEnd);

  const blogUrls = blogs.map((b) => {
    const slug = b.slug || '';
    const lastmod = b.published_date || '2025-01-01';
    return `  <url>
    <loc>${BLOG_BASE}${slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n');

  const inner = blogs.length ? `\n${blogUrls}\n` : '\n';
  const updated = before + inner + after;
  fs.writeFileSync(sitemapPath, updated, 'utf8');
  return sitemapPath;
}

module.exports = { generateSitemap };
