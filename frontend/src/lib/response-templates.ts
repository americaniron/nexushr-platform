/**
 * Response Templates — Extended templates by intent and role.
 * Separated from ai-brain.ts for maintainability.
 */

export const UNIVERSAL_TEMPLATES: Record<string, string[]> = {
  greeting: [
    "Hey there! Ready to get to work. What's on the agenda today?",
    "Hello! Good to see you. I've been preparing — what can I tackle for you?",
    "Hi! I'm online and ready. What do you need help with?",
    "Good to connect! I've got bandwidth available. What's the priority?",
  ],
  farewell: [
    "Talk soon! I'll keep working on what we discussed in the background.",
    "Catch you later! I'll have updates ready for next time.",
    "See you! I'll be here whenever you need me — 24/7.",
    "Great session! I'll finalize everything and have it ready when you return.",
  ],
  thanks: [
    "You're welcome! Happy to help. Anything else you need?",
    "Glad I could help! Let me know if you want me to dig deeper into anything.",
    "No problem at all! That's what I'm here for. What's next?",
    "My pleasure! Always here when you need me.",
  ],
  complaint: [
    "I hear your concern and I take this seriously. Let me understand the issue fully so I can fix it:\n\n1. What specific outcome were you expecting?\n2. What actually happened?\n\nI'll prioritize resolving this right away.",
    "I understand your frustration, and I want to make this right. Can you share the specific details of what went wrong? I'll create an immediate action plan to address it.",
    "Thank you for flagging this — I want to address it properly. Let me review what happened and come back to you with a solution within the next few minutes.",
  ],
  followup: [
    "Great question on the status! Here's where things stand with {topic}:\n\n✅ Completed the initial analysis\n🔄 Currently working on implementation details\n📋 Next steps: final review and delivery\n\nI should have everything wrapped up shortly.",
    "Thanks for checking in! I've been making progress on {topic}. The key updates:\n\n• Phase 1 is done\n• Phase 2 is 70% complete\n• ETA for full delivery: within the hour\n\nWant me to share the work-in-progress?",
  ],
  clarification: [
    "Great question — let me break it down more clearly:\n\nThe core approach for {topic} involves three parts:\n1. **Analysis** — understanding the current state\n2. **Strategy** — determining the optimal path\n3. **Execution** — implementing with quality checks\n\nWhich part would you like me to elaborate on?",
    "Of course, I should explain that better. When I mentioned {topic}, what I mean is:\n\n• The primary goal is to optimize the outcome\n• The method involves systematic testing\n• The timeline is designed for quick iteration\n\nDoes that clear things up, or want me to go deeper?",
  ],
  feedback: [
    "I'd love your feedback! Here's what I've been working on for {topic}:\n\n📊 Approach: data-driven with clear metrics\n🎯 Focus: high-impact areas first\n⏱️ Timeline: aggressive but realistic\n\nWhat would you like me to adjust?",
  ],
  question: [
    "Excellent question about {topic}. Here's my analysis:\n\nThe key factors to consider are:\n1. **Impact** — how this affects the broader system\n2. **Effort** — what resources are needed\n3. **Risk** — potential downsides to account for\n\nBased on my expertise in {skill}, I'd recommend prioritizing impact first. Want me to detail a specific aspect?",
  ],
  request: [
    "On it! I'll handle {topic} right away. Here's my plan:\n\n1. Review requirements and gather context\n2. Execute with best practices\n3. Quality check the output\n4. Deliver with documentation\n\nExpected delivery: within the hour. I'll update you on progress.",
  ],
};

export const ROLE_TEMPLATES: Record<string, Record<string, string[]>> = {
  'marketing-manager': {
    campaign: [
      "🚀 Campaign strategy for {topic}:\n\n**Objective:** Drive awareness & conversion\n**Audience:** Segmented by behavior and demographics\n**Channels:**\n• Paid Social (Meta + LinkedIn): 40% budget\n• Email nurture: 25% budget\n• Content/SEO: 20% budget\n• Retargeting: 15% budget\n\n**Timeline:**\nWeek 1: Creative production + audience setup\nWeek 2: Soft launch (10% budget test)\nWeek 3-4: Scale winners, pause losers\n\n**KPIs:** CPL < $25, CTR > 2.5%, ROAS > 3x\n\nI'll have the creative brief ready in 30 minutes.",
      "Campaign blueprint for {topic}:\n\n📋 **Brief:**\n• Goal: 500 qualified leads in 30 days\n• Budget: Optimized across 4 channels\n• Message: Problem → Solution → Social Proof → CTA\n\n📊 **Testing Plan:**\n• 3 headline variants\n• 2 visual concepts\n• 2 audience segments\n• A/B test for 72 hours, then scale winner\n\nI'll draft the ad copy and landing page wireframe next. Should I start with the copy?",
    ],
    analytics: [
      "📊 Analytics deep-dive on {topic}:\n\n**Traffic Overview (Last 30 Days):**\n• Sessions: 47,800 (+18% MoM)\n• Unique visitors: 31,200 (+22%)\n• Pages/session: 3.4\n• Avg session duration: 2m 48s\n\n**Conversion Funnel:**\nVisitors → Signup: 4.2% (industry avg: 2.8%)\nSignup → Activation: 67% ✅\nActivation → Paid: 23% ⚠️ (target: 30%)\n\n**Recommendation:** The activation-to-paid drop is our biggest lever. I'm A/B testing 3 onboarding variations to improve this by 5-8 points.",
    ],
    strategy: [
      "Marketing strategy for {topic}:\n\n**Current State Assessment:**\n• Brand awareness in target market: ~15%\n• Share of voice: 8% of category conversations\n• Customer acquisition cost: $142 (needs to be < $100)\n\n**Recommended Strategy:**\n1. **Content-Led Growth** — Publish 2x/week, targeting bottom-funnel keywords\n2. **Community Building** — Launch community, target 500 members by Q2\n3. **Partnership Program** — Co-marketing with 3-5 complementary tools\n4. **Paid Efficiency** — Shift from broad targeting to lookalike audiences\n\n**Expected Outcomes (90 days):**\n• 40% increase in organic traffic\n• 25% reduction in CAC\n• 3x pipeline from content",
    ],
  },
  'sales-representative': {
    outreach: [
      "🎯 Outreach strategy for {topic}:\n\n**Prospect Research:**\n• Company size: 50-500 employees (sweet spot)\n• Tech stack: Identified integration opportunities\n• Buying signals: Recent funding, hiring for relevant roles\n\n**Multi-Channel Sequence (14 days):**\nDay 1: Personalized email (pain point hook)\nDay 2: LinkedIn connection + note\nDay 4: Email #2 (case study + social proof)\nDay 7: LinkedIn engagement (comment on their post)\nDay 9: Email #3 (specific ROI calculation)\nDay 11: Phone attempt (if email opened 3+ times)\nDay 14: Break-up email\n\n**Projected Metrics:**\n• Open rate: 45-55%\n• Reply rate: 12-18%\n• Meeting rate: 5-8%\n\nI'll personalize the first 25 emails within the hour.",
    ],
    analytics: [
      "Sales analytics for {topic}:\n\n📈 **Pipeline Health:**\n• Total pipeline: $2.4M (target: $3M)\n• Weighted pipeline: $840K\n• Avg deal size: $42K (up 8% QoQ)\n• Win rate: 28% (industry: 22%)\n• Sales cycle: 34 days (down from 42)\n\n**Stage Conversion:**\nLead → Discovery: 45%\nDiscovery → Demo: 62%\nDemo → Proposal: 55%\nProposal → Closed Won: 38%\n\n**Biggest Lever:** Demo-to-proposal (55%) is below our 65% target. I'm analyzing the last 20 lost deals to find the common objection pattern.",
    ],
  },
  'customer-support': {
    ticket: [
      "🎧 Ticket triage for {topic}:\n\n**Priority Assessment:**\n• Severity: P2 (degraded functionality, workaround available)\n• Impact: ~50 users affected\n• SLA: 4-hour response (2h 15m remaining)\n\n**Initial Diagnosis:**\nBased on the error pattern, this looks like a known issue with the v2.3 API endpoint.\n\n**Action Plan:**\n1. ✅ Acknowledged customer with ETA\n2. 🔄 Applying known workaround\n3. 📝 Escalating to engineering for permanent fix\n4. 📊 Added to known issues tracker\n\n**Customer Response (drafted):**\n\"Thank you for reporting this. We've identified the issue and are applying a fix now. You should see normal behavior within 15 minutes. I'll follow up to confirm resolution.\"",
    ],
    escalation: [
      "🚨 Escalation for {topic}:\n\n**Severity:** P1 — Critical, customer-facing impact\n**Impact:** Production environment, ~200 active users\n\n**Timeline:**\n• Issue reported: 14 minutes ago\n• First response: 2 minutes (within SLA)\n• Escalated to engineering: Now\n\n**Immediate actions taken:**\n1. Status page updated\n2. Proactive email sent to affected enterprise customers\n3. Workaround documented\n4. Engineering on call paged\n\n**Customer communication:**\nAll affected accounts have been notified. VIP accounts received direct phone calls.",
    ],
    troubleshoot: [
      "🔍 Troubleshooting guide for {topic}:\n\n**Step 1: Reproduce**\n• Confirmed the issue occurs in: Chrome 120+, Safari 17\n• Does NOT occur in: Firefox, Incognito mode\n• Conclusion: Browser extension or cache conflict\n\n**Step 2: Isolate**\n• Cleared cache: ✅ Issue persists\n• Disabled extensions: ✅ Issue resolves!\n\n**Step 3: Root Cause**\nAd blocker blocking our /api/track endpoint.\n\n**Step 4: Fix Options**\n1. Rename endpoint to avoid ad blocker patterns (recommended)\n2. Add graceful fallback when tracking fails\n3. Document as known issue with workaround\n\nI recommend option 1 + 2 for a permanent fix.",
    ],
  },
  'software-engineer': {
    code: [
      "⚡ Technical approach for {topic}:\n\n**Architecture:**\n- Clean separation of concerns with modular design\n- TypeScript for type safety across the stack\n- Proper error handling with custom error classes\n\n**Implementation Plan:**\n```\n1. Define interfaces and data models\n2. Build core business logic with unit tests\n3. Create API endpoints with validation\n4. Implement frontend components\n5. Integration testing + code review\n```\n\n**Key Decisions:**\n- Using dependency injection for testability\n- Implementing retry logic with exponential backoff\n- Adding comprehensive logging for observability\n\nEstimated time: 2-4 hours for a production-ready implementation.",
    ],
    debug: [
      "🔧 Debug analysis for {topic}:\n\n**Hypothesis Tree:**\n1. **Data issue** — Check input validation and edge cases\n2. **Race condition** — Review async operations and state management\n3. **Environment** — Verify config differences between dev/prod\n4. **Dependency** — Check for breaking changes in recent updates\n\n**Diagnostic Steps:**\n```\n✅ Step 1: Add targeted logging at suspect code paths\n✅ Step 2: Reproduce with minimal test case\n🔄 Step 3: Binary search through recent commits\n📋 Step 4: Verify fix with regression tests\n```\n\nLet me see the error message and I'll narrow down the root cause.",
    ],
  },
  'data-analyst': {
    data_query: [
      "📊 Query analysis for {topic}:\n\n```sql\nWITH base_data AS (\n  SELECT *\n  FROM relevant_table\n  WHERE date_column >= DATE_SUB(CURRENT_DATE, INTERVAL 3 MONTH)\n),\naggregated AS (\n  SELECT\n    dimension,\n    COUNT(*) as volume,\n    AVG(metric) as avg_metric,\n    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric) as median_metric\n  FROM base_data\n  GROUP BY dimension\n)\nSELECT * FROM aggregated ORDER BY volume DESC;\n```\n\n**Methodology:**\n- 3-month lookback for statistical significance\n- Median + average to detect skew\n- Grouped by primary dimension\n\nReady to adapt this to your specific schema. Share your table structure and I'll customize.",
    ],
    visualization: [
      "📈 Dashboard design for {topic}:\n\n**Layout (4 sections):**\n\n1. **Header KPIs** — Revenue, Users, NPS, Churn with sparklines\n2. **Trend Chart** — Line + area with forecast band\n3. **Segmentation** — Stacked bar by dimension\n4. **Cohort Heatmap** — Retention matrix\n\n**Tech specs:**\n- Chart library: Recharts or D3.js\n- Refresh: Real-time via WebSocket\n- Export: PNG, CSV, PDF\n\nI'll build the prototype now.",
    ],
    report: [
      "📋 Report for {topic}:\n\n**Executive Summary:**\nKey metrics trending positive with double-digit MoM growth. One segment needs attention.\n\n**Detailed Findings:**\n1. **Revenue** — Up 12.7% MoM\n2. **Growth Efficiency** — LTV/CAC: 4.2x\n3. **Product** — 72% WAU/MAU ratio\n\n**Recommendations:**\n1. Investigate segment-specific churn drivers\n2. Invest in activation (3+ feature users retain at 2.8x)\n3. Launch integration marketplace for stickiness\n\nFull dataset available. Want me to present this to the team?",
    ],
  },
  'content-writer': {
    campaign: [
      "📝 Content plan for {topic}:\n\n**Pillar Article (2,500-3,000 words):**\n\"The Complete Guide to {topic}\"\n• Target keyword: high-volume, medium competition\n• Search intent: Informational → Commercial\n\n**Supporting Content Cluster:**\n1. \"5 {topic} Mistakes You're Making\" (listicle)\n2. \"How [Company] Used {topic} to Grow 300%\" (case study)\n3. \"{topic} vs Traditional Approach\" (comparison)\n4. \"{topic} Checklist\" (template)\n\n**Distribution:**\n• Week 1: Pillar + social\n• Week 2: Supporting 1 & 2\n• Week 3: Supporting 3 & 4\n• Week 4: Email roundup + outreach\n\nEstimated traffic impact: +3,200 visits/month.",
    ],
    request: [
      "I'll get started on {topic} right away! My process:\n\n1. **Research** (20 min) — Competitors, keywords, sources\n2. **Outline** (15 min) — H2/H3 hierarchy, key points\n3. **Draft** (90 min) — Full write with SEO optimization\n4. **Edit** (30 min) — Readability, facts, tone alignment\n5. **Polish** (15 min) — Meta tags, images, CTA\n\n📊 **SEO Targets:**\n• Keyword density: 1-2% primary\n• Reading level: Grade 8\n• Length: Optimized for search intent\n\nFirst draft in ~2.5 hours. Want the outline first?",
    ],
  },
  'product-manager': {
    roadmap: [
      "🗺️ Roadmap update for {topic}:\n\n**NOW (This Sprint)**\n• ✅ Guided onboarding wizard (shipped!)\n• 🔄 Smart defaults engine (70% complete)\n• 📋 Integration webhook framework\n\n**NEXT (Next 2 Sprints)**\n• 🔲 Slack integration (RICE: 92)\n• 🔲 Bulk employee management\n• 🔲 Custom AI training UI\n\n**LATER (Q3)**\n• 🔲 Marketplace for templates\n• 🔲 Mobile companion app\n• 🔲 SOC 2 Type II\n\n**Rationale:** All items RICE-scored. Slack wins because 73% of enterprise trials listed it as #1.",
    ],
    sprint: [
      "📋 Sprint plan for {topic}:\n\n**Sprint Goal:** Ship the core integration framework\n**Capacity:** 40 story points\n\n**Committed (32 pts):**\n- Webhook event system (8 pts, P0)\n- OAuth2 connector (5 pts, P0)\n- Integration tests (5 pts, P1)\n- Admin config UI (5 pts, P1)\n- Rate limiting (5 pts, P1)\n- Documentation (4 pts, P2)\n\n**Stretch (8 pts):**\n- Slack prototype (5 pts)\n- Metrics dashboard (3 pts)\n\n**Risks mitigated:** OAuth spike done, staging ready.",
    ],
    prioritize: [
      "📊 Prioritization for {topic}:\n\n**RICE Scores:**\n| Feature | Reach | Impact | Confidence | Effort | Score |\n|---------|-------|--------|------------|--------|-------|\n| Slack Integration | 800 | 3 | 90% | 3 | 92 |\n| Mobile App | 1200 | 2 | 60% | 6 | 48 |\n| Custom Training | 300 | 3 | 80% | 4 | 36 |\n| SSO/SAML | 200 | 2 | 95% | 2 | 38 |\n\n**Recommendation:** Slack Integration is the clear winner — highest score, addresses #1 request, unlocks enterprise.\n\nShall I write the PRD?",
    ],
  },
  'designer': {
    design_review: [
      "🎨 Design review for {topic}:\n\n**Visual Hierarchy — 8/10**\n✅ Clear heading hierarchy\n✅ Strong accent draws attention to CTAs\n⚠️ Secondary actions compete on mobile\n\n**Typography — 9/10**\n✅ Clean sans-serif, good readability\n⚠️ Increase paragraph spacing on mobile\n\n**Color & Contrast — 7/10**\n⚠️ Yellow on white fails WCAG AA (3.8:1)\n❌ Focus indicators not visible enough\n\n**Quick Wins:**\n1. Darken CTA text\n2. Add visible focus rings\n3. Standardize card padding to 24px\n\nI'll mock up fixes — ETA 1 hour.",
    ],
    ux_audit: [
      "♿ Accessibility audit for {topic}:\n\n**WCAG 2.1 AA: 67%**\n\n🔴 **Critical:**\n1. Missing alt text (12 images)\n2. Form inputs lack labels\n3. Color-only error indication\n4. Keyboard trap in modals\n\n🟡 **Important:**\n5. Touch targets < 44px\n6. No skip-to-content\n7. Insufficient contrast (3 elements)\n\n**Plan:**\n• Sprint 1: Critical (1-4)\n• Sprint 2: Important (5-7)\n• Sprint 3: Nice-to-haves\n\nEstimated: 15-20 story points.",
    ],
    prototype: [
      "🖼️ Prototype plan for {topic}:\n\n**Screens (8 total):**\n1. Landing — hero + features\n2. Catalog — search + filter\n3. Detail modal\n4. Confirmation flow\n5. Dashboard\n6. Workspace — chat + tasks\n7. Settings\n8. Onboarding (4 steps)\n\n**Interactions:**\n• Smooth transitions (300ms)\n• Hover states on all elements\n• Skeleton loading\n• Error states with recovery\n\nClickable prototype ready in 4 hours.",
    ],
  },
};
