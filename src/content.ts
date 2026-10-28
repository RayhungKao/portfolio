export type Card = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  metric: string;
  color: string;
  angle?: number;
  /** Featured cards render larger on the desk and span the full row in the list. */
  featured?: boolean;
  /** Extra line shown on featured cards. */
  blurb?: string;
  /** Links shown at the bottom of the detail panel. */
  links?: { label: string; href: string }[];
  /** Optional talk shown under the opened card, one 16:9 slide at a time. */
  talk?: TalkSlide[];
  detail: {
    lead: string;
    points: string[];
    tags: string[];
  };
};

/**
 * A talk slide: an eyebrow and a title, then its body laid out by `layout`:
 * - cover: the title alone, large, with `note` as the subtitle
 * - cards (default): numbered cards in a row; `accent` tints one, `warn` colors the numbers orange
 * - steps: cards in a row with arrows between them
 * - grid: cards in two columns
 * - figures: each item title as a large number, without cards
 * - rows: stacked rows divided by rules
 * `callout` is a tinted box under the body; `note` is a closing line.
 */
export type TalkSlide = {
  eyebrow: string;
  title: string;
  layout?: 'cover' | 'cards' | 'steps' | 'grid' | 'figures' | 'rows';
  warn?: boolean;
  items?: { n?: string; title: string; body?: string; points?: string[]; accent?: boolean }[];
  callout?: { title: string; body: string };
  note?: string;
};

export const CARDS: Card[] = [
  {
    id: 'about',
    kicker: 'Hello',
    title: 'Ray Kao',
    subtitle: 'Software engineer in Taipei',
    metric: 'Open me first →',
    color: '#111827',
    featured: true,
    blurb: 'Product-minded software engineer who builds from rendering performance to the backend boundary.',
    detail: {
      lead: 'Product-minded software engineer who builds from rendering performance to the backend boundary.',
      points: [
        'From 2024 to 2026, core developer on YouCam Online Editor at Perfect Corp (NYSE: PERF), an AI photo and video editor that grew from about 10 tools to 80+ across 17 locales.',
        'Earlier co-founded a startup and, as its sole developer, built its full-stack web product end to end.',
        'Five years of blockchain research (two as an undergraduate, three in my M.S. focused on applied cryptography), ending with an IEEE paper.',
      ],
      tags: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Ruby on Rails'],
    },
  },
  {
    id: 'ai-agent',
    kicker: 'Perfect Corp',
    title: 'AI Agent',
    subtitle: 'Conversational editing assistant: ~80 features in two months',
    metric: 'Capability handshake · SSE · cancel flow',
    links: [
      { label: 'How I built the AI Agent: streaming, multimodal, one prompt for the whole platform', href: '/blog/ai-agent-architecture' },
      { label: 'Making every long-running task non-blocking', href: '/blog/non-blocking-long-running-tasks' },
    ],
    color: '#6366f1',
    angle: -3,
    detail: {
      lead: 'Architected the frontend from scratch for a conversational assistant that edits photos and videos from a chat.',
      points: [
        'A capability handshake that tells the agent which features the client supports, so it only picks tools the client can run.',
        'Ran each tool the agent picked through the right route: in-browser filter, client task, tool page, or server task.',
        'Kept basic photo edits on-device with Fabric.js on WebGL, and de-duplicated uploads by content hash.',
        'Streamed replies over SSE, with a cancel flow that works at every stage and survives a reload.',
        'Led integration across product, AI engine, backend, Beauty SDK and QA.',
      ],
      tags: ['SSE', 'React', 'Redux', 'Fabric.js'],
    },
    talk: [
      {
        eyebrow: 'Project case study · STAR',
        title: 'Shipping the AI Agent',
        layout: 'cover',
      },
      {
        eyebrow: 'Situation',
        title: 'A web editor gets a conversational AI assistant',
        items: [
          { title: 'The product', body: 'YouCam Online Editor: AI photo and video editing in 17 locales.' },
          { title: 'The ask', body: 'Let users describe an edit in a chat, and have the assistant run it inside the editor.' },
        ],
      },
      {
        eyebrow: 'Task · My role',
        title: 'Design the frontend from scratch and connect the teams',
        items: [
          {
            title: 'I owned',
            points: [
              'Integration with product, AI engine, backend, Beauty SDK and QA',
              'Tracking each team’s progress and clearing blockers',
            ],
          },
          { title: 'Goal', body: 'Launch in two months', accent: true },
        ],
      },
      {
        eyebrow: 'Who does what',
        title: 'Four teams behind one assistant; I own what users see',
        items: [
          { title: 'Frontend (me)', body: 'Everything users see and touch, and the state behind it.', accent: true },
          { title: 'Backend · agent team', body: 'The LLM, plus tasks on third-party models: Nano Banana, Seedance, Seedream, Kling.' },
          { title: 'Backend · task team', body: 'In-house tasks on company machines, and a record of every task for chat history.' },
          { title: 'AI engine', body: 'The models behind every feature, in-house or third-party. The largest team.' },
        ],
      },
      {
        eyebrow: 'Challenges',
        title: 'Three things that stalled progress',
        warn: true,
        items: [
          { n: '01', title: 'Limited capacity', body: 'The agent and task teams served many products and could not customize much for us; QA tested each feature one by one.' },
          { n: '02', title: 'Unclear interfaces', body: 'I had to call the API feature by feature to learn how each one worked and what its request and response looked like.' },
          { n: '03', title: 'Long-running tasks', body: 'Video generation takes time. Users may cancel or refresh midway, and the task state must not be lost.' },
        ],
      },
      {
        eyebrow: 'Action 1 · Cut the dependencies',
        title: 'Three ways to run a feature',
        items: [
          { n: '~30', title: 'Beauty SDK effects', body: 'Makeup, reshape, skin and hair. The frontend builds the effect and sends it to the task service.' },
          { n: '~10', title: 'Browser and existing tools', body: 'Fabric.js filters, an editing tool’s own pipeline, or a jump to that tool’s page.' },
          { n: '~40', title: 'Agent server', body: 'Run by the agent and task teams; the client polls for the result or gets it inline.' },
        ],
        note: 'The frontend owned the first two, about half of all features, so they never waited on the agent server.',
      },
      {
        eyebrow: 'Action 2 · Make the interface clear',
        title: 'One shared answer to “what can the client do?”',
        layout: 'steps',
        items: [
          { title: 'Frontend', body: 'Declares the features it supports (capability handshake)' },
          { title: 'Agent backend', body: 'Picks a tool only from that list' },
          { title: 'Frontend runs it', body: 'Reports the result back, so the next turn edits it' },
        ],
        callout: {
          title: 'One record per feature',
          body: 'Issues found, how it connects, and the expected request and response. Used in the weekly sync to align every team.',
        },
      },
      {
        eyebrow: 'Action 3 · Make waiting reliable',
        title: 'Long AI tasks that never leave users lost',
        layout: 'grid',
        items: [
          { title: 'SSE streaming', body: 'Replies render as they are generated, not after the whole answer' },
          { title: 'Async task polling', body: 'Tasks are tracked in the background, so the UI never blocks' },
          { title: 'Cancel at any stage', body: 'Mid-reply or mid-task, cancel has a clear end state' },
          { title: 'Restored on reload', body: 'State comes back from chat history, so nobody loses progress' },
        ],
      },
      {
        eyebrow: 'Action 4 · Keep a steady cadence',
        title: 'Weekly sync, then ship whatever is ready',
        layout: 'steps',
        items: [
          { n: 'Step 1', title: 'Weekly sync', body: 'Through the PM, confirm which features the agent team, task team and QA support this week' },
          { n: 'Step 2', title: 'Integrate', body: 'Connect each feature as soon as its support lands' },
          { n: 'Step 3', title: 'Ship after QA', body: 'Release in batches instead of waiting for all of them' },
        ],
      },
      {
        eyebrow: 'Result',
        title: 'Shipped on time',
        layout: 'figures',
        items: [{ title: '~80', body: 'Task-run features shipped on schedule' }],
        note: 'The agent and task teams spent their limited time on the features that truly needed a server-side task.',
      },
      {
        eyebrow: 'Lessons learned',
        title: 'Three things I would keep',
        layout: 'rows',
        items: [
          { n: '01', title: 'Write the interface down first', body: 'Agree on a written spec with both server teams early, so nobody reverse-engineers it and QA can prepare sooner.' },
          { n: '02', title: 'Cut dependencies, then push', body: 'With limited resources, changing my own plan beats asking others to reprioritize.' },
          { n: '03', title: 'Every wait needs an end', body: 'Polling needs a limit; cancel and reload each need a clear final state.' },
        ],
      },
    ],
  },
  {
    id: 'canvas',
    kicker: 'Perfect Corp',
    title: 'Canvas interactions',
    subtitle: 'Fabric.js drag, resize, rotate, snapping, zoom & pan',
    metric: 'The desk you are using now',
    color: '#0ea5e9',
    angle: 2,
    detail: {
      lead: "Built the editor's Fabric.js canvas interactions from day one.",
      points: [
        'Drag, resize, and rotate for canvas objects.',
        'Snapping with alignment guides, plus zoom and pan across the canvas.',
        'Powers the editing tools, undo/redo, image export, and the AI Agent’s in-browser task execution.',
        'This desk reuses the same ideas: try dragging a card next to another one.',
      ],
      tags: ['Fabric.js', 'Canvas', 'TypeScript'],
    },
  },
  {
    id: 'performance',
    kicker: 'Perfect Corp',
    title: 'Video history performance',
    subtitle: 'Proposed and designed a new loading architecture',
    metric: '−95% video bandwidth',
    links: [{ label: "Write-up: how I made YCO's video history handle a media-heavy list", href: '/blog/video-history-performance' }],
    color: '#10b981',
    angle: 1.5,
    detail: {
      lead: 'Proposed and designed a new performance architecture for the video history page.',
      points: [
        'IntersectionObserver-gated media loading and debounced hover playback, so video downloads scale with the viewport rather than history length.',
        'A follow-on pass replaced O(n²) result merging with Set-based dedup and added an LRU cache for detail requests.',
        'Results: first-load video bandwidth −95%, detail API calls −85%, re-renders −95%.',
      ],
      tags: ['Performance', 'IntersectionObserver', 'React.memo'],
    },
  },
  {
    id: 'payments',
    kicker: 'Perfect Corp',
    title: 'Payments & subscriptions',
    subtitle: 'Stripe checkout, PayPal, Pro/Plus/Free plans',
    metric: 'Credit metering · 50/50 A/B test',
    color: '#f59e0b',
    angle: -2,
    detail: {
      lead: 'Built the customized Stripe checkout for the US market and moved several editing tools onto the Pro/Plus/Free subscription model.',
      points: [
        'Product selection, coupon logic, and PayPal via 2Checkout.',
        '50/50 A/B test between gateways.',
        'Configuration-driven feature gating and credit metering for the tools on Pro/Plus/Free plans.',
        'Subscription, pay-as-you-go, and usage records on the B2B API dashboard.',
      ],
      tags: ['Stripe', 'Subscriptions', 'A/B testing'],
    },
  },
  {
    id: 'tripbook',
    kicker: 'Startup',
    title: 'Tripbook',
    subtitle: 'Sole developer · Ruby on Rails, PostgreSQL, Redis',
    metric: '40k peak requests',
    color: '#ef4444',
    angle: 3,
    detail: {
      lead: 'Co-founded and, as the sole developer, built a geofenced campus tour web app adopted by NTHU’s CS department for all freshmen.',
      points: [
        'Visiting all 8 campus spots earned course credit, with randomized cards from a 100+ pool on each entry.',
        '100+ registrations on launch day; 40% of users earned credit within the first month.',
        'Scaled to 40k peak requests with PaaS, load balancing, caching, and a CDN.',
      ],
      tags: ['Ruby on Rails', 'PostgreSQL', 'Redis'],
    },
  },
  {
    id: 'research',
    kicker: 'Research · IEEE',
    title: 'Verifiable accounting',
    subtitle: 'Blockchain-based anti-fraud AIS · ICECCME 2023',
    metric: 'Preventing financial statement fraud',
    links: [
      { label: 'Read the paper on IEEE Xplore', href: 'https://ieeexplore.ieee.org/document/10252842' },
      { label: 'DOI 10.1109/ICECCME57830.2023.10252842', href: 'https://doi.org/10.1109/ICECCME57830.2023.10252842' },
    ],
    color: '#8b5cf6',
    angle: -1,
    detail: {
      lead: 'A blockchain-based accounting information system that keeps financial statements verifiable without relying on a trusted third-party server.',
      points: [
        'Triple-entry transaction records and digital signatures ensure the authenticity and integrity of financial data.',
        'Balances confidentiality and verifiability: sensitive information stays encrypted, while the information financial statements depend on stays transparent.',
        'Offers a more efficient and reliable alternative to traditional trusted third-party (TTP) servers.',
        'Prototype: Paillier homomorphic encryption checks declared totals against encrypted transactions across an 8-company network, with RSA-2048 signatures on every transaction.',
        'Published at the 2023 3rd ICECCME (IEEE), Tenerife, Spain, July 2023.',
      ],
      tags: ['Applied cryptography', 'Blockchain', 'Triple-entry accounting', 'Paillier'],
    },
  },
  {
    id: 'this-site',
    kicker: 'Side project',
    title: 'This site',
    subtitle: 'A Fabric.js desk that flies into slides',
    metric: 'Built with Claude · two write-ups',
    links: [
      { label: 'How it was built: decisions and skills', href: '/blog/building-this-site-with-claude' },
      { label: 'Technical deep dive: camera flight and the card-to-slide hand-off', href: '/blog/fabric-camera-flight-into-a-slide' },
    ],
    color: '#64748b',
    angle: 2,
    detail: {
      lead: 'This desk is the portfolio: click a card and the camera flies in, then the card opens into a slide.',
      points: [
        'Fabric.js camera flights: log-scale zoom, a mid-flight pull-back between cards, and cards that straighten as you arrive.',
        "Each card is its slide's real layout drawn on the canvas at small scale, so zooming in lands exactly on the HTML slide.",
        'Every card has its own URL, so links open straight onto one piece of work and the Back button returns to the desk.',
        'Built in a conversation with Claude: I set the direction and judged the results; Claude wrote and tested the code.',
      ],
      tags: ['Fabric.js', 'React', 'Web Animations API', 'Claude'],
    },
  },
];

export const LINKS = {
  email: 'mailto:rayhungkao@gmail.com',
  github: 'https://github.com/RayhungKao',
  linkedin: 'https://www.linkedin.com/in/juihungkao',
  resume: '/resume',
  paper: 'https://ieeexplore.ieee.org/document/10252842',
  yco: 'https://yce.perfectcorp.com',
  perfectCorp: 'https://www.perfectcorp.com',
};
