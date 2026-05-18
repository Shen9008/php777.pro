'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePost, validatePost } = require('./normalize-post.js');
const { injectInternalLinks } = require('./inject-internal-links.js');

const ROOT = path.resolve(__dirname, '../..');
const TEMPLATE_PATH = path.join(ROOT, 'scripts/templates/article.template.html');
const BLOG_DIR = path.join(ROOT, 'blog');

/**
 * Builds TOC HTML from toc_json.
 * @param {Array} tocJson - [{ id, text }] or [{ anchor, label }] or strings
 * @returns {string} HTML ol list
 */
function buildTocHtml(tocJson) {
  if (!Array.isArray(tocJson) || tocJson.length === 0) {
    return '';
  }

  const items = tocJson.map((item) => {
    if (typeof item === 'string') {
      const id = item.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return `<li><a href="#${id}">${item}</a></li>`;
    }
    const id = item.id || item.anchor || '';
    const text = item.text || item.label || item.title || '';
    if (!id || !text) return '';
    return `<li><a href="#${id}">${escapeHtml(text)}</a></li>`;
  }).filter(Boolean);

  if (items.length === 0) return '';

  return `
            <nav class="blog-toc feature-card" aria-labelledby="blog-toc-heading">
              <h2 id="blog-toc-heading" class="blog-toc__title">Table of Contents</h2>
              <ol class="blog-toc__list">
                ${items.join('\n                ')}
              </ol>
            </nav>

            `;
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ensures content is HTML. Strapi rich text may be blocks - convert if needed.
 * @param {string|object|object[]} content
 * @returns {string}
 */
function ensureHtml(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((block) => richTextBlockToHtml(block)).join('\n');
  }
  return String(content);
}

function richTextBlockToHtml(block) {
  if (!block || typeof block !== 'object') return '';
  const type = block.type || block.nodeType;
  const text = block.text || block.children?.map((c) => c.text || c.value || '').join('') || '';
  const escaped = escapeHtml(text);
  if (type === 'paragraph' || type === 'p') return `<p>${escaped}</p>`;
  if (type === 'heading') {
    const level = block.level || 2;
    const id = (block.id || text).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `<h${level} id="${id}">${escaped}</h${level}>`;
  }
  if (type === 'list') {
    const tag = block.format === 'ordered' ? 'ol' : 'ul';
    const items = (block.children || []).map((c) => `<li>${escapeHtml(c.text || '')}</li>`).join('');
    return `<${tag}>${items}</${tag}>`;
  }
  return `<p>${escaped}</p>`;
}

/**
 * Builds FAQ schema script tag from FAQ data, or empty string.
 * @param {Array} faqItems - [{ question, answer }]
 * @returns {string}
 */
function buildFaqSchemaScript(faqItems) {
  if (!Array.isArray(faqItems) || faqItems.length === 0) {
    return '';
  }
  const mainEntity = faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question || item.name || '',
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer || item.text || '',
    },
  })).filter((q) => q.name && q.acceptedAnswer.text);

  if (mainEntity.length === 0) return '';

  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }, null, 2);

  return `  <!-- Schema Markup: FAQPage -->
  <script type="application/ld+json">
  ${json}
  </script>
`;
}

/**
 * Renders article HTML and writes to blog/{slug}/index.html
 * @param {object} normalized - Normalized post from normalizePost()
 * @param {object} [opts] - Options
 * @param {string} [opts.templatePath] - Override template path
 * @param {Array} [opts.blogs] - All posts for internal link injection
 * @param {Array} [opts.faqItems] - FAQ items for schema
 * @returns {string} Written file path
 */
function renderArticle(normalized, opts = {}) {
  validatePost(normalized);

  const templatePath = opts.templatePath || TEMPLATE_PATH;
  let template = fs.readFileSync(templatePath, 'utf8');

  const baseUrl = 'https://pgasiagames.com/blog/' + normalized.slug + '/';
  const shareTitle = encodeURIComponent(normalized.title);

  const tocHtml = buildTocHtml(normalized.toc_json || []);
  const articleBodyRaw = ensureHtml(normalized.content || '');
  const articleBody = opts.blogs?.length
    ? injectInternalLinks(articleBodyRaw, opts.blogs, normalized.slug, {
        relatedSlugs: new Set(normalized.related_posts || []),
      })
    : articleBodyRaw;
  const faqScript = buildFaqSchemaScript(opts.faqItems || normalized.faq || []);

  const keywords = normalized.focus_keyword || normalized.title;

  const replacements = {
    '{{META_TITLE}}': normalized.meta_title || normalized.title,
    '{{META_DESCRIPTION}}': normalized.meta_description || normalized.excerpt || '',
    '{{KEYWORDS}}': keywords,
    '{{SLUG}}': normalized.slug,
    '{{TITLE}}': normalized.title,
    '{{CATEGORY}}': normalized.category || 'Informational',
    '{{PUBLISHED_DATE_ISO}}': normalized.published_date || '',
    '{{PUBLISHED_DATE_FORMATTED}}': normalized.published_date_formatted || '',
    '{{UPDATED_DATE_ISO}}': normalized.updated_date_iso || normalized.published_date || '',
    '{{READING_TIME}}': normalized.reading_time || '5 min read',
    '{{EXCERPT}}': normalized.excerpt || '',
    '{{PLACEHOLDER_GRADIENT}}':
      normalized.placeholder_gradient ||
      'linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(10,22,40,0.92) 55%, #0a1628 100%)',
    '{{FOCUS_KEYWORD}}': normalized.focus_keyword || normalized.title,
    '{{TOC_HTML}}': tocHtml,
    '{{ARTICLE_BODY}}': articleBody,
    '{{SHARE_URL}}': baseUrl,
    '{{SHARE_URL_ENCODED}}': encodeURIComponent(baseUrl),
    '{{SHARE_TITLE}}': shareTitle,
    '{{FAQ_SCHEMA_SCRIPT}}': faqScript,
    '{{RELATED_POST_SLUGS}}': (normalized.related_posts || []).join(','),
  };

  for (const [token, value] of Object.entries(replacements)) {
    template = template.split(token).join(value);
  }

  const outDir = path.join(BLOG_DIR, normalized.slug);
  const outPath = path.join(outDir, 'index.html');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, template, 'utf8');

  return outPath;
}

module.exports = { renderArticle, buildTocHtml, ensureHtml, buildFaqSchemaScript };
