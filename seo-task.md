# SEO Audit & Improvement System (SOP)

## Role & Context
**Role:** Senior SEO Architect & Web Systems Engineer
**Objective:** Audit, optimize, and scale the website's SEO foundation without disrupting existing functionality.
**Version:** 2.0 (System Upgrade)

---

## STEP 1  -  SEO Audit (Read-Only)

### 1.1 On-Page SEO
**Audit Checklist:**
- [ ] **Title Tags:** Unique, keyword-aligned, within visible pixel limits (approx. 600px).
- [ ] **Meta Descriptions:** Unique, actionable, 120–160 chars.
- [ ] **H1 Tags:** Exactly one `<h1>` per page, distinct from Title tag if necessary.
- [ ] **Heading Hierarchy:** Strictly logical order (H1 → H2 → H3). No skipped levels.
- [ ] **Keyword Placement:** Target terms in Title, H1, First 100 words, URL slug.
- [ ] **Content Depth:** No "thin content" pages (< 300 words) unless intended (e.g., contact form).
- [ ] **Cannibalization:** Ensure no two pages target the exact same primary keyword.

**Pass / Fail Criteria:**
- ✅ **Pass:** 100% of indexable pages have unique Titles/Metas. H1 exists and is unique.
- ❌ **Fail:** Any duplicate IDs, missing H1s, or generic titles ("Home", "Page 1").

**Why / How / Risks:**
- **Why:** Correct signals help Google understand page relevance and intent.
- **How:** Crawl with tools or inspect source code manually.
- **Risk:** Over-optimizing (keyword stuffing) can trigger spam penalties.

---

### 1.2 URL Structure
**Audit Checklist:**
- [ ] **Format:** Lowercase, hyphen-separated, clean (no special chars).
- [ ] **Readability:** URL describes the content (e.g., `/blog/seo-tips` not `/p=123`).
- [ ] **Depth:** Avoid excessive nesting (> 3 subfolders) unless architecturally required.
- [ ] **Parameters:** No indexable URLs with query strings (`?sort=date`) unless canonicalized.
- [ ] **Consistency:** Trailing slashes are handled consistently (enforced via redirect or canonical).

**Pass / Fail Criteria:**
- ✅ **Pass:** URLs are static, clean, and match the canonical tag.
- ❌ **Fail:** Mix of uppercase/lowercase, underscores instead of hyphens, or duplicate paths.

**Why / How / Risks:**
- **Why:** Clean URLs improve CTR and crawl efficiency.
- **Risk:** Changing URLs without 301 redirects destroys existing rankings immediately.

---

### 1.3 Images & Media
**Audit Checklist:**
- [ ] **Alt Text:** Descriptive text for every meaningful image (empty `alt=""` for decorative).
- [ ] **File Size:** No images > 200KB unless strictly necessary (e.g., hero banners).
- [ ] **Dimensions:** Images sourced at display size (no 4000px images scaled down to 400px).
- [ ] **Format:** WebP or AVIF served where possible.
- [ ] **Loading:** `loading="lazy"` on below-the-fold images; `priority` or `eager` for LCP image.

**Pass / Fail Criteria:**
- ✅ **Pass:** All images have alt attributes; LCP image is preloaded/optimized.
- ❌ **Fail:** Missing alt text on content images; huge PNGs slowing down load time.

**Why / How / Risks:**
- **Why:** Image search traffic + accessibility + page speed.
- **Risk:** Lazy loading the LCP (hero) image harms Core Web Vitals.

---

### 1.4 Technical SEO
**Audit Checklist:**
- [ ] **Robots.txt:** Valid syntax; critical resources (CSS/JS) not blocked.
- [ ] **Sitemap.xml:** Exists, auto-updates, contains only 200 OK indexable pages.
- [ ] **Canonicals:** Self-referencing canonical tag present on all original pages.
- [ ] **Links:** No broken internal links (404s) or redirect chains (301 -> 301).
- [ ] **Security:** HTTPS enforced everywhere (mixed content errors = fail).
- [ ] **Mobile:** Responsive design passes Google's Mobile-Friendly tests.

**Pass / Fail Criteria:**
- ✅ **Pass:** Zero 4xx/5xx errors in crawl; Sitemap matches indexable count.
- ❌ **Fail:** 'noindex' tags on valid pages; HTTP pages reachable.

**Why / How / Risks:**
- **Why:** Ensures search engines can access and index content correctly.
- **Risk:** Accidentally noindexing the whole site via robots.txt or meta tags.

---

### 1.5 Performance (Core Web Vitals)
**Audit Checklist:**
- [ ] **LCP (Largest Contentful Paint):** < 2.5s on mobile.
- [ ] **CLS (Cumulative Layout Shift):** < 0.1 score.
- [ ] **INP (Interaction to Next Paint):** < 200ms.
- [ ] **Resources:** Minimal render-blocking JavaScript/CSS.
- [ ] **Compression:** Gzip/Brotli enabled for text assets.

**Pass / Fail Criteria:**
- ✅ **Pass:** "Good" score in PageSpeed Insights (Green zone).
- ❌ **Fail:** "Poor" URLs in Search Console or LCP > 4s.

**Why / How / Risks:**
- **Why:** UX is a direct ranking factor.
- **Risk:** Optimizing for score numbers but ignoring actual user experience metrics.

---

### 1.6 Audit Output (MANDATORY GATE)
**Deliverable:**
Create a prioritized report before implementation:
1.  **Critical Blockers:** (e.g., Site noindexed, Broken Links)
2.  **Quick Wins:** (e.g., Meta tags, H1 fixes)
3.  **Long-term:** (e.g., Content expansion, Architecture changes)
4.  **List of Affected URLs**

**STOP:** Do not proceed to Step 2 until Audit is documented.

---

## STEP 2  -  On-Page SEO Fixes

**Objective:** Systematically fix issues identified in Audit 1.1 & 1.2.

### 2.1 Metadata Optimization
-   **Action:** Rewrite Titles to place keywords near the front.
-   **Action:** Write Meta Descriptions as "ad copy" to improve Click-Through Rate (CTR).
-   **Validation:** Ensure no truncation in SERP preview tools.

### 2.2 Heading Hygiene
-   **Action:** Ensure strict H1 assignment (1 per page).
-   **Action:** Refactor H2-H6 to structure content semantically (Introduction -> H2, Subpoint -> H3).

### 2.3 Internal Linking Strategy
-   **Action:** Link to high-value pages from relevant blog posts/parents using descriptive anchor text.
-   **Constraint:** Max 3-5 internal links per 1000 words to avoid dilution.
-   **Check:** Ensure footer/sidebar links are navigational, not spammy lists.

---

## STEP 3  -  Content Improvements

**Objective:** Enhance value and relevance (Audit 1.1).

### Checklist:
- [ ] **Word Count:** Expand thin pages to **≥ 800 words** (only if topic demands it).
- [ ] **Intent Matching:** Does the content answer the user's query immediately?
- [ ] **Structure:** Use bullet points, bold text, and short paragraphs for readability.
- [ ] **EEAT Signals:** Ensure author bylines, credentials, or "About" context exists.
- [ ] **FAQ Schema:** Add FAQ sections for Q&A query targeting.
- [ ] **Keyword Variation:** Use synonyms and LSI keywords naturally (no stuffing).

**Acceptance Criteria:**
- Content reads naturally to a human.
- Primary topic is covered comprehensively.
- No "Wall of Text" (paragraphs < 4 lines).

---

## STEP 4  -  Image Optimization

**Objective:** Fix issues from Audit 1.3.

### Checklist:
- [ ] **Attributes:** Add meaningful `alt` text to all content images.
- [ ] **Modern Formats:** Convert JPG/PNG to WebP/AVIF.
- [ ] **Sizing:** Specify explicit `width` and `height` attributes to prevent CLS.
- [ ] **Lazy Loading:** Apply `loading="lazy"` to everything **except** the viewport image.

---

## STEP 5  -  Technical SEO Enhancements

**Objective:** Fix issues from Audit 1.4.

### Checklist:
- [ ] **Canonicalization:** Add self-referencing canonicals to all preferred URLs.
- [ ] **Sitemap:** Regenerate `sitemap.xml` excluding admin, login, or tag pages.
- [ ] **Robots.txt:** Optimize to allow crawling of useful assets, block internal-only paths.
- [ ] **Structured Data (JSON-LD):**
    - [ ] `Organization` (Global)
    - [ ] `WebSite` (Global)
    - [ ] `Article` / `BlogPosting` (Posts)
    - [ ] `BreadcrumbList` (Structure)
    - [ ] `Product` (if applicable)

**Validation:** Use Google Rich Results Test to verify zero errors.

---

## STEP 6  -  Performance Optimization

**Objective:** Fix issues from Audit 1.5.

### Checklist:
- [ ] **Script Management:** Defer or delay non-essential 3rd party scripts (analytics, chat).
- [ ] **CSS/JS:** Minify and bundle assets. Inline critical CSS if possible.
- [ ] **Caching:** Verify `Cache-Control` headers (long expiry for static assets).
- [ ] **Fonts:** Use `font-display: swap` and preload primary font subsets.

---

## STEP 7  -  SCALABILITY & MAINTENANCE (New)

**Objective:** Ensure the system remains healthy as it grows.

### 7.1 Scaling Considerations
-   **Programmatic SEO:** If generating pages, ensure unique data points to avoid "Doorway Page" penalties.
-   **Automation:** Use templates for Meta Tags (e.g., `[Title] - [Category] | [Brand]`) to ensure baseline coverage.

### 7.2 Content Refresh & Maintenance
-   **Quarterly Audit:** Re-run Step 1 every 3 months.
-   **Decay Check:** Identify pages with dropping traffic and refresh content/date.
-   **Link Rot:** Run a broken link checker monthly.
-   **Automation (this repo):** From project root, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\seo-maintain.ps1 -CheckSitemap`  -  validates internal `href`/`src`, local assets, and `sitemap.xml` `<loc>` targets. See [`seo-audit-report.md`](seo-audit-report.md) § Step 7 for the maintenance runbook.

### 7.3 Advanced / Optional Enhancements
-   **Internationalization (i18n):** Implement `hreflang` tags if targeting multiple regions.
-   **Edge SEO:** Use edge functions for A/B testing or dynamic headers.
-   **IndexNow:** Implement for instant indexing of new content (if your publishing stack supports it).

---

## RULES & CONSTRAINTS

❌ **DO NOT:**
- Change database schemas or core logic without backend approval.
- Break existing routes (must 301 redirect if URL changes).
- Remove traffic-generating content without a replacement strategy.
- Modify authentication flows.
- "Fix" things that aren't broken (e.g., changing a high-ranking URL).

✅ **MUST:**
- **Code:** Comment all SEO logic changes.
- **Testing:** Test changes in staging before production.
- **Rollback:** Have a backup plan if rankings tank.
- **Modular:** Keep SEO components reusable.

---

## FINAL OUTPUT REQUIRED

Upon completion of the cycle, generate a **Completion Report**:

1.  **Summary of Executed Changes:** (What was fixed?)
2.  **Impact Analysis:** (Expected improvement in Rankings/CTR/Speed)
3.  **Remaining Risks:** (What couldn't be fixed and why?)
4.  **Next Cycle Recommendations:** (What to focus on next?)
