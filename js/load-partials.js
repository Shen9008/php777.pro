/**
 * PHP777 Asia - Load modular header, footer, sidebar, CTA banner.
 * Handles root and blog/ subfolder (base path). Sets active nav from body[data-page].
 */
(function () {
    'use strict';

    var pathname = window.location.pathname || '';

    /** Steps up from /blog/... to site root (supports /blog/slug/index.html). */
    function siteRootBaseFromPathname() {
        var p = (pathname || '').replace(/\\/g, '/');
        var lower = p.toLowerCase();
        var idx = lower.indexOf('/blog');
        if (idx === -1) return '';
        var after = p.slice(idx + '/blog'.length).replace(/^\/+/, '');
        if (!after || after.toLowerCase() === 'index.html') return '../';
        var parts = after.split('/').filter(Boolean);
        if (parts.length === 1 && /\.html$/i.test(parts[0])) return '../';
        if (parts.length && parts[parts.length - 1].toLowerCase() === 'index.html') {
            parts.pop();
        }
        var depth = parts.length;
        return new Array(depth + 2).join('../');
    }

    var base = siteRootBaseFromPathname();

    function rewriteLinks(html) {
        var baseVal = base;
        return html.replace(/\{\{base\}\}/g, baseVal);
    }

    function setActiveNav() {
        var page = document.body.getAttribute('data-page') || '';
        if (!page) return;
        document.querySelectorAll('.nav__link[data-nav="' + page + '"], .mobile-menu__link[data-nav="' + page + '"]').forEach(function (el) {
            el.classList.add('nav__link--active', 'mobile-menu__link--active');
        });
    }

    function injectSvgSprite() {
        if (document.getElementById('svg-sprite')) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" id="svg-sprite" style="position:absolute;width:0;height:0;" aria-hidden="true"><defs>' +
            '<symbol id="icon-menu" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></symbol>' +
            '<symbol id="icon-close" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></symbol>' +
            '<symbol id="icon-slots" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h18v8z"/><circle cx="7.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16.5" cy="12" r="1.5"/></symbol>' +
            '<symbol id="icon-live" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></symbol>' +
            '<symbol id="icon-sports" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></symbol>' +
            '<symbol id="icon-bonus" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></symbol>' +
            '<symbol id="icon-shield" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></symbol>' +
            '<symbol id="icon-heart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></symbol>' +
            '<symbol id="icon-payment" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></symbol>' +
            '<symbol id="icon-rtp" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></symbol>' +
            '<symbol id="icon-trophy" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></symbol>' +
            '<symbol id="icon-asia" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></symbol>' +
            '<symbol id="icon-check" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></symbol>' +
            '<symbol id="icon-arrow" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></symbol>' +
            '<symbol id="icon-mail" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></symbol>' +
            '</defs></svg>';
        document.body.insertBefore(wrap.firstChild, document.body.firstChild);
    }

    function run() {
        injectSvgSprite();
        Promise.all([
            fetch(base + 'partials/header.html').then(function (r) { return r.text(); }),
            fetch(base + 'partials/footer.html').then(function (r) { return r.text(); }),
            fetch(base + 'partials/cta-banner.html').then(function (r) { return r.text(); })
        ]).then(function (parts) {
            var headerHtml = rewriteLinks(parts[0]);
            var footerHtml = rewriteLinks(parts[1]);
            var bannerHtml = rewriteLinks(parts[2]);
            var headerPlaceholder = document.getElementById('partial-header');
            var footerPlaceholder = document.getElementById('partial-footer');
            if (headerPlaceholder) {
                var temp = document.createElement('div');
                temp.innerHTML = headerHtml;
                var parent = headerPlaceholder.parentNode;
                while (temp.firstChild) {
                    parent.insertBefore(temp.firstChild, headerPlaceholder);
                }
                headerPlaceholder.remove();
            }
            if (footerPlaceholder) {
                footerPlaceholder.outerHTML = footerHtml;
            }
            var main = document.getElementById('main-content');
            if (main) {
                var firstSection = main.querySelector('section');
                if (firstSection) {
                    firstSection.insertAdjacentHTML('afterend', bannerHtml);
                }
            }
            setActiveNav();
            initHeaderScroll();
            initScrollAnimations();
            var toggle = document.querySelector('.mobile-menu-toggle');
            var menu = document.querySelector('.mobile-menu');
            var overlay = document.getElementById('mobile-menu-overlay');
            if (toggle && menu) {
                function syncDrawerAria() {
                    var open = menu.classList.contains('active');
                    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
                }
                function openMenu() {
                    menu.classList.add('active');
                    document.body.classList.add('mobile-menu-open');
                    toggle.setAttribute('aria-expanded', 'true');
                    syncDrawerAria();
                    if (overlay) {
                        overlay.classList.add('active');
                        overlay.setAttribute('aria-hidden', 'false');
                    }
                    var icon = toggle.querySelector('use');
                    if (icon) icon.setAttribute('href', '#icon-close');
                }
                function closeMenu() {
                    menu.classList.remove('active');
                    document.body.classList.remove('mobile-menu-open');
                    toggle.setAttribute('aria-expanded', 'false');
                    syncDrawerAria();
                    if (overlay) {
                        overlay.classList.remove('active');
                        overlay.setAttribute('aria-hidden', 'true');
                    }
                    var icon = toggle.querySelector('use');
                    if (icon) icon.setAttribute('href', '#icon-menu');
                }
                toggle.addEventListener('click', function () {
                    if (menu.classList.contains('active')) closeMenu();
                    else openMenu();
                });
                var closeDrawer = menu.querySelector('.mobile-menu__close');
                if (closeDrawer) closeDrawer.addEventListener('click', closeMenu);
                menu.querySelectorAll('.mobile-menu__link').forEach(function (link) {
                    link.addEventListener('click', closeMenu);
                });
                menu.querySelectorAll('.mobile-menu__header .logo').forEach(function (logoLink) {
                    logoLink.addEventListener('click', closeMenu);
                });
                if (overlay) overlay.addEventListener('click', closeMenu);
                document.addEventListener('keydown', function (ev) {
                    if (ev.key === 'Escape' && menu.classList.contains('active')) closeMenu();
                });
                window.addEventListener('resize', function () {
                    if (window.innerWidth > 900 && menu.classList.contains('active')) closeMenu();
                });
            }
        }).catch(function () {
            setActiveNav();
            initHeaderScroll();
            initScrollAnimations();
        });

        var sidebarPlaceholder = document.getElementById('partial-sidebar');
        if (sidebarPlaceholder) {
            fetch(base + 'partials/sidebar.html').then(function (r) { return r.text(); }).then(function (html) {
                sidebarPlaceholder.outerHTML = rewriteLinks(html);
            }).catch(function () {});
        }
    }

    function initHeaderScroll() {
        var header = document.querySelector('.header');
        if (!header) return;
        function onScroll() {
            header.classList.toggle('scrolled', window.scrollY > 20);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    function initScrollAnimations() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

        document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
            observer.observe(el);
        });

        var sectionHeaders = document.querySelectorAll('.section__header');
        sectionHeaders.forEach(function (el) {
            el.classList.add('animate-on-scroll');
        });
        document.querySelectorAll('.section__title, .section__subtitle').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('animate-in--delay-' + (Math.min((i % 3) + 1, 4)));
        });

        var cards = document.querySelectorAll('.product-card, .game-card, .blog-card, .promo-card, .seo-block, .match-card, .listicle-item, .region-card, .layout-split, .promo-teaser, .faq__item, .stat-inline');
        cards.forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('animate-in--delay-' + (Math.min((i % 4) + 1, 4)));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
