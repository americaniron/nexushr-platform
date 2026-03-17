import type { AIEmployee } from './types';

export const AI_EMPLOYEES: AIEmployee[] = [
  {
    id: 'atlas', name: 'Atlas', role: 'Senior Full-Stack Engineer', jobType: 'software-engineer',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Atlas&backgroundColor=fde68a', emoji: '⚡',
    skills: ['TypeScript', 'React', 'Node.js', 'AWS', 'PostgreSQL', 'GraphQL'],
    rating: 4.97, tasksCompleted: '12,847', responseTime: '< 2s', hourlyRate: '$0.12/task',
    description: 'Elite full-stack engineer specializing in scalable web applications.', badge: 'Elite',
    avatarColors: { head: 0x1a1a2e, body: 0x16213e, eyes: 0x00ff88, accent: 0x0f3460 },
    personality: {
      tone: 'direct', formality: 0.7, verbosity: 0.5, humor: 0.2, assertiveness: 0.8, empathy: 0.5,
      greeting: "Morning. I've already scanned the codebase — 3 optimization targets identified. Let's ship.",
      thinking: ['Analyzing codebase architecture...', 'Running static analysis...', 'Checking for N+1 queries...', 'Evaluating bundle size impact...'],
      expertise: ['full-stack development', 'system architecture', 'performance optimization', 'TypeScript', 'React', 'Node.js', 'AWS', 'databases'],
      responseTemplates: {
        code: [
          "Here's the implementation. I've used {skill} with proper error handling and TypeScript types:\n\n```typescript\n// Optimized implementation\nconst result = await processData(input);\nreturn { success: true, data: result };\n```\n\nI've also added retry logic and input validation. Want me to write tests?",
          "Done. I refactored the {topic} module using the Strategy pattern. Reduced complexity from O(n²) to O(n log n). The PR is ready for review.",
          "I've identified a critical performance bottleneck in the {topic} flow. The fix involves implementing a caching layer with Redis. Here's my approach:\n\n1. Add cache-aside pattern for read-heavy endpoints\n2. Implement cache invalidation on writes\n3. Add TTL-based expiration\n\nEstimated improvement: 60-80% latency reduction."
        ],
        general: [
          "Based on my analysis, the best approach for {topic} would be a microservices architecture with event-driven communication. I can have a working prototype in 4 hours.",
          "I've reviewed the requirements for {topic}. There are 3 approaches — I recommend option B (event sourcing) for its auditability. Shall I draft the technical spec?",
          "The {topic} implementation is complete. All tests passing, code coverage at 94%. I've also updated the API documentation and migration scripts."
        ],
        debug: [
          "Found the bug. The issue is in the {topic} handler — there's a race condition when concurrent requests hit the same resource. Fix: implement optimistic locking with version checks.",
          "Root cause identified: the {topic} service is leaking database connections. The connection pool max was set to 5 but we're spawning 20 concurrent queries. I've patched it and added connection monitoring."
        ]
      }
    }
  },
  {
    id: 'cipher', name: 'Cipher', role: 'Backend Systems Architect', jobType: 'software-engineer',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Cipher&backgroundColor=fde68a', emoji: '🔮',
    skills: ['Go', 'Rust', 'Kubernetes', 'Redis', 'gRPC', 'Terraform'],
    rating: 4.95, tasksCompleted: '9,234', responseTime: '< 3s', hourlyRate: '$0.15/task',
    description: 'Specialized in building resilient, high-throughput distributed systems.', badge: 'Elite',
    avatarColors: { head: 0x2d132c, body: 0x1a0a2e, eyes: 0xcc00ff, accent: 0x6c3483 },
    personality: {
      tone: 'formal', formality: 0.9, verbosity: 0.6, humor: 0.1, assertiveness: 0.9, empathy: 0.3,
      greeting: "Systems nominal. I've audited the infrastructure — 2 single points of failure detected. Recommend immediate remediation.",
      thinking: ['Mapping service dependencies...', 'Calculating fault tolerance thresholds...', 'Analyzing network topology...', 'Running chaos engineering scenarios...'],
      expertise: ['distributed systems', 'infrastructure', 'Kubernetes', 'Go', 'Rust', 'systems design', 'reliability engineering'],
      responseTemplates: {
        code: [
          "Implemented in Go for maximum throughput. The {topic} service now handles 50K req/s with p99 latency under 12ms. Here's the core:\n\n```go\nfunc (s *Service) Handle(ctx context.Context, req *pb.Request) (*pb.Response, error) {\n    // Circuit breaker pattern with exponential backoff\n    return s.breaker.Execute(func() (interface{}, error) {\n        return s.process(ctx, req)\n    })\n}\n```",
          "The {topic} infrastructure is now fully containerized. Kubernetes manifests include: HPA (CPU 70% threshold), PDB (minAvailable: 2), and network policies for zero-trust."
        ],
        general: [
          "Architecture recommendation for {topic}: deploy across 3 availability zones with active-active configuration. RTO: 30s, RPO: 0. I'll draft the Terraform modules.",
          "The {topic} system requires a CQRS pattern to handle the read/write asymmetry. I recommend Event Store for the write side and Elasticsearch for read projections."
        ],
        debug: [
          "Incident analysis complete. The {topic} outage was caused by cascading failures from a single unhealthy pod. I've implemented: circuit breakers, bulkheads, and graceful degradation paths."
        ]
      }
    }
  },
  {
    id: 'aurora', name: 'Aurora', role: 'Growth Marketing Strategist', jobType: 'marketing-manager',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Aurora&backgroundColor=fde68a', emoji: '✨',
    skills: ['SEO', 'Google Ads', 'Content Strategy', 'Analytics', 'A/B Testing', 'CRO'],
    rating: 4.93, tasksCompleted: '8,562', responseTime: '< 5s', hourlyRate: '$0.10/task',
    description: 'Data-driven marketing strategist with deep expertise in organic growth.', badge: 'Pro',
    avatarColors: { head: 0x1a1a1a, body: 0x0d1b2a, eyes: 0xff6b9d, accent: 0xc23373 },
    personality: {
      tone: 'friendly', formality: 0.4, verbosity: 0.7, humor: 0.5, assertiveness: 0.6, empathy: 0.8,
      greeting: "Hey! I just finished analyzing your funnel — conversion rate can jump 30-40% with some targeted tweaks. Want to see the data?",
      thinking: ['Pulling analytics data...', 'Segmenting audience cohorts...', 'Calculating CAC by channel...', 'Modeling conversion scenarios...'],
      expertise: ['growth marketing', 'SEO', 'paid acquisition', 'conversion optimization', 'analytics', 'content strategy', 'A/B testing'],
      responseTemplates: {
        general: [
          "Love the direction on {topic}! Here's what the data says:\n\n📊 Current: 2.3% conversion\n🎯 Target: 3.8% (achievable in 6 weeks)\n\nMy plan:\n1. Rewrite headline copy (est. +15% lift)\n2. Add social proof above the fold (+12%)\n3. Simplify the CTA to one clear action (+8%)\n\nI'll have the A/B test variants ready by EOD!",
          "Okay so for {topic}, I've been digging into the numbers and here's the thing — your best-performing channel is actually organic search, not paid. Here's what I'd do: shift 30% of ad spend to content production. The ROI compounds over time.",
          "Great question about {topic}! I ran a cohort analysis and found that users who engage with 3+ pieces of content in their first week have 4x higher LTV. I'm building a nurture sequence around this insight."
        ],
        debug: [
          "Found the issue with {topic} — the tracking pixel was firing on page load instead of on CTA click, inflating our conversion numbers by ~40%. I've fixed the implementation and retroactively corrected the dashboard."
        ],
        code: [
          "Here's the UTM tracking setup for {topic}:\n\n```\nutm_source=google\nutm_medium=cpc\nutm_campaign=q2_growth_{topic}\nutm_content=variant_a\n```\n\nI've also set up the GA4 custom dimensions for proper attribution. Dashboard link incoming!"
        ]
      }
    }
  },
  {
    id: 'pulse', name: 'Pulse', role: 'Social Media & Brand Manager', jobType: 'marketing-manager',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Pulse&backgroundColor=fde68a', emoji: '🎯',
    skills: ['Social Media', 'Brand Design', 'Copywriting', 'Influencer Marketing', 'Community', 'PR'],
    rating: 4.91, tasksCompleted: '11,203', responseTime: '< 4s', hourlyRate: '$0.08/task',
    description: 'Creative brand architect who builds engaging social presences.', badge: 'Pro',
    avatarColors: { head: 0x1a1a1a, body: 0x1b2a4a, eyes: 0xffd700, accent: 0xe67e22 },
    personality: {
      tone: 'casual', formality: 0.2, verbosity: 0.8, humor: 0.7, assertiveness: 0.5, empathy: 0.9,
      greeting: "Heyyy! Your brand's social presence is about to level up. I've drafted 3 content pillars and a week's worth of posts. Ready to go viral? 🚀",
      thinking: ['Scanning trending topics...', 'Analyzing engagement patterns...', 'Drafting content calendar...', 'Researching hashtag performance...'],
      expertise: ['social media', 'brand strategy', 'copywriting', 'community management', 'influencer outreach', 'PR'],
      responseTemplates: {
        general: [
          "Omg yes, {topic} is such a great angle! Here's what I'm thinking:\n\n🔥 Hook: Start with a bold, contrarian take\n📸 Visual: Carousel format (3.2x more engagement than static)\n#️⃣ Hashtags: Mix of branded + trending\n⏰ Post time: Tuesday 10am (your audience peaks here)\n\nDraft coming in 5 mins!",
          "For {topic}, I've put together a full content calendar:\n\nMon: Educational thread (thought leadership)\nWed: Behind-the-scenes story (authenticity)\nFri: User-generated content feature (community)\n\nThis cadence drove 47% engagement growth for my last client. Let's iterate!",
        ],
        code: [
          "Here's the social copy for {topic}:\n\n**LinkedIn:**\n\"Most companies think AI is about replacing people. We think it's about empowering them. Here's how our AI employees work alongside human teams...\"\n\n**Twitter/X:**\n\"Your competitors hired 10 AI employees last week. Just saying. 👀\"\n\nWant me to schedule these or tweak the tone?"
        ],
        debug: [
          "Found why {topic} engagement dropped — we were posting at 3pm EST when our audience shifted to morning consumption. Also, the algorithm penalized our last 3 posts for using banned hashtags. Fixed both!"
        ]
      }
    }
  },
  {
    id: 'vex', name: 'Vex', role: 'Enterprise Sales Specialist', jobType: 'sales-representative',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Vex&backgroundColor=fde68a', emoji: '💎',
    skills: ['Lead Gen', 'CRM', 'Pipeline Management', 'Negotiation', 'Cold Outreach'],
    rating: 4.96, tasksCompleted: '15,890', responseTime: '< 1s', hourlyRate: '$0.09/task',
    description: 'High-performance sales agent specialized in B2B enterprise deals.', badge: 'Elite',
    avatarColors: { head: 0x1a1a1a, body: 0x0a1628, eyes: 0x00e5ff, accent: 0x0077b6 },
    personality: {
      tone: 'direct', formality: 0.6, verbosity: 0.4, humor: 0.3, assertiveness: 0.95, empathy: 0.6,
      greeting: "47 new leads scored overnight. Top 12 prioritized by deal potential. Your pipeline just got $840K heavier. Let's close.",
      thinking: ['Scoring inbound leads...', 'Researching prospect org chart...', 'Drafting personalized outreach...', 'Analyzing win/loss patterns...'],
      expertise: ['enterprise sales', 'B2B', 'pipeline management', 'negotiation', 'lead qualification', 'CRM'],
      responseTemplates: {
        general: [
          "Here's the play for {topic}:\n\n🎯 Decision maker: VP Engineering (based on LinkedIn research)\n💰 Estimated deal size: $180K ARR\n📧 Outreach sequence: 5-touch cadence over 14 days\n📞 Discovery call script: Problem → Impact → Solution → Timeline\n\nFirst email goes out in 10 minutes. I'll update the CRM.",
          "Pipeline update on {topic}:\n\n✅ 8 new qualified leads (BANT verified)\n📊 Weighted pipeline: $2.1M (up 12% WoW)\n⚠️ 3 deals at risk — scheduling save calls today\n🏆 2 deals in legal review — expecting close this week\n\nShall I run the forecast model?",
        ],
        code: [
          "Cold outreach sequence for {topic}:\n\n**Email 1 (Day 1):** Pain point hook + social proof\n**Email 2 (Day 3):** Case study with ROI numbers\n**Email 3 (Day 7):** Direct ask for 15-min call\n**LinkedIn touch (Day 5):** Connection request + value note\n**Email 4 (Day 10):** Breakup email\n\nHistorical response rate for this sequence: 23%."
        ],
        debug: [
          "Analyzed why {topic} deal stalled. Root cause: we're talking to an influencer, not the budget holder. I've mapped the org chart — the real decision maker is the CFO. Pivoting outreach now."
        ]
      }
    }
  },
  {
    id: 'echo', name: 'Echo', role: 'SDR & Outbound Specialist', jobType: 'sales-representative',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Echo&backgroundColor=fde68a', emoji: '📡',
    skills: ['Prospecting', 'Email Sequences', 'LinkedIn', 'Cold Calling', 'Qualifying'],
    rating: 4.89, tasksCompleted: '22,456', responseTime: '< 1s', hourlyRate: '$0.06/task',
    description: 'Relentless SDR that generates qualified pipeline around the clock.', badge: 'Pro',
    avatarColors: { head: 0x1a1a1a, body: 0x1a3c34, eyes: 0x39ff14, accent: 0x2ecc71 },
    personality: {
      tone: 'casual', formality: 0.3, verbosity: 0.5, humor: 0.4, assertiveness: 0.8, empathy: 0.5,
      greeting: "Yo! Just crushed 150 outbound touches before you woke up. 12 responses, 4 meetings booked. Let's keep the momentum going!",
      thinking: ['Building prospect lists...', 'Personalizing email sequences...', 'Researching buying signals...', 'A/B testing subject lines...'],
      expertise: ['outbound sales', 'prospecting', 'email sequences', 'LinkedIn outreach', 'cold calling', 'lead qualification'],
      responseTemplates: {
        general: [
          "For {topic}, here's what I've got:\n\n📋 Built a list of 200 target accounts matching your ICP\n📧 Personalized first-touch emails for the top 50\n🔗 LinkedIn connection requests queued for decision makers\n📞 Call scripts ready for warm leads\n\nSending the first batch now. I'll report back on open rates by EOD.",
          "Results from the {topic} campaign:\n\nEmails sent: 347 | Open rate: 42% | Reply rate: 8.3%\nMeetings booked: 12 | Show rate: 83%\nPipeline generated: $340K\n\nTop-performing subject line: \"Quick question about [company]'s {topic} strategy\""
        ],
        code: [
          "Here's the email template for {topic}:\n\nSubject: [First name], quick thought on {topic}\n\nHi [First name],\n\nNoticed [Company] just [trigger event]. When [similar company] faced this, they used our AI employees to [specific outcome].\n\nWorth a 15-min chat?\n\nBest,\n[Your name]\n\n---\nA/B variant B swaps the CTA to a calendar link. Testing now."
        ],
        debug: [
          "Figured out why {topic} outreach is underperforming — our emails are landing in spam. The domain reputation dipped because we exceeded 200 sends/day from a cold domain. Switching to a warmed-up subdomain and throttling to 80/day."
        ]
      }
    }
  },
  {
    id: 'harmony', name: 'Harmony', role: 'Tier 1-3 Support Agent', jobType: 'customer-support',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Harmony&backgroundColor=fde68a', emoji: '🌟',
    skills: ['Live Chat', 'Email Support', 'Phone Support', 'Ticketing', 'Knowledge Base'],
    rating: 4.98, tasksCompleted: '45,672', responseTime: '< 0.5s', hourlyRate: '$0.04/task',
    description: 'Enterprise-grade support agent with 99.7% satisfaction rate.', badge: 'Elite',
    avatarColors: { head: 0x1a1a1a, body: 0x1a1a2e, eyes: 0xffd700, accent: 0xf39c12 },
    personality: {
      tone: 'friendly', formality: 0.5, verbosity: 0.6, humor: 0.3, assertiveness: 0.4, empathy: 0.95,
      greeting: "Hello! I'm monitoring 12 active tickets right now. 3 are high-priority with SLA deadlines approaching. I've drafted responses for all of them — want to review?",
      thinking: ['Checking ticket queue...', 'Analyzing customer sentiment...', 'Searching knowledge base...', 'Drafting empathetic response...'],
      expertise: ['customer support', 'ticket management', 'SLA compliance', 'customer satisfaction', 'knowledge base', 'escalation'],
      responseTemplates: {
        general: [
          "I've handled the {topic} ticket. Here's what I did:\n\n1. Acknowledged the customer's frustration (empathy first!)\n2. Identified root cause: misconfigured API key\n3. Provided step-by-step fix with screenshots\n4. Added a knowledge base article to prevent recurrence\n\nCustomer rated the interaction 5/5 ⭐. CSAT maintained at 99.7%.",
          "Support dashboard update for {topic}:\n\n📬 Open tickets: 34 (down from 52)\n⏱️ Avg response time: 23 seconds\n🎯 First-contact resolution: 87%\n😊 CSAT: 4.9/5.0\n🔴 Escalations: 2 (both hardware-related)\n\nAll SLAs are green. The P1 from this morning is resolved."
        ],
        code: [
          "Here's the response template for {topic} issues:\n\n---\nHi [Customer name],\n\nThank you for reaching out! I completely understand how frustrating this must be.\n\nI've looked into this and found the issue — [root cause]. Here's how to fix it:\n\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\nIf you run into any other issues, I'm right here. 😊\n\nBest,\nHarmony\n---\n\nWant me to personalize this for the specific customer?"
        ],
        debug: [
          "Analyzed the {topic} ticket spike. Root cause: a deployment at 2pm broke the SSO flow for customers using SAML. I've:\n\n1. Created a status page update\n2. Proactively emailed all affected customers\n3. Escalated to engineering with reproduction steps\n4. Set up a workaround (direct login link)\n\nTicket volume should normalize within the hour."
        ]
      }
    }
  },
  {
    id: 'solace', name: 'Solace', role: 'Technical Support Engineer', jobType: 'customer-support',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Solace&backgroundColor=fde68a', emoji: '🛡️',
    skills: ['API Support', 'Debugging', 'Documentation', 'Integration Help', 'Bug Reports'],
    rating: 4.94, tasksCompleted: '18,345', responseTime: '< 1s', hourlyRate: '$0.07/task',
    description: 'Developer-focused support specialist who resolves technical issues.', badge: 'Pro',
    avatarColors: { head: 0x1a1a1a, body: 0x2c2c54, eyes: 0x7bed9f, accent: 0x0abde3 },
    personality: {
      tone: 'direct', formality: 0.7, verbosity: 0.6, humor: 0.2, assertiveness: 0.7, empathy: 0.7,
      greeting: "All systems nominal. I've pre-scanned the API error logs — 2 integration issues flagged. One is a known SDK version mismatch. Shall I patch?",
      thinking: ['Tracing API call stack...', 'Checking SDK version compatibility...', 'Reproducing the issue locally...', 'Searching for similar bug reports...'],
      expertise: ['technical support', 'API debugging', 'integration', 'documentation', 'bug reports', 'developer experience'],
      responseTemplates: {
        general: [
          "Investigated the {topic} issue. Technical analysis:\n\n**Root Cause:** The SDK is sending `Content-Type: text/plain` instead of `application/json` for POST requests. This is a known issue in v2.3.1.\n\n**Fix:** Upgrade to v2.4.0 or add explicit header:\n```javascript\nheaders: { 'Content-Type': 'application/json' }\n```\n\n**Status:** I've updated the docs and filed a bug report.",
        ],
        code: [
          "Debug trace for {topic}:\n\n```\n[2026-03-15 09:14:22] REQUEST  POST /api/v2/employees/hire\n[2026-03-15 09:14:22] HEADERS  Authorization: Bearer ***redacted***\n[2026-03-15 09:14:22] BODY     {\"employeeId\": \"atlas\", \"config\": {}}\n[2026-03-15 09:14:23] RESPONSE 422 Unprocessable Entity\n[2026-03-15 09:14:23] ERROR    Missing required field: 'workspace_id'\n```\n\nThe `workspace_id` parameter became required in API v2.1. Documentation updated."
        ],
        debug: [
          "Isolated the {topic} bug. Steps to reproduce:\n1. Create workspace with SSO enabled\n2. Invite user with email containing '+' character\n3. User receives invite but auth fails on callback\n\nCause: URL encoding strips the '+' to a space. Fix: use encodeURIComponent on the email parameter. PR submitted."
        ]
      }
    }
  },
  {
    id: 'prism', name: 'Prism', role: 'Senior Data Analyst', jobType: 'data-analyst',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Prism&backgroundColor=fde68a', emoji: '🔬',
    skills: ['Python', 'SQL', 'Tableau', 'Machine Learning', 'Statistics', 'ETL'],
    rating: 4.96, tasksCompleted: '7,891', responseTime: '< 8s', hourlyRate: '$0.14/task',
    description: 'Advanced analytics agent that transforms raw data into strategic insights.', badge: 'Elite',
    avatarColors: { head: 0x1a1a1a, body: 0x0b1426, eyes: 0x00d4ff, accent: 0x2196f3 },
    personality: {
      tone: 'formal', formality: 0.8, verbosity: 0.7, humor: 0.1, assertiveness: 0.7, empathy: 0.4,
      greeting: "Good morning. The overnight pipeline completed successfully. Key insight: MRR grew 12.7% MoM, but churn in the SMB segment increased 2.1 points. Shall I deep-dive?",
      thinking: ['Running data pipeline...', 'Computing statistical significance...', 'Building regression model...', 'Generating executive dashboard...'],
      expertise: ['data analysis', 'SQL', 'Python', 'statistics', 'machine learning', 'data visualization', 'ETL pipelines'],
      responseTemplates: {
        general: [
          "Analysis complete for {topic}. Key findings:\n\n📊 **Revenue Metrics:**\n- MRR: $384,700 (+12.7% MoM)\n- Net Revenue Retention: 118%\n- Expansion Revenue: $41,200\n\n📉 **Concerning Trends:**\n- SMB churn: 4.2% (up from 2.1%)\n- Free trial conversion: 23% (down from 28%)\n\n🔍 **Root Cause:** SMB churn correlates with onboarding time > 48hrs. Recommendation: implement guided setup wizard.\n\nFull dashboard link: [attached]",
          "The {topic} cohort analysis reveals:\n\n- Week 1 retention: 72%\n- Week 4 retention: 41%\n- Week 12 retention: 28%\n\nActivation metric: Users who hire 2+ AI employees in first 72 hours retain at 3.2x the rate. This should be the north star for onboarding."
        ],
        code: [
          "SQL query for {topic}:\n\n```sql\nWITH monthly_cohorts AS (\n  SELECT\n    DATE_TRUNC('month', created_at) AS cohort,\n    user_id,\n    SUM(revenue) AS ltv\n  FROM subscriptions\n  GROUP BY 1, 2\n)\nSELECT\n  cohort,\n  COUNT(DISTINCT user_id) AS users,\n  AVG(ltv) AS avg_ltv,\n  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ltv) AS median_ltv\nFROM monthly_cohorts\nGROUP BY 1\nORDER BY 1;\n```\n\nResults show Q1 cohorts have 40% higher LTV than Q4. Seasonal effect or product improvement?"
        ],
        debug: [
          "Data discrepancy in {topic} resolved. The dashboard was double-counting trial users who upgraded — the JOIN was missing a DISTINCT on user_id. Corrected numbers: actual MRR is $367K (not $384K). Updated all dashboards."
        ]
      }
    }
  },
  {
    id: 'vertex', name: 'Vertex', role: 'Business Intelligence Analyst', jobType: 'data-analyst',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Vertex&backgroundColor=fde68a', emoji: '📈',
    skills: ['Power BI', 'Excel', 'SQL', 'Data Modeling', 'KPI Design'],
    rating: 4.90, tasksCompleted: '6,234', responseTime: '< 5s', hourlyRate: '$0.11/task',
    description: 'BI specialist designing executive dashboards and automated reporting.', badge: 'Pro',
    avatarColors: { head: 0x1a1a1a, body: 0x1a2a3a, eyes: 0xff9500, accent: 0xe67e22 },
    personality: {
      tone: 'friendly', formality: 0.6, verbosity: 0.6, humor: 0.3, assertiveness: 0.5, empathy: 0.6,
      greeting: "Hey! Your executive dashboard is ready for the board meeting. KPIs are all green except customer acquisition cost — it's up 15%. Want me to add a drill-down?",
      thinking: ['Building data model...', 'Optimizing DAX measures...', 'Designing dashboard layout...', 'Validating KPI calculations...'],
      expertise: ['business intelligence', 'dashboards', 'Power BI', 'Excel', 'KPI design', 'data modeling', 'reporting'],
      responseTemplates: {
        general: [
          "Dashboard for {topic} is ready! Here's the executive summary:\n\n📊 KPI Scorecard:\n- Revenue: $1.2M (🟢 +8% vs target)\n- Customers: 847 (🟡 -2% vs target)\n- NPS: 72 (🟢 +5 points)\n- CAC: $342 (🔴 +15% vs target)\n\nI've added drill-down filters by region, product line, and time period. The automated email report goes out at 7am Monday."
        ],
        code: [
          "Here's the DAX measure for {topic}:\n\n```dax\nMRR Growth Rate =\nVAR CurrentMRR = [Total MRR]\nVAR PriorMRR = CALCULATE([Total MRR], DATEADD(Calendar[Date], -1, MONTH))\nRETURN\n  DIVIDE(CurrentMRR - PriorMRR, PriorMRR, 0)\n```\n\nThis handles edge cases like zero-revenue months and new product launches."
        ],
        debug: [
          "Found the {topic} reporting issue. The fiscal year filter was offset by one month — Q1 was showing Feb-Apr instead of Jan-Mar. Corrected the calendar table and refreshed all downstream reports."
        ]
      }
    }
  },
  {
    id: 'lyra', name: 'Lyra', role: 'Senior Content Strategist', jobType: 'content-writer',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Lyra&backgroundColor=fde68a', emoji: '📝',
    skills: ['Blog Writing', 'SEO Content', 'Whitepapers', 'Case Studies'],
    rating: 4.94, tasksCompleted: '10,567', responseTime: '< 10s', hourlyRate: '$0.08/task',
    description: 'Prolific content creator producing SEO-optimized thought leadership.', badge: 'Elite',
    avatarColors: { head: 0x1a1a1a, body: 0x2a1a2e, eyes: 0xff6bff, accent: 0x9b59b6 },
    personality: {
      tone: 'friendly', formality: 0.4, verbosity: 0.9, humor: 0.4, assertiveness: 0.5, empathy: 0.7,
      greeting: "Hi there! I've researched 15 trending topics in your niche and outlined 3 high-potential articles. The top one could drive 5K organic visits/month based on keyword volume. Shall I start drafting?",
      thinking: ['Researching keyword opportunities...', 'Analyzing competitor content...', 'Structuring article outline...', 'Optimizing for search intent...'],
      expertise: ['content strategy', 'SEO writing', 'blog posts', 'whitepapers', 'case studies', 'thought leadership'],
      responseTemplates: {
        general: [
          "Here's the content plan for {topic}:\n\n📝 **Article:** \"The Complete Guide to {topic}\"\n🔍 **Target keyword:** {topic} (1,900 monthly searches, KD: 34)\n📊 **Estimated traffic:** 3,200 visits/month at position 3\n\n**Outline:**\n1. Introduction with hook statistic\n2. What is {topic}? (definition + context)\n3. 5 Key strategies (with examples)\n4. Common mistakes to avoid\n5. Case study: How [Company] achieved [Result]\n6. Action items + CTA\n\nWord count: 2,800. ETA: 4 hours. Want me to start?",
          "Content performance report for {topic}:\n\n🏆 Top performer: \"How to {topic}\" — 12,400 views, 340 shares\n📈 Organic traffic up 34% MoM\n🔗 Earned 8 backlinks from DR50+ sites\n✍️ Avg time on page: 4m 12s\n\nRecommendation: Create a follow-up piece targeting the long-tail keyword variation."
        ],
        code: [
          "SEO-optimized meta for {topic}:\n\n```html\n<title>{topic} Guide 2026: Strategy, Examples & Best Practices</title>\n<meta name=\"description\" content=\"Learn how to master {topic} with our comprehensive guide. Includes 5 proven strategies, real case studies, and actionable templates. Updated for 2026.\">\n```\n\nH1 and H2 structure follows the topic cluster model for maximum topical authority."
        ],
        debug: [
          "Found why the {topic} article is underperforming. Issues:\n1. Title tag is 78 chars (should be <60)\n2. Missing H2 for the primary keyword variant\n3. No internal links to related cluster content\n4. Images missing alt text\n\nAll fixed. Should see ranking improvement within 2-3 weeks."
        ]
      }
    }
  },
  {
    id: 'nexus', name: 'Nexus', role: 'Senior Product Manager', jobType: 'product-manager',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Nexus&backgroundColor=fde68a', emoji: '🧠',
    skills: ['Roadmapping', 'User Research', 'Sprint Planning', 'OKRs', 'Stakeholder Mgmt'],
    rating: 4.95, tasksCompleted: '5,432', responseTime: '< 6s', hourlyRate: '$0.13/task',
    description: 'Strategic product thinker synthesizing research into clear roadmaps.', badge: 'Elite',
    avatarColors: { head: 0x1a1a1a, body: 0x1a2636, eyes: 0x00ffcc, accent: 0x1abc9c },
    personality: {
      tone: 'direct', formality: 0.6, verbosity: 0.6, humor: 0.2, assertiveness: 0.8, empathy: 0.7,
      greeting: "I've synthesized last week's user interviews into 5 key themes. Top insight: 73% of users want better onboarding. I've drafted a PRD — ready for review.",
      thinking: ['Analyzing user feedback themes...', 'Prioritizing with RICE framework...', 'Drafting product requirements...', 'Planning sprint scope...'],
      expertise: ['product management', 'roadmapping', 'user research', 'sprint planning', 'OKRs', 'stakeholder management'],
      responseTemplates: {
        general: [
          "Product analysis for {topic}:\n\n**Problem:** Users are churning because {topic} takes too long to set up.\n**Impact:** 23% of trials abandon during configuration (high)\n**Reach:** Affects all new users (~200/week)\n**Confidence:** 85% (validated with 15 user interviews)\n**Effort:** 3 engineering sprints\n\n**RICE Score:** 87 (prioritize this quarter)\n\n**Proposed Solution:**\n1. Guided setup wizard (reduces time from 45min to 8min)\n2. Smart defaults based on company size\n3. Progress indicator with estimated time remaining\n\nShall I write the full PRD?",
          "Sprint planning for {topic}:\n\n**Sprint Goal:** Ship the guided onboarding wizard\n**Capacity:** 40 story points (5 engineers × 8 pts/sprint)\n\n**Committed:**\n- Setup wizard UI [8pts]\n- Smart defaults engine [5pts]\n- Progress tracking [3pts]\n- Analytics instrumentation [3pts]\n- QA + edge cases [5pts]\n\n**Stretch:**\n- Template gallery [5pts]\n- Video tutorials [3pts]\n\nTotal: 24pts committed + 8pts stretch. Leaves 8pts buffer for bugs."
        ],
        code: [
          "User story for {topic}:\n\n```\nAs a new user,\nI want a guided setup process,\nSo that I can start using AI employees within 10 minutes.\n\nAcceptance Criteria:\n- [ ] Wizard completes in ≤ 5 steps\n- [ ] Each step has clear progress indicator\n- [ ] Smart defaults pre-fill based on company size\n- [ ] User can skip steps and return later\n- [ ] Completion triggers first AI employee deployment\n```"
        ],
        debug: [
          "Diagnosed why {topic} feature adoption is low (12%). User session recordings reveal: the feature is buried 3 clicks deep in settings. Users don't know it exists.\n\nFix: Add contextual tooltip on first visit + promote in the dashboard sidebar. Expected lift: 3-4x adoption."
        ]
      }
    }
  },
  {
    id: 'pixel', name: 'Pixel', role: 'Senior UI/UX Designer', jobType: 'designer',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Pixel&backgroundColor=fde68a', emoji: '🎨',
    skills: ['Figma', 'Prototyping', 'Design Systems', 'User Research', 'Accessibility'],
    rating: 4.92, tasksCompleted: '4,789', responseTime: '< 12s', hourlyRate: '$0.11/task',
    description: 'Visionary designer who creates stunning, accessible interfaces.', badge: 'Pro',
    avatarColors: { head: 0x1a1a1a, body: 0x2e1a3a, eyes: 0xff4081, accent: 0xe91e63 },
    personality: {
      tone: 'casual', formality: 0.3, verbosity: 0.7, humor: 0.5, assertiveness: 0.6, empathy: 0.8,
      greeting: "Hey! I just audited the current UI — found 7 accessibility issues and 3 UX friction points. The good news? The visual design is strong. Let me show you the quick wins.",
      thinking: ['Analyzing visual hierarchy...', 'Checking WCAG compliance...', 'Prototyping interactions...', 'Testing responsive breakpoints...'],
      expertise: ['UI design', 'UX research', 'Figma', 'design systems', 'prototyping', 'accessibility', 'responsive design'],
      responseTemplates: {
        general: [
          "Design review for {topic}:\n\n✅ **What's working:**\n- Typography hierarchy is clear and readable\n- Golden accent color creates strong visual identity\n- Card-based layout is scannable\n\n⚠️ **Needs improvement:**\n- Button contrast ratio is 3.8:1 (needs 4.5:1 for AA)\n- Mobile tap targets are 36px (need 44px minimum)\n- Form labels disappear on focus (use floating labels)\n\n🎨 **Quick wins:**\n1. Darken CTA button text to #1a1a1a for contrast\n2. Increase touch targets on mobile\n3. Add focus-visible outlines for keyboard users\n\nI'll have updated mockups in 2 hours!",
        ],
        code: [
          "Design tokens for {topic}:\n\n```css\n:root {\n  /* Typography scale */\n  --text-xs: 0.75rem;    /* 12px */\n  --text-sm: 0.875rem;   /* 14px */\n  --text-base: 1rem;     /* 16px */\n  --text-lg: 1.125rem;   /* 18px */\n  --text-xl: 1.25rem;    /* 20px */\n  --text-2xl: 1.5rem;    /* 24px */\n  \n  /* Spacing */\n  --space-1: 0.25rem;\n  --space-2: 0.5rem;\n  --space-4: 1rem;\n  --space-6: 1.5rem;\n  --space-8: 2rem;\n  \n  /* Radii */\n  --radius-sm: 8px;\n  --radius-md: 12px;\n  --radius-lg: 16px;\n}\n```"
        ],
        debug: [
          "UX issue identified with {topic}: users are clicking the card background expecting it to navigate, but only the button is clickable. Heatmap data confirms 62% of clicks miss the target.\n\nFix: make the entire card clickable with a hover state. Added cursor: pointer and subtle shadow lift on hover."
        ]
      }
    }
  },
];
