# Blog / posts sync – setup guide

Steps to run the static blog generation pipeline on this repo or to replicate it on another site.

---

## Quickstart (new project in a few minutes)

1. Copy **`scripts/`** (whole tree), **`assets/data/blogs.json`** (start with `[]`), **`blog/`** listing, **`js/blog-loader.js`**, and **`sitemap.xml`** baseline (must contain `<!-- Blog Posts -->` … `<!-- /Blog Posts -->`; see section 2)  -  or clone this repo as a template.
2. **`npm install dotenv form-data glob sharp`** (add `wrangler` only if you deploy with it).
3. Copy **`.env.example`** → **`.env.local`** and set **`STRAPI_API_URL`**, **`SITE_DOMAIN`** (if multi-tenant), and **`STRAPI_API_TOKEN`** if needed.
4. Run **`npm run sync:doctor`**  -  confirms env is read and prints a sample **`GET`** URL (no network call).
5. Run **`npm run sync:all`** then **`npm run backfill:force`**.
6. Tune **`article.template.html`**, **`normalize-post.js`**, or env **`POSTS_COLLECTION`** / **`POSTS_SITE_FILTER_KEY`** if your API uses different collection or filter field names.

---

## 1. Prerequisites

- Node.js 20+ (24 recommended)
- npm
- Strapi (or compatible) HTTP API exposing a **posts** collection with pagination
- Static site project (HTML/CSS/JS)

---

## 2. Copy project structure

Copy these folders and files into your project:

```
your-site/
├── scripts/
│   ├── content-sync.js          # Fetches API posts, renders articles
│   ├── sync-doctor.js           # Prints env + sample GET URL (no network)
│   ├── backfill-internal-links.js
│   ├── backfill-related-posts-block.js
│   ├── audit-internal-links.js
│   ├── lib/
│   │   ├── fetch-posts.js       # GET /{POSTS_COLLECTION} + optional site filter
│   │   ├── normalize-post.js
│   │   ├── render-article.js
│   │   ├── inject-internal-links.js
│   │   └── generate-sitemap.js
│   └── templates/
│       └── article.template.html
├── blog/                         # Output dir for article pages
│   └── index.html               # Blog listing (static)
├── assets/
│   └── data/
│       └── blogs.json           # Created/updated by sync (or start with [])
├── sitemap.xml                  # Must include blog markers (see **sitemap.xml blog markers** below)
├── .env.local                   # Create locally (gitignored)
└── .env.example                 # Documented variable names (optional)
```

### sitemap.xml blog markers (required)

`scripts/lib/generate-sitemap.js` does **not** append to the end of the file. It finds two exact HTML comments and **replaces everything between them** with `<url>…</url>` entries built from `assets/data/blogs.json`.

Include these lines **inside** `<urlset>`, typically **after** your static blog index `<url>` and **before** other static URLs (footer pages, etc.). The spacing must match (two leading spaces):

```xml
  <!-- Blog Posts -->

  <!-- /Blog Posts -->
```

On each successful sync, the script overwrites the region between `<!-- Blog Posts -->` and `<!-- /Blog Posts -->` with one sitemap entry per post in `blogs.json` (canonical URLs use the base URL configured in `generate-sitemap.js`).

If either marker is missing, sync fails with:

`Could not find blog markers in sitemap.xml (expected "<!-- Blog Posts -->" and "<!-- /Blog Posts -->").`

When copying `sitemap.xml` from another project or hand-editing it, keep those comments or restore them before running `npm run sync` / `sync:all`.

---

## 3. Install dependencies

Add to `package.json` or run:

```bash
npm install dotenv form-data glob sharp wrangler --save-dev
```

---

## 4. Environment variables

Create `.env.local` in the project root (see root `.env.example` for names):

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRAPI_API_URL` | Yes for sync | API base including `/api`, e.g. `http://host/api` or `https://api.example.com/api` |
| `STRAPI_API_TOKEN` | If API uses auth | Sent as `Authorization: Bearer …` |
| `SITE_DOMAIN` or `site_domain` | Multi-tenant setup | Value for the site filter (default key: `filters[site][domain][$eq]`). If omitted and `SKIP_POSTS_SITE_FILTER` is not set, sync runs unfiltered and logs a warning. |
| `POSTS_COLLECTION` | No | REST collection segment after `/api/` (default: `posts`). |
| `POSTS_SITE_FILTER_KEY` | No | Full query parameter **name** for the domain filter (default: `filters[site][domain][$eq]`). Set to empty to omit the filter param only. |
| `SKIP_POSTS_SITE_FILTER` | No | If `1` / `true` / `yes`, never send a domain filter (single-tenant APIs). |

Optional for Cloudflare deploy (CLI):

```
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

---

## 5. API contract

**Request**

- Method: `GET`
- URL: `{STRAPI_API_URL}/{POSTS_COLLECTION}` (default collection: `posts`)
- Query (pagination & sort, Strapi-style):

  - `sort=publishedAt:asc`
  - `pagination[page]`, `pagination[pageSize]` (page size 100 in code)

- Query (site scope, when domain filtering is active  -  see env above):

  - `{POSTS_SITE_FILTER_KEY}={SITE_DOMAIN}` (default key: `filters[site][domain][$eq]`)

**Response**

- Expected shape: Strapi v4-style JSON with `data[]`, optional `meta.pagination`, and per-item `attributes` (or flat fields). `fetch-posts.js` normalises entries to plain objects for `normalize-post.js`.

If your collection name or filter shape differs, set **`POSTS_COLLECTION`** and **`POSTS_SITE_FILTER_KEY`** (or run unfiltered with **`SKIP_POSTS_SITE_FILTER=1`**). Use **`npm run sync:doctor`** to verify the built URL before syncing.

---

## 6. Post fields (Strapi → site)

Your content type should expose these fields, or adapt `normalize-post.js`:

| Field | Type | Notes |
|-------|------|-------|
| `slug` | string | URL slug |
| `title` | string | Article title |
| `content` | string or rich text | HTML or blocks |
| `shortDescription` / `excerpt` | string | Summary |
| `meta_title` | string | SEO title |
| `meta_description` | string | Meta description |
| `primary_keyword` / `focus_keyword` | string | Focus keyword |
| `search_intent` | string | navigational \| commercial \| transactional \| informational |
| `reading_time` | number/string | e.g. "5 min read" |
| `publishedAt` | datetime | Publish date |
| `updatedAt` | datetime | Last updated |
| `toc_json` | array | Table of contents (optional) |
| `placeholder_gradient` | string | CSS gradient (optional) |
| `keywords` | string/array | Used for internal linking |

---

## 7. Article template

`scripts/templates/article.template.html` uses these placeholders:

| Placeholder | Description |
|-------------|-------------|
| `{{META_TITLE}}` | SEO title |
| `{{META_DESCRIPTION}}` | Meta description |
| `{{KEYWORDS}}` | Meta keywords |
| `{{SLUG}}` | URL slug |
| `{{TITLE}}` | Article title |
| `{{CATEGORY}}` | Category label |
| `{{PUBLISHED_DATE_ISO}}` | YYYY-MM-DD |
| `{{PUBLISHED_DATE_FORMATTED}}` | Long date |
| `{{UPDATED_DATE_ISO}}` | YYYY-MM-DD |
| `{{READING_TIME}}` | e.g. "5 min read" |
| `{{EXCERPT}}` | Summary text |
| `{{PLACEHOLDER_GRADIENT}}` | CSS gradient |
| `{{FOCUS_KEYWORD}}` | Focus keyword |
| `{{TOC_HTML}}` | Table of contents |
| `{{ARTICLE_BODY}}` | Main content HTML |
| `{{SHARE_URL}}` | Canonical URL |
| `{{SHARE_TITLE}}` | Encoded title |
| `{{FAQ_SCHEMA_SCRIPT}}` | FAQ JSON-LD (optional) |

Use your site’s HTML layout and styles in the template.

---

## 8. Blog listing page

`blog/index.html` should:

- Load posts from `assets/data/blogs.json`
- Use `js/blog-loader.js` (or equivalent) to render the grid
- Match the data shape: `{ slug, title, excerpt, category, published_date, ... }`

### Pagination (client-side)

The grid is paginated **in the browser** by `js/blog-loader.js` after it loads `blogs.json`. This is separate from Strapi’s **`pagination[page]`** query parameters used during sync (see **API contract** above).

| Setting | Value | Where |
|--------|-------|--------|
| Posts per page | `6` | `PAGE_SIZE` in `blog-loader.js` |
| Max pager pages | `99` | `MAX_PAGE` in `blog-loader.js` |
| Max posts in the listing | `594` (`99 × 6`) | Older entries beyond this cap are **not** shown |

**Listing page markup** (inside the posts section):

- `#blog-posts-grid`  -  container the script fills with cards (`aria-live="polite"` is recommended).
- `#blog-pagination`  -  `<nav aria-label="…">` left empty; the script injects Previous / numbered links / Next and a “Page *x* of *y*” line. Hidden when there is only one page or no posts.
- `#blog-pagination-truncated`  -  optional `<p hidden>`; shown when `blogs.json` has **more than 594** posts, explaining that only the most recent 594 are listed.

**URL and history**

- Current page is read from the query string: **`?page=2`**. Page **1** omits `page` (canonical-style clean URL).
- Out-of-range `?page` values are clamped to `1 … totalPages` and the address bar is corrected with **`history.replaceState`**.
- Clicks on pager links use **`history.pushState`** so the grid updates without a full reload; **back/forward** is handled via **`popstate`**. The view scrolls to **`.blog-posts-wrap`** after an in-page pager click.

**Pager UI**

- Compact numbered sequence with ellipses (`…`) so long page counts do not produce a huge row of buttons.
- Requires styles for `.blog-pagination` and related classes (this repo: `css/style.css`).

When copying the setup to another project, keep **`PAGE_SIZE`**, **`MAX_PAGE`**, and the three element IDs in sync between HTML and `blog-loader.js`, or adjust the constants and selectors together.

### Blog sort order (latest sync → oldest)

Keep the **same** ordering everywhere the pipeline touches post lists:

| Layer | Behaviour |
|-------|-----------|
| **`scripts/content-sync.js`** | After each sync, `blogs.json` is sorted with `sortBlogsByLatestSyncFirst`: primary key **`synced_at`** (newest first), then **`published_date`** if `synced_at` is missing, then **`slug`** for a stable tie-break. |
| **`js/blog-loader.js`** | Blog index grid uses that same rule so items are not re-ordered alphabetically when every post shares the same `published_date`. |
| **`js/blog-article.js`** | Article sidebar “recent posts” uses the same rule. |

If you copy this setup to another repo, align all three so the newest posts from the API stay consistent on the listing and in sidebars.

---

## 9. Package.json scripts

```json
{
  "scripts": {
    "sync": "node scripts/content-sync.js",
    "sync:all": "node scripts/content-sync.js --all",
    "sync:doctor": "node scripts/sync-doctor.js",
    "backfill": "node scripts/backfill-internal-links.js",
    "backfill:force": "node scripts/backfill-internal-links.js --force",
    "audit:links": "node scripts/audit-internal-links.js",
    "deploy": "wrangler pages deploy . --project-name=YOUR_PROJECT"
  }
}
```

---

## 10. What gets generated

| Step | Command | Generates/updates |
|------|---------|-------------------|
| Sync | `npm run sync` | Fetches new posts from API, renders `blog/{slug}/index.html`, appends to `blogs.json`, refreshes the blog region in `sitemap.xml` (between HTML comment markers) |
| Sync all | `npm run sync:all` | Same as sync, but processes every not-yet-seen post in one run |
| Doctor | `npm run sync:doctor` | Prints env-backed config and a sample `GET` URL (offline) |
| Backfill | `npm run backfill` | Adds internal links to existing articles (new articles only) |
| Backfill force | `npm run backfill:force` | Strips and re-injects internal links in all articles |
| Audit | `npm run audit:links` | Reports link count per article (read-only) |

---

## 11. Typical workflow

**First-time setup**

1. Create `assets/data/blogs.json` as `[]` (empty array)
2. Ensure `sitemap.xml` exists with `</urlset>` and the **blog markers** (`<!-- Blog Posts -->` … `<!-- /Blog Posts -->`)  -  see **sitemap.xml blog markers** in section 2
3. Configure `.env.local` (`STRAPI_API_URL`, optional token, `SITE_DOMAIN` or `SKIP_POSTS_SITE_FILTER`)
4. Run `npm run sync:doctor` and confirm the sample URL matches your Strapi API
5. Align `article.template.html` with your layout
6. Run `npm run sync:all` to fetch and render all posts for the configured site
7. Run `npm run backfill:force` to inject internal links

**Ongoing (e.g. daily via CI)**

1. `npm run sync` – fetch and render new posts
2. `npm run backfill:force` – refresh internal links across articles
3. Commit and push changes
4. `npm run deploy` – deploy to Cloudflare Pages (if using Wrangler)

---

## 12. GitHub Actions

Workflow: `.github/workflows/daily-sync.yml`.

**Repository secrets**

- `STRAPI_API_URL` – e.g. `http://host/api` or `https://api.example.com/api`
- `STRAPI_API_TOKEN` – if the API requires a bearer token
- `SITE_DOMAIN` – e.g. `m99game.com` when using the default `filters[site][domain][$eq]` filter

Optional: add **`POSTS_COLLECTION`**, **`POSTS_SITE_FILTER_KEY`**, or **`SKIP_POSTS_SITE_FILTER`** to the workflow `env:` block if a project needs them (mirror your `.env.local`).

Deploy secrets (`CLOUDFLARE_*`) are only needed if the workflow deploys from Actions; this repo’s workflow commits generated files only.

---

## 13. blogs.json fields

Each entry in `blogs.json` should have:

- `slug`, `title`, `meta_title`, `meta_description`, `focus_keyword`
- `category`, `search_intent`, `published_date`, `reading_time`
- `excerpt`, `placeholder_gradient`, `related_posts`, `keywords`
- `synced_at` – ISO timestamp set when the post is written by `content-sync.js`; used as the primary sort key for the blog index and sidebars (see **Blog sort order** in section 8).

The `keywords` array feeds internal link injection. Add 4–8 phrases per post for best results.

---

## 14. Related docs

- Design tokens and layout: `brand.md`
- CSS entry: `css/main.css` (tokens, components, base)
