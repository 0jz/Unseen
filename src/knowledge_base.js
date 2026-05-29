/* UNSEEN — Agent Knowledge Base
 * Structured knowledge injected into each agent's system prompt.
 * Each section is tuned to the specific cognitive task of that agent.
 */

const KB = {

  // ── LOGIC MAPPER ──────────────────────────────────────────────────────────
  logicMapper: `
LOGICAL FALLACY REFERENCE (flag these when present):
- Survivorship bias: drawing conclusions only from visible successes, ignoring failures
- Availability heuristic: overweighting recent or memorable data over base rates
- Planning fallacy: systematically underestimating time, cost, and risk of future actions
- Narrative fallacy: constructing post-hoc stories that make random events seem inevitable
- Correlation/causation: treating correlated variables as causally linked without mechanism
- Appeal to authority: substituting credentials for argument
- Sunk cost fallacy: justifying continued investment based on past spending, not future value
- Anchoring: allowing an initial number or framing to distort subsequent judgment
- False dichotomy: presenting two options when more exist
- Overfitting: finding patterns in noise, strategy built on too-small sample

HIDDEN ASSUMPTION PATTERNS (commonly implicit in strategy documents):
- "Our team can execute" — rarely examined, almost always overconfident
- "The market will respond rationally" — buyers are irrational, slow, conservative
- "We can out-sell incumbents with a better product" — distribution usually beats product
- "We will reach product-market fit within X months" — PMF timeline is unpredictable
- "Competitors will not react" — incumbents respond when threatened
- "Unit economics improve at scale" — sometimes they worsen (support costs, CAC, churn)
- "Regulatory environment stays stable" — especially fragile in fintech, health, AI
- "The founding team stays intact" — cofounder breakups kill ~20% of early startups

STRUCTURAL WEAKNESS PATTERNS:
- Strategy depends on a single customer, channel, or partnership
- Revenue model assumes behavior change in target audience
- Technical moat is claimed but not demonstrated
- Growth projections use top-down market share logic, not bottom-up unit economics
- Success metric is vanity (downloads, signups) not leading indicator (activation, retention)
- Burn rate assumes best-case fundraising timeline
`,

  // ── BULL ADVOCATE ─────────────────────────────────────────────────────────
  bullAdvocate: `
MARKET BENCHMARKS FOR BULL CASE CONSTRUCTION:
- B2B SaaS: Best-in-class NRR >120%, median Series A ARR $1-3M, median growth 2-3x YoY
- Marketplace: Top performers reach 70%+ take rate on value; Airbnb, Uber both had 5+ years of losses before unit economics worked
- Consumer: DAU/MAU >50% is excellent; WhatsApp had 450M users before monetization
- Deep tech / AI: IP moats can sustain 5-7 year competitive windows if execution follows
- Enterprise SaaS: $100K+ ACV customers have 90%+ retention if implementation goes well
- Fintech: Best performers (Stripe, Brex) grow by embedding in existing workflows, not replacing them

TIMING TAILWINDS TO SURFACE:
- Regulatory shift opening new markets (open banking, AI Act creating compliance demand)
- Infrastructure cost collapse (GPU prices -60% since 2022, enabling new AI product economics)
- Generational behavior shift (Gen Z defaults to mobile-first, subscription-tolerant)
- Enterprise budget unlocked (IT spend on AI/automation growing 35%+ YoY in 2024-25)
- Remote work infrastructure (permanent 14% remote rate creates ongoing SaaS TAM)

UNDERAPPRECIATED STRENGTH PATTERNS:
- Founder-market fit: domain expertise that takes competitors years to replicate
- Early customer relationships that become structural distribution advantages
- Data network effects: product improves as more customers use it
- Geographic expansion optionality: domestic playbook can port internationally
- Platform potential: point solution that could become a suite

BULL CASE ANCHORS (use these to frame optimistic scenarios):
- "The comparable at scale is X, which is a $Y billion company"
- "If they capture Z% of a $W billion market, revenue would be..."
- "The early retention numbers (if present) suggest a product that users don't leave"
`,

  // ── BEAR ADVOCATE ─────────────────────────────────────────────────────────
  bearAdvocate: `
STARTUP FAILURE PATTERN LIBRARY:
Top reasons funded startups fail (CB Insights, 2024 data):
1. No market need (35%) — the problem exists but urgency is low
2. Ran out of cash (38%) — burn without PMF, fundraise fails
3. Wrong team (14%) — execution gap, cofounder conflict
4. Competition (19%) — incumbent reacts or better-funded player enters
5. Pricing/cost issues (15%) — unit economics never work at scale
6. Poor product (17%) — build ≠ what market needed
7. Pivot gone wrong (10%) — burned runway chasing wrong market

SECTOR-SPECIFIC RISK PATTERNS:

AI/ML products:
- Model commoditization risk: OpenAI/Anthropic/Google release capability that eliminates moat
- Hallucination liability: in regulated industries, errors carry legal consequences
- Data dependency: product quality depends on proprietary data that may not scale
- Latency/cost: LLM inference still expensive; unit economics can't work at low ACV

B2B SaaS:
- Sales cycle length consistently underestimated (enterprise: 6-18 months, not 3)
- Procurement gatekeeping: IT/Legal/Security review adds 3-6 months to deals
- Integration complexity kills churn: customers who don't integrate fully churn at 2x rate
- Land-and-expand requires strong CS; most early startups underinvest here

Marketplace:
- Chicken-and-egg: which side do you build first? Wrong choice kills the company
- Leakage: users transact off-platform once they've connected (Airbnb's early problem)
- Aggregation theory: the platform that controls discovery wins; being upstream is dangerous

Consumer:
- CAC payback >12 months is fatal without patient capital
- Virality is not a strategy; it is an outcome that can't be planned
- App store dependency creates existential platform risk

Fintech:
- Banking-as-a-service provider concentration risk (Synapse collapse 2024)
- Regulatory exam timelines: bank charter takes 3-5 years; most fintechs underestimate
- Fraud rates at scale often 3-5x early-stage estimates

EXECUTION RISK CHECKLIST:
- Does strategy require simultaneous execution on 3+ dimensions? (Usually fatal)
- Is the sales motion unproven at this company with this team?
- Does the product require behavior change? (Adds 18-36 months to adoption curve)
- Are there key-person dependencies with no succession plan?
- Is the competitive moat a feature, not a system? (Features get copied in 6 months)

YC BEAR BENCHMARKS:
- 90% of YC-funded companies never reach $10M ARR
- Median time from seed to Series A: 18-24 months (not 12 as often modeled)
- Companies that pivot more than twice rarely succeed
- Post-2022 funding environment: Series A bar is $1-2M ARR minimum, not growth alone
`,

  // ── BLIND SPOT DETECTOR ───────────────────────────────────────────────────
  blindSpotDetector: `
ORGANIZATIONAL PSYCHOLOGY: WHY BLIND SPOTS PERSIST

Cognitive biases that protect assumptions from scrutiny:
- Groupthink: dissent is suppressed when team cohesion is valued over accuracy
- Motivated reasoning: we find evidence for what we want to believe
- Confirmation bias: we remember hits, forget misses; we seek confirming data
- Overconfidence effect: founders consistently overestimate their own capabilities
- Illusion of control: leaders believe they have more agency over outcomes than they do
- Status quo bias: the current plan is defended because switching has social costs
- In-group favoritism: we underestimate competitors; overestimate our own team

ORGANIZATIONAL DYNAMICS THAT CREATE BLIND SPOTS:
- Founder authority: the highest-paid person's opinion (HiPPO) overrides data
- Premature scaling narrative: "we just need to hire faster" before PMF
- Investor pressure distortion: optimizing for fundraise metrics vs. real metrics
- Advisory board theater: advisors who can't say no, so every idea sounds good
- Customer selection bias: talking to enthusiastic early adopters, not the median buyer
- Silence of skeptics: internal critics self-censor to preserve relationships

THE QUESTIONS THAT EXPOSE BLIND SPOTS:
1. "Who in the organization would be fired for saying this strategy is wrong?"
2. "What would have to be true for the bear case to be the base case?"
3. "Which assumption, if wrong, makes everything else wrong?"
4. "Who is not in the room when this decision gets made?"
5. "What are we optimizing for that we are not measuring?"
6. "What does the organization systematically not talk about?"
7. "If a competitor launched this exact product today, what would happen?"
8. "What would we do differently if we had half the runway?"
9. "What do our best customers complain about that we ignore?"
10. "What was the last piece of bad news we received that we didn't share upward?"

COMMON ORGANIZATIONAL BLIND SPOTS BY STAGE:
Pre-seed: "We have a product" (they have a prototype; market validation is absent)
Seed: "We have traction" (they have activity; retention and unit economics are absent)
Series A: "We have product-market fit" (they have revenue; sustainable CAC payback is absent)
Series B+: "We can scale this" (they can grow top line; they cannot yet manage complexity)
`,

  // ── QUESTION GENERATOR ────────────────────────────────────────────────────
  questionGenerator: `
SOCRATIC QUESTION FRAMEWORK FOR STRATEGY CHALLENGES:

Question categories and their strategic purpose:
1. ASSUMPTION QUESTIONS — expose what is taken for granted
   Pattern: "What would have to be true for [X claim] to hold?"

2. ALTERNATIVE QUESTIONS — force consideration of paths not taken
   Pattern: "Why [this approach] and not [obvious alternative]?"

3. IMPLICATION QUESTIONS — trace consequences of current choices
   Pattern: "If [X], then what happens to [Y]?"

4. EVIDENCE QUESTIONS — demand proof for assertions
   Pattern: "What data would change your mind about [X]?"

5. PERSPECTIVE QUESTIONS — force view from outside
   Pattern: "How would [competitor/customer/regulator] describe [X]?"

6. TIMING QUESTIONS — challenge when assumptions about timing
   Pattern: "Why now? What changes if this is 2 years early?"

7. REVERSAL QUESTIONS — stress test by inverting the thesis
   Pattern: "What would the anti-portfolio version of this look like?"

QUESTIONS THAT CONSISTENTLY SURFACE HIDDEN RISK:
- "What is the second-order effect of your primary growth strategy?"
- "What does your best customer think you are, that differs from what you think you are?"
- "Which of your competitors, if funded tomorrow at $50M, would threaten you most?"
- "If you lost your top three enterprise accounts, what would the real reason be?"
- "What is the most expensive mistake this strategy could make?"
- "Who bears the downside risk if this fails — founders, investors, or customers?"
- "What does the unit economics look like at 10x scale? At 100x?"
- "What do you know now that you wish you'd known 12 months ago?"
- "What is the version of this strategy that is embarrassingly obvious in retrospect?"
- "Whose job gets harder because of what you're building?"

YC-SPECIFIC QUESTIONS INVESTORS ACTUALLY ASK:
- "How do you know people want this?" (Not "think" — know)
- "Who is your first paying customer and why did they pay?"
- "What is your unfair advantage that a well-funded competitor cannot buy?"
- "Why you? Why now? Why this market?"
- "What are you doing this week to grow?" (Operational, not strategic)
- "What would make you give up on this?" (Tests conviction vs. stubbornness)
`,

};

/**
 * Returns the knowledge block for a given agent type.
 * @param {'logicMapper'|'bullAdvocate'|'bearAdvocate'|'blindSpotDetector'|'questionGenerator'} agent
 */
function getKnowledge(agent) {
  return KB[agent] || '';
}

module.exports = { getKnowledge };
