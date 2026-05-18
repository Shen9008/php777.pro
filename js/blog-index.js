/**
 * Blog listing – loads posts from assets/data/blogs.json (path via data-blog-json on #blog-grid).
 * Pagination: data-page-size on #blog-grid (default 6), URL ?page=N.
 */
(function () {
    'use strict';

    var grid = document.getElementById('blog-grid');
    var paginationEl = document.getElementById('blog-pagination');
    if (!grid) return;

    var jsonUrl = grid.getAttribute('data-blog-json') || '../assets/data/blogs.json';
    var pageSize = parseInt(grid.getAttribute('data-page-size') || '6', 10);
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 6;

    var defaultBlogImg = '../images/blog/blog-default.png';
    var validPosts = [];

    function blogCardImageSrc(post) {
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
        return '../' + path.replace(/^\.?\//, '');
    }

    function formatDate(iso) {
        if (!iso || typeof iso !== 'string') return '';
        var part = iso.slice(0, 10);
        try {
            var d = new Date(part + 'T12:00:00');
            if (Number.isNaN(d.getTime())) return part;
            return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return part;
        }
    }

    function truncate(text, max) {
        if (!text || text.length <= max) return text || '';
        var cut = text.slice(0, max);
        var lastSpace = cut.lastIndexOf(' ');
        if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace);
        return cut + '\u2026';
    }

    function safeSlug(slug) {
        return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug);
    }

    function getPageFromURL() {
        var q = new URLSearchParams(window.location.search).get('page');
        var n = parseInt(q, 10);
        return Number.isFinite(n) && n >= 1 ? n : 1;
    }

    function totalPages() {
        return Math.max(1, Math.ceil(validPosts.length / pageSize));
    }

    function clampPage(page) {
        var tp = totalPages();
        if (page < 1) return 1;
        if (page > tp) return tp;
        return page;
    }

    function blogListingURL(page) {
        var url = new URL(window.location.href);
        if (page <= 1) url.searchParams.delete('page');
        else url.searchParams.set('page', String(page));
        return url.pathname + url.search + url.hash;
    }

    function scrollToGrid() {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function buildCard(post) {
        var slug = post.slug;

        var art = document.createElement('article');
        art.className = 'blog-card';

        var imgWrap = document.createElement('div');
        imgWrap.className = 'blog-card__img';
        var gradient = post.placeholder_gradient;
        if (gradient && typeof gradient === 'string') {
            imgWrap.style.background = gradient;
        }

        var imgSrc = blogCardImageSrc(post);
        var img = document.createElement('img');
        img.src = imgSrc;
        img.width = 800;
        img.height = 500;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', function () {
            if (img.src.indexOf('blog-default.png') === -1) {
                img.src = defaultBlogImg;
                return;
            }
            img.style.display = 'none';
        });
        imgWrap.appendChild(img);

        var body = document.createElement('div');
        body.className = 'blog-card__body';

        var cat = document.createElement('span');
        cat.className = 'blog-card__category';
        cat.textContent = post.category || 'Article';

        var h3 = document.createElement('h3');
        h3.className = 'blog-card__title';
        var link = document.createElement('a');
        link.href = '/blog/' + slug + '/';
        link.textContent = post.title || slug;

        var meta = document.createElement('p');
        meta.className = 'blog-card__meta';
        var bits = [];
        var pub = formatDate(post.published_date);
        if (pub) bits.push(pub);
        if (post.reading_time) bits.push(post.reading_time);
        var head = bits.join(' \u00b7 ');
        var excerpt = truncate(post.excerpt || '', 140);
        meta.textContent = excerpt ? (head ? head + ' \u2014 ' + excerpt : excerpt) : head;

        h3.appendChild(link);
        body.appendChild(cat);
        body.appendChild(h3);
        body.appendChild(meta);
        art.appendChild(imgWrap);
        art.appendChild(body);
        return art;
    }

    function renderPagination(current) {
        if (!paginationEl) return;
        var tp = totalPages();
        paginationEl.textContent = '';

        if (tp <= 1) {
            paginationEl.hidden = true;
            return;
        }

        paginationEl.hidden = false;

        var navInner = document.createElement('div');
        navInner.className = 'blog-pagination__inner';

        var status = document.createElement('p');
        status.className = 'blog-pagination__status';
        status.textContent =
            'Page ' + current + ' of ' + tp + ' · ' + validPosts.length + ' articles';

        var controls = document.createElement('div');
        controls.className = 'blog-pagination__controls';

        function makeLink(label, page, opts) {
            opts = opts || {};
            if (opts.disabled) {
                var s = document.createElement('span');
                s.className = 'blog-pagination__btn blog-pagination__btn--disabled';
                s.textContent = label;
                s.setAttribute('aria-disabled', 'true');
                return s;
            }
            var a = document.createElement('a');
            a.className = 'blog-pagination__btn';
            a.href = blogListingURL(page);
            a.setAttribute('data-page', String(page));
            a.textContent = label;
            return a;
        }

        controls.appendChild(makeLink('Previous', current - 1, { disabled: current <= 1 }));

        /** Few page buttons: full list only when total ≤ 5; otherwise 1 … window … last (delta 1). */
        function buildPaginationSequence(cur, total) {
            if (total <= 1) return [1];
            if (total <= 5) {
                var small = [];
                for (var k = 1; k <= total; k++) small.push(k);
                return small;
            }
            var delta = 1;
            var seq = [];
            seq.push(1);
            var start = Math.max(2, cur - delta);
            var end = Math.min(total - 1, cur + delta);
            if (start > 2) seq.push('…');
            var i;
            for (i = start; i <= end; i++) seq.push(i);
            if (end < total - 1) seq.push('…');
            seq.push(total);
            return seq;
        }

        var pages = buildPaginationSequence(current, tp);

        pages.forEach(function (p) {
            if (p === '…') {
                var ell = document.createElement('span');
                ell.className = 'blog-pagination__ellipsis';
                ell.textContent = '\u2026';
                ell.setAttribute('aria-hidden', 'true');
                controls.appendChild(ell);
                return;
            }
            if (p === current) {
                var cur = document.createElement('span');
                cur.className = 'blog-pagination__btn blog-pagination__btn--current';
                cur.textContent = String(p);
                cur.setAttribute('aria-current', 'page');
                controls.appendChild(cur);
                return;
            }
            controls.appendChild(makeLink(String(p), p));
        });

        controls.appendChild(makeLink('Next', current + 1, { disabled: current >= tp }));

        navInner.appendChild(status);
        navInner.appendChild(controls);
        paginationEl.appendChild(navInner);
    }

    function renderView(page, pushHistory) {
        page = clampPage(page);
        if (pushHistory) {
            history.pushState({ blogPage: page }, '', blogListingURL(page));
        }

        grid.textContent = '';
        var tp = totalPages();
        if (!validPosts.length) {
            grid.innerHTML = '<p class="blog-grid__empty">No articles available yet.</p>';
            if (paginationEl) paginationEl.hidden = true;
            return;
        }

        var start = (page - 1) * pageSize;
        var slice = validPosts.slice(start, start + pageSize);
        var frag = document.createDocumentFragment();
        slice.forEach(function (post) {
            frag.appendChild(buildCard(post));
        });
        grid.appendChild(frag);

        renderPagination(page);
    }

    fetch(jsonUrl)
        .then(function (r) {
            if (!r.ok) throw new Error('Blog data request failed');
            return r.json();
        })
        .then(function (posts) {
            if (!Array.isArray(posts)) throw new Error('Invalid blog data');

            posts.sort(function (a, b) {
                var da = (a.published_date || a.synced_at || '').slice(0, 10);
                var db = (b.published_date || b.synced_at || '').slice(0, 10);
                return db.localeCompare(da);
            });

            validPosts = posts.filter(function (post) {
                return safeSlug(post.slug);
            });

            var initial = clampPage(getPageFromURL());
            if (initial !== getPageFromURL() && validPosts.length) {
                history.replaceState({ blogPage: initial }, '', blogListingURL(initial));
            }

            renderView(initial, false);
        })
        .catch(function () {
            grid.innerHTML =
                '<p class="blog-grid__error" role="alert">Articles could not be loaded. Please refresh the page.</p>';
            if (paginationEl) paginationEl.hidden = true;
        })
        .finally(function () {
            grid.removeAttribute('aria-busy');
        });

    if (paginationEl) {
        paginationEl.addEventListener('click', function (e) {
            var t = e.target.closest('a[data-page]');
            if (!t || paginationEl.hidden) return;
            e.preventDefault();
            var p = parseInt(t.getAttribute('data-page'), 10);
            if (!Number.isFinite(p)) return;
            renderView(p, true);
            scrollToGrid();
        });
    }

    window.addEventListener('popstate', function () {
        if (!validPosts.length) return;
        renderView(getPageFromURL(), false);
    });
})();
