# Ylopo Website

@CLAUDE-WAT.MD

---

## Project Context

This project builds the **Ylopo marketing website** — a public-facing site for Ylopo, a real estate digital marketing and lead generation platform. The goal is to design, build, and iterate on pages that answer the questions prospects are asking, fix SEO gaps, and drive more demo bookings.

All work is guided by two key documents:
- **`pages/seo-opportunity-report.html`** — Full SEO audit of ylopo.com (March 2026)
- **`pages/questions-spreadsheet.html`** — 25 unanswered questions mapped to spokespeople and publish destinations
- **`pages/90-day-plan.html`** — Interactive 90-day action tracker with checkboxes and team assignments

---

## The Team

| Person | Role | Responsibilities |
|---|---|---|
| **Kiwi** | Strategy & Approvals | Interviews, content direction, final sign-off on all pages |
| **Jojo** | SEO | Technical SEO fixes on ylopo.com, schema markup, sitemap, Search Console |
| **Jom** | Web Dev | Building and deploying new pages on ylopo.com |
| **Lanie** | Web Dev | Building and deploying new pages on ylopo.com |
| **Paul** | Video Editing | Editing and publishing YouTube videos from interview footage |
| **Mike** | Video Editing | Editing and publishing YouTube videos from interview footage |

---

## The Spokespeople

### Barry Jenkins — Realtor-in-Residence
- Licensed real estate agent who runs a large team using Ylopo at the highest level
- Best voice for: ROI and results, onboarding experience, fit and qualification, competitor comparisons (firsthand), who Ylopo is and isn't right for
- Has an active YouTube presence; many questions should be answered on camera by him
- Same type of person as Ylopo's target clients — highly relatable

### Ge — President, CMO & CPO
- Co-founder; owns all product, pricing, and business decisions
- Best voice for: pricing model, lead tiers, AI product, contracts, data ownership, integrations, company direction
- Should answer anything that requires authority on how the product or business works

---

## Pricing Model (Important Context)
Ylopo pricing is **not one-size-fits-all**. It depends on:
1. **Lead type:** Social leads (lowest cost) → PPC/Google leads (mid) → Live Transfer / Direct Connect (highest — involves a live call center and filtration)
2. **Lead volume:** Bigger teams with more agents need more leads, which means more ad spend
3. **Market size and audience**

There is no public price because it's custom-quoted after a demo. The website should explain *why* a demo is needed and *what factors determine cost* — not dodge the question. The CTA is always "Book a Demo."

---

## 25 Questions We Need to Answer

The full list with spokespeople and publish destinations is in **`pages/questions-spreadsheet.html`**.

**8 Critical questions** (highest impact on demo conversions):
1. How does Ylopo pricing work, and why do you need a demo to get a real number?
2. Does spending more on ads get me more leads?
3. What's the difference in cost between Social, PPC, and Live Transfer leads?
4. How does Ylopo's total cost compare to buying 12 tools separately?
11. How does Ylopo's AI actually work — what does it say to my leads?
12. Are my leads exclusive to me, or shared?
24. "No long-term contracts" — what does that actually mean?
25. If I cancel, do I keep my leads and data?

**Interview format:** Kiwi interviews Barry and Ge on camera, asking all 25 questions. Raw footage goes to Paul/Mike for editing. Transcripts used to write FAQ and other page copy.

---

## SEO Issues Found on ylopo.com (Fix These)

From the March 2026 audit in `pages/seo-opportunity-report.html`:

### P0 — Critical (fix immediately)
- **robots.txt blocks AI crawlers** — GPTBot, ClaudeBot, Google-Extended, anthropic-ai are all blocked. For an AI-branded company this is a major miss. Remove them from the Disallow block.
- **No llms.txt file** — Create one so AI tools know what Ylopo does
- **Zero unique meta descriptions** — Every page uses the same one. Google ignores them
- **/demo page title = "AI Behavioral Texting"** — Wrong. Fix to match page purpose
- **/contact-us title = "Main Contact Us Page"** — CMS label leaked into production
- **Canonical tags point to homepage** — Pages like /listingrocket and /buyer-lead-generation have canonicals pointing to root. Fix to self-referencing
- **Multiple H1s per page** — /real-estate-lead-nurture has 9 H1s. /crm-integration has 8. Fix to one H1 per page

### Pages Missing from Sitemap
- /faq, /reviews, /testimonials — exist but not in sitemap.xml

### Schema Gaps (add these)
- FAQPage schema (highest impact — enables accordion FAQs in Google SERPs)
- Organization schema with sameAs links (LinkedIn, G2, Crunchbase)
- AggregateRating on /reviews (enables star ratings in branded search)
- Event schema on webinar pages (currently using Article schema)

---

## Pages to Build (from the 90-day plan)

| Page | Status | Notes |
|---|---|---|
| `/faq` | To do | 8 Critical questions minimum, FAQPage schema required |
| `/pricing` | To do | Explain 3 lead tiers + why demo is needed |
| `/how-it-works` | To do | 30/60/90 day onboarding timeline, Barry as narrator |
| `/compare` (×3) | To do | vs CINC, vs BoomTown, vs Sierra Interactive |
| `/case-studies` | To do | 3 client stories with real ROI numbers |
| `/integrations` | To do | CRM list, sync depth, setup links |
| ROI calculator | To do | "How many closings to break even?" interactive tool |

---

## Deployment Workflow

### GitHub
- Repo: `https://github.com/kiwi-vegas/ylopo-website`
- Branch: `main`
- Token stored in `.env` as `GITHUB_TOKEN`
- Push with: `git add [files] && git commit -m "message" && git push`

### Netlify
- Site: `ylopo-website.netlify.app`
- Site ID: `f78ce215-68a7-4e22-9158-4fed39da0d03`
- Token stored in `.env` as `NETLIFY_TOKEN`
- Deploy command (run after every push):
```bash
cd "/Users/kiwi/Desktop/Cowork/Ylopo Website" && zip -r /tmp/ylopo-deploy.zip . \
  --exclude "*.git*" --exclude "node_modules/*" --exclude ".env" \
  --exclude "temporary screenshots/*" --exclude "*.pdf" \
  --exclude "package*.json" --exclude "*.mjs" \
  --exclude "CLAUDE*" --exclude "workflows/*" && \
curl -s -X POST "https://api.netlify.com/api/v1/sites/f78ce215-68a7-4e22-9158-4fed39da0d03/deploys" \
  -H "Authorization: Bearer $(grep NETLIFY_TOKEN .env | cut -d= -f2)" \
  -H "Content-Type: application/zip" \
  --data-binary @/tmp/ylopo-deploy.zip
```

### netlify-cli
Installed locally (`npx netlify`). Interactive commands won't work in this shell — use the curl API approach above instead.

---

## Published Pages (Netlify URLs)

| Page | URL |
|---|---|
| Style Guide | `ylopo-website.netlify.app/style-guide.html` |
| Marketing Plan | `ylopo-website.netlify.app/ylopo-marketing-plan.html` |
| SEO Opportunity Report | `ylopo-website.netlify.app/pages/seo-opportunity-report.html` |
| 25 Questions Spreadsheet | `ylopo-website.netlify.app/pages/questions-spreadsheet.html` |
| 90-Day Action Plan | `ylopo-website.netlify.app/pages/90-day-plan.html` |

---

## Project-Specific Rules

- All deliverable HTML files go in the **project root** or **`pages/`** — never in `src/`
- Brand assets (logo, style guide) are in the **project root** — always reference before designing
- Credentials go in `.env` only — never hardcoded, never committed
- Always use Ylopo brand colors: Green `#7BC109`, Navy `#172F44`
- Always use Raleway (headings) + Nunito (body) from Google Fonts
- **Do not modify `style-guide.html`** — it is a completed deliverable
- After every code change: commit to GitHub AND redeploy to Netlify
- The 90-day plan uses `localStorage` key `ylopo-90day-v3` — bump the version if task IDs change
