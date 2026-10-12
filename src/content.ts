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
  detail: {
    lead: string;
    points: string[];
    tags: string[];
  };
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
        'Core developer on YouCam Online Editor at Perfect Corp (NYSE: PERF), an AI photo and video editor that grew from about 10 tools to 80+ across 17 locales.',
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
    subtitle: 'Conversational editing assistant, ~80 task-run features',
    metric: 'SSE · capability handshake · cancel flow',
    color: '#6366f1',
    angle: -3,
    detail: {
      lead: 'Architected the frontend from scratch for a conversational assistant that edits photos and videos, launched with ~80 task-run features in its first two months.',
      points: [
        'SSE response streaming and async task polling.',
        'A capability handshake that tells the backend which features the client supports.',
        'A cancel flow that works at every stage of a reply and is restored from history on reload.',
        'Led integration across product, AI engine, backend, and Beauty SDK teams.',
      ],
      tags: ['SSE', 'React', 'Redux', 'Fabric.js'],
    },
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
    metric: '−95% load time & bandwidth',
    color: '#10b981',
    angle: 1.5,
    detail: {
      lead: 'Proposed and designed a new performance architecture for the video history page.',
      points: [
        'IntersectionObserver-gated media loading, preload-none sources, and debounced playback keep per-item scroll cost constant.',
        'A follow-on pass took detail fetching from quadratic to linear with a Map cache.',
        'Results: initial load time and bandwidth −95%, API calls −85%, re-renders −95%.',
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
      { label: 'How it was built: decisions and skills', href: '#/blog/building-this-site-with-claude' },
      { label: 'Technical deep dive: camera flight and the card-to-slide hand-off', href: '#/blog/fabric-camera-flight-into-a-slide' },
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
  resume: '#/resume',
  paper: 'https://ieeexplore.ieee.org/document/10252842',
  yco: 'https://yce.perfectcorp.com',
  perfectCorp: 'https://www.perfectcorp.com',
};
