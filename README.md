# UNSEEN - Local Setup

Adversarial AI strategy analysis tool. Six agents, one briefing.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env from template
copy .env.example .env

# 3. Add your Anthropic API key to .env
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Run
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Stack

- Backend: Node.js + Express
- AI: Anthropic Claude `claude-sonnet-4-20250514` (multi-agent)
- Document parsing: `pdf-parse` for PDF and `mammoth` for DOCX
- Frontend: Vanilla JS + HTML/CSS (no build step)

## Agents

1. Logic Mapper - extracts assumptions, dependencies, and weaknesses
2. Bull Advocate - steelmans the strategy
3. Bear Advocate - finds failure modes
4. Blind Spot Detector - surfaces the protected assumption
5. Question Generator - produces 5 unasked questions with context
6. Insight Synthesizer - writes the executive briefing

## File Support

PDF, DOCX, TXT, and MD files are supported, or you can paste text directly.
