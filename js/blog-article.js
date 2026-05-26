/**
 * Blog article page: recent posts sidebar + related posts from data-related-slugs.
 * Expects assets/data/blogs.json (same ordering rules as the sync pipeline).
 */
(function () {
  'use strict';

  function sortBlogsLatestFirst(a, b) {
    var pubB = new Date(b.published_date || 0).getTime();
    var pubA = new Date(a.published_date || 0).getTime();
    if (pubB !== pubA) return pubB - pubA;

    var cmsB = new Date(b.cms_updated_at || 0).getTime();
    var cmsA = new Date(a.cms_updated_at || 0).getTime();
    if (cmsB !== cmsA) return cmsB - cmsA;

    var syncB = new Date(b.synced_at || 0).getTime();
    var syncA = new Date(a.synced_at || 0).getTime();
    if (syncB !== syncA) return syncB - syncA;

    return String(a.slug).localeCompare(String(b.slug));
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  var defaultBlogImg = '/images/blog/blog-default.png';

  function blogArticleImageSrc(post) {
    var raw = post.images;
    var path = '';
    if (typeof raw === 'string') {
      path = raw.trim();
    } else if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') {
      path = raw[0].trim();
    }
    if (!path) return defaultBlogImg;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.charAt(0) === '/') return path;
    return '/' + path.replace(/^\.?\//, '');
  }

  function truncate(text, max) {
    if (!text || text.length <= max) return text || '';
    var cut = text.slice(0, max);
    var lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace);
    return cut + '\u2026';
  }

  function relatedMetaLine(post) {
    var cat = post.category && String(post.category).trim();
    var rt = post.reading_time && String(post.reading_time).trim();
    if (cat && rt) return cat + ' · ' + rt;
    return cat || rt || 'Article';
  }

  /** JSON-controlled gradient for card backs — block quotes/url()/expression */
  function safePlaceholderGradient(g) {
    if (!g || typeof g !== 'string') return '';
    var t = g.trim();
    if (t.length > 900) return '';
    if (/[<>"']|url\s*\(|expression\s*\(|javascript\s*:/i.test(t)) return '';
    return t;
  }

  function run() {
    var slug = document.body.getAttribute('data-blog-slug') || '';
    var relatedRaw = document.body.getAttribute('data-related-slugs') || '';

    fetch('/assets/data/blogs.json')
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (blogs) {
        if (!Array.isArray(blogs)) return;
        blogs.sort(sortBlogsLatestFirst);

        var sidebar = document.getElementById('sidebar-posts');
        if (sidebar) {
          var recent = blogs.filter(function (b) {
            return b.slug && b.slug !== slug;
          }).slice(0, 3);
          sidebar.innerHTML = recent
            .map(function (b, idx) {
              return (
                '<li class="blog-sidebar-list__item">' +
                '<a class="blog-sidebar-list__link" href="/blog/' +
                encodeURIComponent(b.slug) +
                '/">' +
                '<span class="blog-sidebar-list__index" aria-hidden="true">' +
                String(idx + 1) +
                '</span>' +
                '<span class="blog-sidebar-list__text">' +
                escapeHtml(b.title) +
                '</span>' +
                '</a></li>'
              );
            })
            .join('');
        }

        var relUl = document.querySelector('.blog-related-list');
        var relPh = document.querySelector('.blog-related-placeholder');
        if (!relUl || !relPh) return;

        var relatedOrder = relatedRaw.split(',').map(function (s) {
          return s.trim();
        }).filter(Boolean);
        var bySlug = {};
        blogs.forEach(function (b) {
          if (b && b.slug) bySlug[b.slug] = b;
        });

        var related = [];
        relatedOrder.forEach(function (s) {
          if (s === slug) return;
          var b = bySlug[s];
          if (b) related.push(b);
        });

        if (related.length === 0) {
          relPh.textContent = 'Browse recent posts in the sidebar.';
          relUl.hidden = true;
          return;
        }

        relPh.hidden = true;
        relUl.hidden = false;
        relUl.innerHTML = related
          .map(function (b) {
            var href = '/blog/' + encodeURIComponent(b.slug) + '/';
            var imgSrc = escapeHtml(blogArticleImageSrc(b));
            var gradient = safePlaceholderGradient(b.placeholder_gradient);
            var gradAttr = gradient ? ' style="background:' + gradient + '"' : '';
            var excerpt = truncate(b.excerpt || '', 118);
            return (
              '<li class="blog-related-card">' +
              '<a class="blog-related-card__link" href="' +
              href +
              '">' +
              '<span class="blog-related-card__media"' +
              gradAttr +
              '>' +
              '<img src="' +
              imgSrc +
              '" alt="" width="400" height="250" loading="lazy" decoding="async" data-related-img="1">' +
              '</span>' +
              '<span class="blog-related-card__body">' +
              '<span class="blog-related-card__meta">' +
              escapeHtml(relatedMetaLine(b)) +
              '</span>' +
              '<span class="blog-related-card__title">' +
              escapeHtml(b.title) +
              '</span>' +
              (excerpt
                ? '<span class="blog-related-card__excerpt">' + escapeHtml(excerpt) + '</span>'
                : '') +
              '</span>' +
              '</a></li>'
            );
          })
          .join('');

        relUl.querySelectorAll('img[data-related-img]').forEach(function (img) {
          img.addEventListener('error', function () {
            if (img.src.indexOf('blog-default.png') === -1) {
              img.src = defaultBlogImg;
              return;
            }
            img.style.display = 'none';
          });
        });
      })
      .catch(function () {
        var sidebar = document.getElementById('sidebar-posts');
        if (sidebar) {
          sidebar.innerHTML =
            '<li class="blog-sidebar-placeholder">Posts unavailable offline.</li>';
        }
        var relPh = document.querySelector('.blog-related-placeholder');
        var relUl = document.querySelector('.blog-related-list');
        if (relPh) {
          relPh.hidden = false;
          relPh.textContent = 'Could not load related posts.';
        }
        if (relUl) relUl.hidden = true;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
