const Anthropic = require('@anthropic-ai/sdk');
const { getKnowledge } = require('./knowledge_base');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

const ANALYSIS_TYPES = {
  strategic_review: 'Strategic Review',
  risk_assessment: 'Risk Assessment',
  pivot_analysis: 'Pivot Analysis',
  market_entry: 'Market Entry Analysis',
  fundraising: 'Fundraising Strategy Review',
};

let _totalInputTokens = 0;
let _totalOutputTokens = 0;

async function callAgent(systemPrompt, userPrompt, maxTokens = 1000) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  _totalInputTokens += response.usage?.input_tokens || 0;
  _totalOutputTokens += response.usage?.output_tokens || 0;
  return response.content[0].text;
}

function getTokenUsage() {
  return {
    inputTokens: _totalInputTokens,
    outputTokens: _totalOutputTokens,
    // claude-sonnet-4: $3/MTok input, $15/MTok output
    estimatedCostUSD: ((_totalInputTokens / 1e6) * 3 + (_totalOutputTokens / 1e6) * 15).toFixed(4),
  };
}

function resetTokenUsage() {
  _totalInputTokens = 0;
  _totalOutputTokens = 0;
}

// AGENT 1: Logic Mapper
async function runLogicMapper(docText, analysisType) {
  const system = `You are a strategic logic analyzer. Your job is to map the underlying reasoning structure of business documents with precision and depth. You identify explicit claims, implicit assumptions, dependencies, and structural weaknesses.

Use the following reference knowledge to guide your analysis:
${getKnowledge('logicMapper')}

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.`;

  const user = `Analyze this ${ANALYSIS_TYPES[analysisType] || 'strategic'} document and extract the logical structure.

DOCUMENT:
${docText.substring(0, 6000)}

Return JSON with exactly this structure:
{
  "coreClaim": "The single most important claim this document makes",
  "keyAssumptions": ["assumption 1", "assumption 2", "assumption 3", "assumption 4", "assumption 5"],
  "implicitAssumptions": ["hidden assumption 1", "hidden assumption 2", "hidden assumption 3"],
  "criticalDependencies": ["if X then Y dependency 1", "dependency 2", "dependency 3"],
  "structuralWeaknesses": ["weakness 1", "weakness 2", "weakness 3"]
}`;

  const raw = await callAgent(system, user, 1200);
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      coreClaim: 'Unable to parse — document may be insufficiently structured',
      keyAssumptions: [],
      implicitAssumptions: [],
      criticalDependencies: [],
      structuralWeaknesses: []
    };
  }
}

// AGENT 2: Bull Advocate
async function runBullAdvocate(docText, logicMap, analysisType) {
  const system = `You are a brilliant, optimistic strategic analyst. Your job is to make the strongest possible case for a strategy — to steelman it completely. You find every reason it could work, every tailwind, every underappreciated strength. Be specific, cite real market dynamics, and be genuinely persuasive.

Use the following benchmarks and frameworks to ground your bull case in reality:
${getKnowledge('bullAdvocate')}

Write in sharp, confident prose. No hedging. Make the reader believe.`;

  const user = `Make the strongest possible bull case for this strategy.

DOCUMENT SUMMARY:
Core Claim: ${logicMap.coreClaim}
Key Assumptions: ${logicMap.keyAssumptions.join('; ')}

FULL DOCUMENT:
${docText.substring(0, 4000)}

Write 4-5 sharp paragraphs covering:
1. Why the core thesis is correct
2. The market dynamics that favor this
3. The underappreciated strengths
4. Why the timing is right
5. How this could exceed expectations

Be specific. Reference details from the document. Make a genuine case.`;

  return await callAgent(system, user, 1400);
}

// AGENT 3: Bear Advocate
async function runBearAdvocate(docText, logicMap, analysisType) {
  const system = `You are a ruthless, precise strategic skeptic. Your job is to find every way a strategy fails — the hidden risks, broken assumptions, execution traps, and market dynamics that destroy it. You are not a pessimist; you are a realist who has seen many strategies collapse.

Use the following failure pattern library and benchmarks to ground your analysis:
${getKnowledge('bearAdvocate')}

Write in incisive, direct prose. Be specific. Name the failure modes with precision.`;

  const user = `Identify the ways this strategy fails.

DOCUMENT SUMMARY:
Core Claim: ${logicMap.coreClaim}
Critical Dependencies: ${logicMap.criticalDependencies.join('; ')}
Structural Weaknesses: ${logicMap.structuralWeaknesses.join('; ')}

FULL DOCUMENT:
${docText.substring(0, 4000)}

Write 4-5 sharp paragraphs covering:
1. The primary failure mode (the most likely way this breaks)
2. Hidden assumptions that are actually fragile
3. Competitive or market dynamics working against this
4. Execution risks nobody is discussing
5. The scenario where this fails badly

Be specific. Reference details from the document. Do not be generic.`;

  return await callAgent(system, user, 1400);
}

// AGENT 4: Blind Spot Detector
async function runBlindSpotDetector(docText, logicMap) {
  const system = `You are an organizational psychologist and strategic advisor who specializes in identifying collective blind spots — the assumptions organizations protect from scrutiny because challenging them would be too uncomfortable. You understand cognitive biases, groupthink, and the sociology of decision-making.

Use the following frameworks to identify the deepest blind spot:
${getKnowledge('blindSpotDetector')}

Be specific and courageous. Name the thing they cannot see.`;

  const user = `Identify the central blind spot in this strategy — the assumption being socially protected from scrutiny.

DOCUMENT:
${docText.substring(0, 5000)}

IMPLICIT ASSUMPTIONS DETECTED:
${logicMap.implicitAssumptions.join('\n')}

Your response should have three parts:
1. THE BLIND SPOT (1 sentence): State clearly what this organization cannot see
2. WHY THEY CANNOT SEE IT (2-3 sentences): The organizational or psychological reason this assumption is protected
3. WHAT WOULD CHANGE (2-3 sentences): How the strategy would change if this assumption were challenged

Be direct. Be specific. This is the most important part of the analysis.`;

  return await callAgent(system, user, 900);
}

// AGENT 5: Question Generator
async function runQuestionGenerator(docText, logicMap, bullCase, bearCase, blindSpot) {
  const system = `You are a Socratic strategist. You generate the questions that nobody in the room is asking — the questions that cut through consensus, challenge core assumptions, and could fundamentally change the direction of a strategy.

Your questions are specific, uncomfortable, and important. They are not rhetorical. They demand real answers.

Use the following framework to ensure questions are maximally penetrating:
${getKnowledge('questionGenerator')}

Respond ONLY with valid JSON.`;

  const user = `Generate 5 unasked questions for this strategy.

DOCUMENT:
${docText.substring(0, 3000)}

BLIND SPOT:
${blindSpot.substring(0, 400)}

BEAR CASE RISKS:
${bearCase.substring(0, 400)}

Return JSON with exactly this structure:
{
  "questions": [
    {
      "question": "The full question",
      "why_unasked": "Why this question is being avoided",
      "why_it_matters": "What changes if the answer is uncomfortable"
    }
  ]
}

Generate exactly 5 questions. Make them sharp, specific to THIS document, and genuinely unasked.`;

  const raw = await callAgent(system, user, 1000);
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { questions: [] };
  }
}

// AGENT 6: Synthesis & Executive Summary
async function runSynthesizer(clientName, analysisType, logicMap, bullCase, bearCase, blindSpot, questions) {
  const system = `You are a senior strategic advisor writing an executive briefing for a client. Your writing is clear, authoritative, and concise. You synthesize complex analysis into actionable insights.`;

  const user = `Write an executive summary for the adversarial review of ${clientName}'s ${ANALYSIS_TYPES[analysisType] || 'strategy'}.

CORE CLAIM: ${logicMap.coreClaim}
BLIND SPOT: ${blindSpot.substring(0, 300)}
KEY BEAR RISK: ${bearCase.substring(0, 200)}

Write 2-3 paragraphs:
1. What this strategy is trying to accomplish and why it matters
2. The single most important finding from this review
3. The recommended next action based on this analysis

Be authoritative. Be specific. Sound like the smartest person in the room.`;

  return await callAgent(system, user, 500);
}

// MAIN ORCHESTRATOR
async function analyzeDocument(docText, analysisType, clientName, progressCallback) {

  progressCallback('Mapping logical structure...', 10);
  const logicMap = await runLogicMapper(docText, analysisType);

  progressCallback('Running bull case analysis...', 25);
  const bullCase = await runBullAdvocate(docText, logicMap, analysisType);

  progressCallback('Running bear case analysis...', 42);
  const bearCase = await runBearAdvocate(docText, logicMap, analysisType);

  progressCallback('Detecting blind spots...', 60);
  const blindSpot = await runBlindSpotDetector(docText, logicMap);

  progressCallback('Generating unasked questions...', 75);
  const questionsData = await runQuestionGenerator(docText, logicMap, bullCase, bearCase, blindSpot);

  progressCallback('Synthesizing executive briefing...', 88);
  const executiveSummary = await runSynthesizer(clientName, analysisType, logicMap, bullCase, bearCase, blindSpot, questionsData);

  progressCallback('Finalizing report...', 96);

  return {
    meta: {
      clientName,
      analysisType: ANALYSIS_TYPES[analysisType] || analysisType,
      generatedAt: new Date().toISOString(),
      model: MODEL,
    },
    executiveSummary,
    logicMap,
    bullCase,
    bearCase,
    blindSpot,
    questions: questionsData.questions || [],
  };
}

module.exports = { analyzeDocument, getTokenUsage, resetTokenUsage };
