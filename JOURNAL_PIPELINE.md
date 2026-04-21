# O Matinal — Generation Pipeline

## Daily Workflow Process

Every day at **6 AM UTC (3 AM Brasília time)**, the GitHub Actions workflow runs and generates a fresh edition of O Matinal with the following steps:

### Step 1: 📰 Scraper (Node.js)
**File:** `journal/scraper.js`

1. **Fetch RSS Feeds** (with 1-hour caching)
   - Collects articles from 14 news sources
   - Portuguese: Folha, G1, O Globo, BBC
   - International: Netherlands, Japan, tech news, anime

2. **REWRITE ARTICLES** ← **Key Step**
   - Uses Google Gemini 2.5-Flash API
   - Rewrites each article in **1902 O Malho newspaper style**
   - Produces polite, formal Brazilian Portuguese
   - Expands RSS snippets into complete 2-minute reads
   - Outputs: ~300-500 word articles with period-appropriate language

3. **Collect Entertainment**
   - Fetch 5 jokes from historiadoriso.com.br
   - Generate weather data for Helmond, Netherlands

4. **Generate AI Images**
   - **Weather image**: Vintage crosshatching style illustration
   - **Header image**: Newspaper masthead design
   - **Joke image**: Illustration for first joke
   - Cached: Skip regeneration if files exist

5. **Generate Markdown**
   - Creates `_journal_articles/YYYY/MM/DD/index.md`
   - 42 articles in 7 sections
   - All content rewritten in O Malho style
   - Ready for Jekyll to build HTML

**Output:** `_journal_articles/2026/04/21/index.md` (113 KB)

---

### Step 2: 🔨 Jekyll Build (Ruby)
**File:** `_layouts/journal-vintage.html`

1. **Install Dependencies**
   - Ruby 3.2
   - Jekyll 4.3.4 with Kramdown parser

2. **Build HTML**
   - Converts markdown → HTML
   - Applies vintage newspaper layout
   - Optimizes for desktop AND Kindle
   - Generates `_site/journal_articles/2026/04/21/index.html`

**Output:** Complete HTML newspaper ready for publishing

---

### Step 3: 📝 Commit & Push
**File:** `.github/workflows/journal.yml`

1. **Configure Git**
   - User: "📰 O Matinal"
   - Email: action@github.com

2. **Commit Changes**
   - Stage: `_journal_articles/`
   - Message: `📰 Gerar O Matinal de 2026-04-21`
   - If no changes, silently skip (|| true)

3. **Push to Master**
   - Commits articles, images, and markdown
   - Available on GitHub Pages
   - Full git history of every edition

---

## Article Rewriting Details

### Input
- **Source:** RSS feed summary (88 characters)
- **Example:** "Muneyuki Kaneshiro, Yusuke Nomura, Kamome Shirahama attend Kodansha House from July 2-12"

### Processing
- **API:** Google Gemini 2.5-Flash
- **Model:** gemini-2.5-flash
- **Token limit:** 2000 tokens max output
- **Thinking disabled:** thinkingBudget: 0 (prevents truncation)

### Output
- **Format:** Formal 1902 Brazilian Portuguese
- **Length:** 300-500 words (2-minute read)
- **Style:** O Malho newspaper article
- **Newlines:** Converted to `<br/>` for HTML

**Example Output:**
> **O MALHO – Crônica Social e Artística**
> 
> **Grandes Nomes da Arte Japonesa em Celebração na Casa Kodansha e na Expo Anime!**
> 
> Prezados leitores e diletos apreciadores das belas-artes...

---

## Testing & Manual Generation

### Via GitHub Actions (Full Pipeline)
```
1. Go to: https://github.com/malukenho/malukenho.github.io
2. Actions → "📰 Gerar O Matinal" 
3. Run workflow → Enter date (YYYY-MM-DD) or leave blank
4. Watch the full pipeline execute
5. Articles committed to master when complete
```

### Via Command Line (Scraper Only)
```bash
export GEMINI_API_KEY="AIzaSyCqiyYwiqnpS-ZfRPKlCbuySd3eobgYMo0"
cd journal
node scraper.js 2026-04-20  # Specific date
node scraper.js             # Today's date
```

**Output:** `_journal_articles/2026/04/20/index.md`

---

## Performance & Caching

- **RSS Caching:** 1-hour TTL in `var/cache/`
- **Image Caching:** Skip generation if file exists
- **Article Rewriting:** ~50 seconds for 42 articles (5 at a time with delays)
- **Total Pipeline:** ~3-5 minutes on GitHub Actions

---

## Quality Assurance

✅ **Every Edition Includes:**
- 42 articles, all rewritten in O Malho 1902 style
- 7 curated sections (Technology, Politics, Culture, etc.)
- Weather information for Helmond
- 5 jokes with vintage illustration
- Vintage newspaper header
- Full source attribution links
- Responsive design (desktop + Kindle)

✅ **No Manual Editing Required**
- Fully automated
- Consistent quality every day
- Preserves original article links
- Archives all past editions

---

## Architecture Decisions

**Why rewrite articles?**
- RSS feeds provide snippets (88 chars), not full articles
- Gemini expansion creates proper newspaper content
- O Malho style transforms generic news into period-appropriate narrative

**Why cache RSS feeds?**
- Saves API calls during development
- 1 hour is reasonable for news freshness
- Can clear `var/cache/` to force refresh

**Why disable thinking mode?**
- Thinking tokens count toward output limit
- Truncated articles if thinking consumed budget
- thinkingBudget: 0 ensures full article output

**Why 2-minute reads?**
- Optimal for daily newspaper format
- Matches traditional O Malho article length
- Respects reader time on Kindle
- Gemini naturally produces this length

