# GeoLead — Scraper, CRM & Enrichment Engine

A locally-hosted, map-based lead generation, enrichment, and CRM tool with AI-powered analysis.
GeoLead consists of a Chrome Extension to scrape Google Maps data, a Node.js/Express backend to store and enrich the data, and a Next.js frontend to visualize and manage the leads.

---

## 🏗 Architecture

```text
geolead-scraper/
├── apps/
│   ├── api/          ← Express REST server (port 4000). Handles db, routing, enrichment, scoring.
│   ├── web/          ← Next.js frontend (port 3000). Dashboards, maps, CRM pipeline.
│   └── extension/    ← Chrome Extension. Scrapes Maps, manages queues, sends payloads.
├── packages/
│   ├── types/        ← Shared TypeScript interfaces (Leads, Config, API Responses).
│   ├── config/       ← Centralized env configuration.
│   ├── db/           ← MongoDB connection, schema indexes, & queries.
│   └── ai/           ← Ollama AI integration for pitch generation.
```

---

## ✨ Features End-to-End

### 1. Data Ingestion & Chrome Extension
Load the `apps/extension/` folder in Chrome as an Unpacked Extension.
- **Scraping**: Automatically extracts names, phone numbers, websites, ratings, reviews, addresses, business hours, and services directly from Google Maps search results.
- **Multi-Search Queue**: Paste a list of keywords (e.g., "Plumbers in Austin", "Gyms in Dallas") into the extension popup. The extension will automatically open tabs, scroll through results, extract the data, and move to the next query.
- **Speed Control**: Adjust the scraping speed slider (150ms to 1000ms) to bypass rate limits or speed up extraction.
- **History**: Views total scraped leads directly in the extension popup.

### 2. Auto-Scoring & AI Analysis
- **Automatic Lead Scoring**: As leads hit the database, a background engine assigns a 0-100 score based on 9 signals (phone presence, website, rating count, rich data availability) and categorizes them into Hot (🔥), Warm (🌡️), or Cold (❄️).
- **Ollama AI Analysis**: Click "Analyze" on any lead to generate a custom sales pitch, pain point analysis, and a secondary quality score using a local LLM.

### 3. CRM & Data Management
- **Dashboard Data Table**: Filter leads by Score, Status, Has Phone, Has Website, Has Email, and specific categories.
- **Bulk Actions**: Select multiple leads to bulk update statuses, add tags, or delete.
- **Lead Detail Modal**: A rich slide-over panel showing score breakdowns, click-to-call, click-to-email, social links, contact history timeline, and a notes editor.
- **Kanban Pipeline**: A 7-column drag-and-drop board (New → Contacted → Follow Up → Qualified → Negotiating → Won → Lost) to visually track deal flow.
- **Duplicate Detection**: Identifies potential duplicate leads based on exact phone numbers, fuzzy name matching, and geographical radius matching. Provides a side-by-side comparison to dismiss or delete duplicates.

### 4. Headless Email & Social Enrichment
- **Manual Enrichment**: Click the "Find Email" button on a lead to trigger a headless Cheerio scraper that crawls their website's homepage, `/contact`, and `/about` pages.
- **Extraction**: Uses regex to find valid email addresses and parses `href` tags for active LinkedIn, Twitter/X, Facebook, and Instagram profiles.
- **Batch Background Processing**: Click "Batch Enrich" on the dashboard to asynchronously queue all leads that have a website but are missing an email. The worker processes them in chunks to prevent server locking and respects rate limits.

### 5. Visualization
- **Analytics Dashboard**: View aggregate data visually. Includes Recharts-powered pie charts for Score Distribution, bar charts for Top Categories, and line charts for Leads over Time.
- **Map View**: An interactive Leaflet map that plots all leads by their coordinates, using color-coded markers based on their Lead Score.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10+
- Docker (for MongoDB)
- [Ollama](https://ollama.com/) (Optional, for AI Analysis. Requires `qwen2.5:7b` or your preferred model)

### Setup

```bash
# 1. Start MongoDB via Docker
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Start the monorepo (boots both Web and API)
pnpm dev
```

- **Web Dashboard:** http://localhost:3000
- **API Server:** http://localhost:4000

---

## ⚙️ Environment Variables

All config lives in the root `.env` file workspace.

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://admin:adminpassword@localhost:27017/geolead_db?authSource=admin` | MongoDB connection string |
| `API_PORT` | `4000` | Express API port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API URL for the web app |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server |
| `OLLAMA_MODEL` | `qwen2.5:7b` | AI model for lead analysis |

---

## 📡 Core API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/leads` | List leads (supports pagination, filtering) |
| POST | `/api/leads` | Ingest bulk leads (used by Chrome Extension) |
| GET | `/api/stats` | High-level dashboard KPI stats |
| GET | `/api/analytics` | Recharts dashboard metrics |
| GET | `/api/leads/map` | Lightweight coordinates for Leaflet |
| POST | `/api/leads/bulk/status` | Bulk update status |
| GET | `/api/leads/duplicates` | Scan for dupes (Phone, Name, Geo) |
| POST | `/api/leads/:id/enrich` | Single lead email/social scraping |
| POST | `/api/leads/enrich/batch`| Start async batch enrichment worker |
| POST | `/api/leads/:id/analyze` | Trigger Ollama AI analysis |
| GET | `/api/leads/export` | CSV standard export |
