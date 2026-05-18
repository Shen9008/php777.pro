'use strict';

/**
 * Converts legacy flat blog/*.html articles into blog/{slug}/index.html
 * using the same layout pattern as CMS-generated posts (hero, prose, sidebar).
 * Merges metadata into assets/data/blogs.json when the slug is missing.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const BLOGS_JSON = path.join(ROOT, 'assets/data/blogs.json');

const SITE = 'https://php777.pro';
const AFFILIATE_HREF =
  'https://reffpa.com/L?tag=d_5500779m_1236c_&site=5500779&ad=1236';

const DEFAULT_GRADIENT =
  'linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(10,22,40,0.92) 55%, #0a1628 100%)';

function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyHeading(text) {
  return stripTags(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractBlogArticleContent(html) {
  const startTag = '<div class="blog-article__content">';
  const start = html.indexOf(startTag);
  if (start < 0) return '';
  let i = start + startTag.length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const open = html.indexOf('<div', i);
    const close = html.indexOf('</div>', i);
    if (close < 0) break;
    if (open !== -1 && open < close) {
      depth += 1;
      i = open + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start + startTag.length, close).trim();
      }
      i = close + 6;
    }
  }
  return '';
}

function parseLdPublished(html) {
  const m = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
  return m ? m[1].slice(0, 10) : '';
}

function parseLdModified(html) {
  const m = html.match(/"dateModified"\s*:\s*"([^"]+)"/);
  return m ? m[1].slice(0, 10) : '';
}

function formatPublished(iso) {
  if (!iso || iso.length < 10) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addH2Ids(html) {
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (full, attrs, inner) => {
    const a = attrs || '';
    if (/\bid\s*=/.test(a)) return full;
    const id = slugifyHeading(inner);
    if (!id) return full;
    return `<h2 id="${escapeHtml(id)}"${a}>${inner}</h2>`;
  });
}

function buildTocFromHtml(articleHtml) {
  const re = /<h2\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi;
  const items = [];
  let m;
  while ((m = re.exec(articleHtml)) !== null) {
    const id = m[1];
    const label = stripTags(m[2]);
    if (id && label) items.push({ id, label });
  }
  if (items.length === 0) return '';
  const lis = items
    .map((x) => `                <li><a href="#${escapeHtml(x.id)}">${escapeHtml(x.label)}</a></li>`)
    .join('\n');
  return `
            <nav class="blog-toc feature-card" aria-labelledby="blog-toc-heading">
              <h2 id="blog-toc-heading" class="blog-toc__title">Table of Contents</h2>
              <ol class="blog-toc__list">
${lis}
              </ol>
            </nav>

`;
}

function rewriteLegacyHref(innerHtml) {
  let out = innerHtml;
  out = out.replace(/href="\.\.\/([^"]+)"/gi, (_, tail) => {
    const t = tail.replace(/^\//, '');
    return `href="/${t}"`;
  });
  out = out.replace(/href="([a-z0-9][a-z0-9-]*)\.html"/gi, (_, slug) => {
    if (slug.toLowerCase() === 'index') return 'href="/blog/"';
    return `href="/blog/${slug}/"`;
  });
  return out;
}

function extractRelatedSlugs(innerHtmlRaw, currentSlug, max = 5) {
  const re = /href="([a-z0-9][a-z0-9-]*)\.html"/gi;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(innerHtmlRaw)) !== null) {
    const s = m[1];
    if (s === 'index' || s === currentSlug || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

function extractOg(html, prop) {
  const re = new RegExp(`<meta\\s+property="${prop}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

function extractH1(html) {
  const m = html.match(/<h1[^>]*class="[^"]*page-hero__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : '';
}

function extractCategoryLine(html) {
  const m = html.match(
    /<span class="blog-article__category">([\s\S]*?)<\/span>/i,
  );
  return m ? stripTags(m[1]) : 'Guide';
}

function extractReadingMeta(html) {
  const m = html.match(/<p class="blog-article__meta">([\s\S]*?)<\/p>/i);
  return m ? stripTags(m[1]) : '';
}

function parseReadingTime(metaLine) {
  const m = metaLine.match(/(\d+)\s*min\s*read/i);
  return m ? `${m[1]} min read` : '5 min read';
}

function excerptFromContent(innerHtml, maxLen = 220) {
  const fm = innerHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const text = fm ? stripTags(fm[1]) : '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

function buildPage(opts) {
  const {
    slug,
    metaTitle,
    metaDescription,
    keywords,
    ogImage,
    publishedIso,
    modifiedIso,
    categoryEyebrow,
    readingTime,
    title,
    excerpt,
    focusKeyword,
    tocHtml,
    articleBody,
    relatedCsv,
  } = opts;

  const canonical = `${SITE}/blog/${slug}/`;
  const shareEnc = encodeURIComponent(canonical);
  const shareTitleEnc = encodeURIComponent(title);
  const publishedFmt = formatPublished(publishedIso);
  const og = escapeHtml(ogImage || `${SITE}/images/og-default.webp`);

  const jsonArticle = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: metaDescription,
    datePublished: publishedIso || modifiedIso,
    dateModified: modifiedIso || publishedIso,
    author: {
      '@type': 'Organization',
      name: 'PHP777',
      url: `${SITE}/`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'PHP777',
      url: `${SITE}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE}/images/og-default.webp`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    image: ogImage || undefined,
  });

  const jsonBreadcrumb = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${SITE}/blog/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: canonical,
      },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-TS95HFR5');</script>
  <!-- End Google Tag Manager -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0a1628">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="/css/style.css">

  <meta property="og:title" content="${escapeHtml(metaTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${og}">
  <meta property="og:site_name" content="PHP777">
  <meta property="og:locale" content="en_GB">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  <meta name="twitter:image" content="${og}">

  <script type="application/ld+json">
  ${jsonArticle}
  </script>

  <script type="application/ld+json">
  ${jsonBreadcrumb}
  </script>
</head>
<body data-page="blog" data-blog-slug="${escapeHtml(slug)}" data-related-slugs="${escapeHtml(relatedCsv)}">
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TS95HFR5"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->

  <div id="partial-header"></div>

  <main id="main-content">
    <div id="partial-1xbet-promo"></div>

    <section class="hero section section--tight blog-article-hero" aria-labelledby="blog-article-title">
      <div class="container">
        <nav class="blog-breadcrumb" aria-label="Breadcrumb">
          <ol class="blog-breadcrumb__list">
            <li><a href="/index.html">Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/blog/index.html">Blog</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">${escapeHtml(title)}</li>
          </ol>
        </nav>
        <p class="section__eyebrow">${escapeHtml(categoryEyebrow)} · ${escapeHtml(readingTime)}</p>
        <h1 id="blog-article-title" class="hero__title">${escapeHtml(title)}</h1>
        <p class="hero__subtitle">${escapeHtml(excerpt)}</p>
        <p class="blog-published">${escapeHtml(publishedFmt)}</p>
        <div class="blog-share" aria-label="Share article">
          <span class="blog-share__label">Share</span>
          <div class="blog-share__links">
            <a href="https://twitter.com/intent/tweet?url=${shareEnc}&amp;text=${shareTitleEnc}"
              target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareEnc}"
              target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.linkedin.com/shareArticle?mini=true&amp;url=${shareEnc}"
              target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
    </section>

    <section class="container section section--tight blog-featured-section">
      <div class="blog-featured" style="background: ${DEFAULT_GRADIENT};">${escapeHtml(focusKeyword)}</div>
    </section>

    <article class="container section">
      <div class="blog-article-layout">
        <div class="blog-article-main">
          <div class="article-prose blog-prose">
${tocHtml}
            ${articleBody}
          </div>

          <section class="section section--tight blog-inline-cta">
            <div class="cta-banner blog-inline-cta__inner">
              <h2 class="section__title">Play at PHP777</h2>
              <p>Open <a href="${AFFILIATE_HREF}" target="_blank" rel="noopener noreferrer sponsored"><strong>PHP777</strong></a> for slots, live tables, sports, and promos - and keep play within limits you set.</p>
              <div class="hero__actions blog-inline-cta__actions">
                <a href="${AFFILIATE_HREF}" class="btn btn--primary" target="_blank" rel="noopener noreferrer sponsored">Join now</a>
                <a href="/responsible-gambling.html" class="btn btn--outline">Responsible gambling</a>
              </div>
            </div>
          </section>

          <section class="article-related blog-related" id="related-posts" aria-label="Related posts">
            <h2 class="section__title blog-related__title">Related posts</h2>
            <p class="blog-related-placeholder">Loading related posts…</p>
            <ul class="blog-related-list" hidden></ul>
          </section>
        </div>

        <aside class="blog-sidebar" aria-label="More from the blog">
          <div class="feature-card blog-sidebar-card">
            <h3 class="blog-sidebar__heading">Recent posts</h3>
            <ul class="blog-sidebar-list" id="sidebar-posts">
              <li class="blog-sidebar-placeholder">Loading…</li>
            </ul>
          </div>
          <div class="feature-card blog-sidebar-card blog-sidebar-cta">
            <h3 class="blog-sidebar__heading">Explore the site</h3>
            <p class="blog-sidebar-cta__text">Slots, live casino, sports, and bonuses on php777.pro.</p>
            <a href="${AFFILIATE_HREF}" class="btn btn--gold" target="_blank" rel="noopener noreferrer sponsored">Join PHP777</a>
          </div>
        </aside>
      </div>
    </article>
  </main>

  <div id="partial-footer"></div>

  <script defer src="/js/load-partials.js"></script>
  <script defer src="/js/blog-article.js"></script>
</body>
</html>
`;
}

function migrateFile(filePath, slug, blogsBySlug) {
  const html = fs.readFileSync(filePath, 'utf8');
  const innerRaw = extractBlogArticleContent(html);
  if (!innerRaw) {
    console.warn(`Skip (no blog-article__content): ${slug}`);
    return;
  }

  const related = extractRelatedSlugs(innerRaw, slug);
  const innerRewritten = rewriteLegacyHref(innerRaw);
  const withIds = addH2Ids(innerRewritten);
  const tocHtml = buildTocFromHtml(withIds);

  const metaTitle = extractTitle(html);
  const metaDescription = extractMeta(html, 'description');
  const keywords = extractMeta(html, 'keywords');
  const ogImage = extractOg(html, 'og:image');
  const publishedIso = parseLdPublished(html) || '2025-01-01';
  const modifiedIso = parseLdModified(html) || publishedIso;
  const title = extractH1(html) || metaTitle.replace(/\s*[–|]\s*PHP777.*$/i, '').trim();
  const categoryEyebrow = extractCategoryLine(html);
  const readingTime = parseReadingTime(extractReadingMeta(html));
  const excerpt = excerptFromContent(innerRaw);
  const kwFirst = (keywords || '').split(',')[0].trim() || title.slice(0, 48);

  const outDir = path.join(BLOG_DIR, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.html');
  const page = buildPage({
    slug,
    metaTitle,
    metaDescription,
    keywords,
    ogImage,
    publishedIso,
    modifiedIso,
    categoryEyebrow,
    readingTime,
    title,
    excerpt,
    focusKeyword: kwFirst,
    tocHtml,
    articleBody: withIds,
    relatedCsv: related.join(','),
  });
  fs.writeFileSync(outPath, page, 'utf8');
  console.log(`OK ${slug} -> blog/${slug}/index.html`);

  if (!blogsBySlug.has(slug)) {
    blogsBySlug.set(slug, {
      slug,
      title,
      meta_title: metaTitle,
      meta_description: metaDescription,
      focus_keyword: kwFirst,
      category: categoryEyebrow.split('•')[0].trim() || 'Guide',
      search_intent: 'Informational',
      published_date: publishedIso.slice(0, 10),
      reading_time: readingTime,
      excerpt,
      placeholder_gradient: DEFAULT_GRADIENT,
      related_posts: related.slice(0, 3),
      keywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
      synced_at: `${modifiedIso}T12:00:00.000Z`,
    });
  }
}

function main() {
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });
  const legacyFiles = entries
    .filter((d) => d.isFile() && d.name.endsWith('.html') && d.name !== 'index.html')
    .map((d) => d.name);

  let blogs = [];
  try {
    blogs = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  if (!Array.isArray(blogs)) blogs = [];

  const blogsBySlug = new Map(blogs.map((b) => [b.slug, b]));

  for (const name of legacyFiles) {
    const slug = path.basename(name, '.html');
    const targetDir = path.join(BLOG_DIR, slug);
    if (fs.existsSync(path.join(targetDir, 'index.html'))) {
      console.warn(`Skip legacy ${slug}: blog/${slug}/index.html already exists`);
      continue;
    }
    migrateFile(path.join(BLOG_DIR, name), slug, blogsBySlug);
  }

  const merged = [...blogsBySlug.values()].sort((a, b) => {
    const tb = new Date(b.synced_at || b.published_date || 0).getTime();
    const ta = new Date(a.synced_at || a.published_date || 0).getTime();
    if (tb !== ta) return tb - ta;
    return String(b.slug).localeCompare(String(a.slug));
  });

  fs.writeFileSync(BLOGS_JSON, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`Updated ${BLOGS_JSON} (${merged.length} posts)`);

  for (const name of legacyFiles) {
    const slug = path.basename(name, '.html');
    const flatPath = path.join(BLOG_DIR, name);
    const nestedPath = path.join(BLOG_DIR, slug, 'index.html');
    if (fs.existsSync(nestedPath)) {
      fs.unlinkSync(flatPath);
      console.log(`Removed ${name}`);
    }
  }
}

main();
