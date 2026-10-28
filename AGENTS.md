# AGENTS.md — Unseen

Express + vanilla-JS app: six sequential Claude agents review a strategy document and produce an executive briefing.

## Commands
- Install: `npm install`
- Run (dev and prod are the same): `npm start` or `npm run dev` → `node server.js` on `http://localhost:3000` (`PORT` overrides)
- Test: none (`npm test` just echoes "No tests configured")
- Lint/build: none; the frontend has no build step
- Smoke check: `GET /api/ping` reports whether `ANTHROPIC_API_KEY` is loaded

## Where logic lives
- `src/agents.js`: `MODEL` constant (`claude-sonnet-4-6`), `ANALYSIS_TYPES`, the six `run*` agent functions, `analyzeDocument()` orchestrator, cost estimate
- `src/knowledge_base.js`: per-agent reference text, fetched with `getKnowledge('<agentKey>')`
- `src/extractor.js`: PDF (`pdf-parse`), DOCX (`mammoth`), TXT/MD extraction
- `server.js`: multer upload (10 MB, `.pdf/.docx/.txt/.md`), in-memory `jobs` Map, API routes, printable HTML export template
- `public/`: static UI (`index.html`, `js/app.js` polls `/api/status/:jobId`)

## Conventions
- CommonJS (`require`), no TypeScript, no framework on the frontend.
- Each agent is wrapped in `safeCallAgent(fn, fallback)`; keep a fallback so one failure doesn't kill the job.
- JSON-returning agents (Logic Mapper, Question Generator) strip ```json fences and then `JSON.parse`; keep prompts asking for raw JSON.
- The report shape returned by `analyzeDocument()` is used by both `public/js/app.js` and the export template in `server.js`. Change all three together.
- Adding an analysis type means updating `ANALYSIS_TYPES` in `src/agents.js` and the `<select id="analysisType">` in `public/index.html`.

## Do not commit / touch
- `.env` (holds the API key), `uploads/`, `reports/`, `node_modules/` (all gitignored).
- Don't log the full API key (startup logs print only a prefix).

## Gotchas
- `express.static('public')` is relative to the CWD, so start the server from the repo root.
- `.env` is loaded with `override: true`, so it wins over shell env vars.
- Jobs are in memory and are lost on restart. Uploads are deleted after 24 h.
- Long docs are truncated per agent by `prepareDoc()` (head 65% + tail).
- A 404 from Anthropic is surfaced as "Model not found": check `MODEL`.

Humans: see README.md
