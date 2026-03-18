# Workflow: SEO Audit → HTML Slide Deck

## Objective
Produce a prioritized SEO opportunity report for Ylopo.com as a branded HTML slide presentation. Identifies technical SEO issues, content gaps, and prospect question opportunities for real estate agent/team leader/broker owner audiences.

## Inputs

| Input | Required | Location | Notes |
|-------|----------|----------|-------|
| Target URL | Yes | Hardcoded: `https://ylopo.com` | |
| Search Console CSV | Recommended | `search-console-export.csv` in project root | Performance report: queries, clicks, impressions, position |
| GA4 Export | Optional | `ga4-export.csv` in project root | Landing page traffic data |

## Tools Used

| Tool | Purpose |
|------|---------|
| Firecrawl MCP | Full site crawl — extracts content, meta tags, links, schema |
| `seo-audit` skill | Structured SEO analysis framework |
| `ai-seo` skill | LLM/AI search readiness section |
| `slides` skill | HTML presentation generation |
| WebFetch | Reddit + YouTube question research |
| `tools/parse-search-console.mjs` | Parse SC CSV if provided |
| `screenshot.mjs` | Visual QA of final slides |

## Process

### Step 1: Check for optional data files
```bash
ls /Users/kiwi/Desktop/Cowork/Ylopo\ Website/*.csv
```
If `search-console-export.csv` exists, run:
```bash
node tools/parse-search-console.mjs search-console-export.csv
```

### Step 2: Crawl the site
Use Firecrawl MCP crawl on `https://ylopo.com`:
- Crawl limit: 50 pages minimum
- Extract: title, meta description, H1/H2s, schema, internal links, body text
- Also fetch separately: `/robots.txt`, `/sitemap.xml`, `/llms.txt`

### Step 3: Technical audit checklist
Per page, check:
- [ ] Title tag: present, 50-60 chars, contains target keyword
- [ ] Meta description: present, 120-155 chars, compelling
- [ ] H1: exactly one, keyword-aligned
- [ ] H2/H3: logical hierarchy
- [ ] Schema markup: Organization, FAQPage, BreadcrumbList, Product
- [ ] Canonical tags: self-referencing, no conflicts
- [ ] Open Graph tags: og:title, og:description, og:image
- [ ] Internal links: no orphan pages, proper anchor text
- [ ] LLM-readability: content in plain HTML (not JS-injected)
- [ ] llms.txt: exists at `/llms.txt`?
- [ ] robots.txt: no important pages blocked
- [ ] sitemap.xml: all key pages listed

### Step 4: Prospect question research
**Reddit (WebFetch):**
- `https://www.reddit.com/r/realtors/search/?q=lead+generation&sort=top`
- `https://www.reddit.com/r/realtors/search/?q=IDX+website&sort=top`
- `https://www.reddit.com/r/realtors/search/?q=Ylopo&sort=top`
- `https://www.reddit.com/r/RealEstate/search/?q=lead+generation+software&sort=top`
- `https://www.reddit.com/r/realtors/search/?q=AI+follow+up&sort=top`
- `https://www.reddit.com/r/realtors/search/?q=BoomTown+CINC+Sierra&sort=top`

**YouTube (WebFetch):**
- `https://www.youtube.com/results?search_query=real+estate+lead+generation+software+review`
- `https://www.youtube.com/results?search_query=IDX+website+realtors`
- `https://www.youtube.com/results?search_query=Ylopo+review`
- `https://www.youtube.com/results?search_query=AI+texting+real+estate+leads`

### Step 5: Content gap matrix
Build a table:
| Question | Intent | Ylopo Coverage | Gap Severity | Priority |
|----------|--------|---------------|--------------|----------|

Coverage: Full / Partial / None
Severity: High / Medium / Low (based on conversion proximity + frequency)

### Step 6: Prioritize
Score all gaps on effort (1-3) × impact (1-3). Top 7 = Quick Wins section.

### Step 7: Build slides
Use `slides` skill with full audit data.
Output: `pages/seo-opportunity-report.html`

### Step 8: QA
```bash
# Ensure server is running
lsof -ti:3001 || python3 -m http.server 3001 &

# Screenshot key slides
node screenshot.mjs http://localhost:3001/pages/seo-opportunity-report.html title
node screenshot.mjs http://localhost:3001/pages/seo-opportunity-report.html audit
node screenshot.mjs http://localhost:3001/pages/seo-opportunity-report.html gaps
node screenshot.mjs http://localhost:3001/pages/seo-opportunity-report.html roadmap
```

Do 2+ comparison rounds. Read screenshots with the Read tool. Fix any brand or layout issues.

## Expected Outputs

| Output | Location |
|--------|----------|
| HTML slide deck | `pages/seo-opportunity-report.html` |
| Screenshots | `temporary screenshots/` |
| SC parser script | `tools/parse-search-console.mjs` (if data provided) |

## Slide Structure (18-22 slides)

1. Title slide
2. Executive Summary
3. Methodology
4. Technical SEO Health (pass/fail dashboard)
5. Crawlability & Indexing
6. LLM / AI Search Readiness
7. On-Page SEO Scorecard
8. What Prospects Are Asking (Reddit + YouTube)
9. Content Gap Matrix
10. Quick Wins — Do This Week
11. Priority 1: FAQ Schema
12. Priority 2: New Content Pages
13. Priority 3: LLM Optimization
14. Competitor Snapshot (BoomTown, CINC, Sierra)
15. Effort / Impact Matrix (visual 2x2)
16. 30/60/90 Day Roadmap
17. Appendix: Full Technical Audit
18. Appendix: Question Bank

## Edge Cases

- **JS-heavy site**: Firecrawl renders JS by default. If content is still missing, use Puppeteer screenshot to verify rendered state.
- **Robots.txt blocking crawl**: Fetch the page directly with WebFetch if Firecrawl is blocked.
- **Schema is JS-injected**: Cannot be detected via fetch alone. Flag in report with note to use Google Rich Results Test.
- **Reddit returns login wall**: Try `old.reddit.com` URL variant.
- **Search Console CSV missing**: Proceed without it; note in slides as "first-party data not available."

## Brand Rules
- Colors: Primary `#7BC109`, Navy `#172F44`, white only
- Fonts: Raleway (headings), Nunito (body) via Google Fonts CDN
- Logo: `ylopo-logo-2021.png` — never stretch or recolor
- 16:9 slide format
- Chart.js for all data visualizations
