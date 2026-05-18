'use strict';

const INTENT_GRADIENTS = {
  navigational:
    'linear-gradient(135deg, #0a1628 0%, rgba(37,99,235,0.35) 50%, #132337 100%)',
  commercial:
    'linear-gradient(135deg, rgba(220,38,38,0.22) 0%, rgba(37,99,235,0.28) 55%, #0a1628 100%)',
  transactional:
    'linear-gradient(135deg, #132337 0%, rgba(37,99,235,0.32) 45%, #0a1628 100%)',
  informational:
    'linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(10,22,40,0.92) 55%, #0a1628 100%)',
};

const INTENT_CATEGORIES = {
  navigational: 'Getting Started',
  commercial: 'Reviews',
  transactional: 'Guides',
  informational: 'Informational',
};

/**
 * Normalizes a Strapi post to site schema.
 * @param {object} strapiPost - Raw Strapi post (id, title, slug, shortDescription, publishedAt, etc.)
 * @param {object} [opts] - Options
 * @param {string} [opts.searchIntent] - Override search_intent (from Strapi if available)
 * @param {string[]} [opts.relatedPosts] - Slugs for related posts (from existing blogs.json)
 * @returns {object} Normalized post for blogs.json and render
 */
function normalizePost(strapiPost, opts = {}) {
  const slug = strapiPost.slug || strapiPost.documentId || '';
  const title = strapiPost.title || 'Untitled';
  const publishedAt = strapiPost.publishedAt || strapiPost.createdAt || new Date().toISOString();
  const updatedAt = strapiPost.updatedAt || publishedAt;

  const publishedDate = formatDateISO(publishedAt);
  const searchIntent = (opts.searchIntent || strapiPost.search_intent || 'informational').toLowerCase();
  const gradient = INTENT_GRADIENTS[searchIntent] || INTENT_GRADIENTS.informational;
  const category = INTENT_CATEGORIES[searchIntent] || 'Informational';

  return {
    slug,
    title,
    meta_title: strapiPost.meta_title || title,
    meta_description: strapiPost.meta_description || strapiPost.shortDescription || '',
    focus_keyword: strapiPost.primary_keyword || strapiPost.focus_keyword || title,
    category,
    search_intent: searchIntent.charAt(0).toUpperCase() + searchIntent.slice(1),
    published_date: publishedDate,
    reading_time: formatReadingTime(strapiPost.reading_time),
    excerpt: strapiPost.shortDescription || strapiPost.excerpt || '',
    placeholder_gradient: strapiPost.placeholder_gradient || gradient,
    related_posts: opts.relatedPosts || [],
    keywords: normalizeKeywords(strapiPost.keywords),

    content: strapiPost.content || '',
    toc_json: strapiPost.toc_json || [],
    published_date_formatted: formatDateLong(publishedAt),
    updated_date_iso: formatDateISO(updatedAt),
  };
}

function normalizeKeywords(raw) {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function formatReadingTime(val) {
  if (val == null || val === '') return '5 min read';
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  if (!isNaN(num)) return `${num} min read`;
  return typeof val === 'string' ? val : '5 min read';
}

function formatDateISO(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

function formatDateLong(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Validates required fields. Throws if invalid.
 */
function validatePost(normalized) {
  if (!normalized.slug || !normalized.title) {
    throw new Error('Post must have slug and title');
  }
  return true;
}

module.exports = { normalizePost, validatePost, formatDateISO, formatDateLong };
