/**
 * Résumé content: the résumé's wording (minus the phone number, which stays off the web), plus the
 * education details, visiting role and publications from LinkedIn. Edit here; the /resume page renders it.
 */

export type Degree = {
  degree: string;
  dates: string;
  grade: string;
  bullets: string[];
  activities?: string;
};

export type Publication = {
  title: string;
  url?: string;
  venue: string;
  when: string;
};

export type Role = {
  org: string;
  orgUrl?: string;
  /** A product named inside the title, linked to its site. */
  product?: { name: string; url: string };
  place?: string;
  title: string;
  dates: string;
  bullets: string[];
};

export const RESUME = {
  name: 'Jui-Hung (Ray) Kao',
  title: 'Software Engineer',
  location: 'Taipei, Taiwan',
  summary:
    "Nearly three years as core developer on YouCam Online Editor at Perfect Corp — the company's only browser-based product, an AI photo and video editing platform in React and Next.js, grown from roughly 10 editing tools to 80+ across 17 locales. Worked from rendering performance to the backend boundary: SSE streaming, asynchronous task architecture, payment integrations, and the data layers beneath them. Earlier co-founded a startup and, as sole developer, built its full-stack web product end to end.",

  experience: [
    {
      org: 'Perfect Corp. (NYSE: PERF)',
      orgUrl: 'https://www.perfectcorp.com',
      product: { name: 'YouCam Online Editor', url: 'https://yce.perfectcorp.com' },
      place: 'New Taipei City, Taiwan',
      title: 'Frontend Engineer, YouCam Online Editor',
      dates: 'January 2024 – October 2026',
      bullets: [
        "Architected the frontend from scratch for the AI Agent, a conversational editing assistant launched with ~80 task-run features in its first two months: SSE response streaming, a capability handshake that tells the backend which features the client supports, async task polling, and a cancel flow that works at every stage of a reply and is restored from history on reload. Led integration across product, AI engine, backend, and Beauty SDK teams.",
        "Built the editor's Fabric.js canvas interactions from day one: drag, resize, and rotate, snapping with alignment guides, and zoom and pan, powering the editing tools, undo/redo, image export, and the AI Agent's in-browser task execution.",
        'Proposed and designed a new performance architecture for video history: IntersectionObserver-gated media loading and debounced hover playback cut first-load video bandwidth ~95%, so media downloads scale with the viewport rather than history length; a follow-on pass replaced O(n²) result merging with Set-based dedup, cut detail API calls 85% with an LRU cache, and cut re-renders 95% via batched store updates, Redux selectors and React.memo.',
        "Owned the platform's entire generation-history and gallery data layer across nine Redux stores: a shared cursor paginator with two-hour caching, concurrency locking and token-refresh retry, incremental head-and-tail sync that surfaces results from other devices without a full refetch, and a chunked detail pipeline with main-thread yielding.",
        'Delivered the asynchronous video generation architecture for Image-to-Video and Text-to-Video: fire-and-forget dispatch backed by IndexedDB polling queues, a global cross-page task monitor, and running/success/failure recovery that survives browser refresh.',
        'Built the customized Stripe checkout for the US market with product selection, coupon logic, PayPal via 2Checkout, and 50/50 A/B testing; moved several editing tools onto the Pro/Plus/Free subscription model with configuration-driven feature gating and credit metering; and extended the B2B API dashboard with subscription and pay-as-you-go status and usage record tables.',
        'Shipped core AI editing features end to end: Photo Enhance with an image-type classifier routing Photo/Anime/Text modes, Pro-gated 2x/4x upscaling and combination-keyed result caching; AI Photo Repair; hairstyle recommendations matched to the style catalog by on-device face classification with fuzzy fallback; and an Image Converter with client-side HEIC/HEIF/WEBP/BMP support.',
        'Automated release and growth workflows: an i18n pipeline processing ~1,000 strings per release, cutting hours of manual work to seconds; 15+ Strapi CMS-backed landing pages; and SEO gains via GA4 instrumentation, heading structure, and canonical links.',
      ],
    },
  ] as Role[],

  startups: [
    {
      org: 'Dafuon (Startup Matching Platform)',
      title: 'Product Lead',
      dates: 'October 2022 – June 2023',
      bullets: [
        'Led a cross-functional team to reposition the product from an entrepreneurship learning platform into a startup team matching service, owning its web application architecture, and partnered with an NTHU CS professor to embed it in his startup courses so student cohorts formed teams through it. Ministry of Education funded, several hundred registered users.',
      ],
    },
    {
      org: 'Tripbook (Campus Tour Web App)',
      title: 'Co-Founder and Full-Stack Developer',
      dates: 'April 2022 – October 2022',
      bullets: [
        "As the sole developer, built and shipped a geofenced web app on Ruby on Rails, PostgreSQL, and Redis, adopted by NTHU's CS department for all freshmen: visiting all 8 campus spots earned course credit, with 3 randomized cards from a 100+ pool delivered on each entry. 100+ registrations on launch day, 40% of users earned credit within the first month, and infrastructure scaled to 40k peak requests with PaaS, load balancing, caching, and CDN.",
      ],
    },
  ] as Role[],

  skills: [
    ['Languages', 'JavaScript (ES6+), TypeScript, Ruby, HTML5, CSS3, SCSS, SQL, Solidity; familiar with Python and Go'],
    ['Frameworks and Libraries', 'React.js, Next.js, Redux, Redux Toolkit, Node.js, Ruby on Rails, Fabric.js, Strapi'],
    ['Frontend Engineering', 'Server-Sent Events, Web Workers, IndexedDB, RESTful APIs, performance profiling, state management, async task orchestration, i18n, SEO'],
    ['Platforms and Tools', 'Git, Docker, AWS (S3, CloudFront), Stripe, Firebase, Google Analytics 4, Figma'],
    ['AI Development', 'Claude Code, GitHub Copilot'],
    ['Practices', 'Test-driven development (TDD), spec-driven development (SDD), Agile/Scrum'],
    ['Databases', 'PostgreSQL, SQLite, Redis'],
    ['Spoken Languages', 'Mandarin (native), English (professional, TOEIC 865)'],
  ] as [string, string][],

  academic: [
    {
      org: 'Tsinghua University',
      title: 'Visiting Student',
      dates: 'July 2018 – August 2018',
      bullets: ['Independent research with scholarship and accommodation'],
    },
  ] as Role[],

  education: {
    school: 'National Tsing Hua University',
    place: 'Hsinchu, Taiwan',
    degrees: [
      {
        degree: 'M.S. in Computer Science',
        dates: 'September 2020 – July 2023',
        grade: 'GPA 4.18/4.30',
        bullets: [
          '3 years of research on blockchain and applied cryptography',
          'Published “Preventing Financial Statement Fraud with Blockchain-based Verifiable Accounting System” at IEEE ICECCME 2023',
        ],
        activities: 'Table tennis',
      },
      {
        degree: 'B.S. in Computer Science, Minor in Quantitative Finance',
        dates: 'September 2016 – June 2020',
        grade: 'GPA 3.75/4.30 (84.83%)',
        bullets: ['2 years of independent research on blockchain technology and applications'],
      },
    ] as Degree[],
  },

  publications: [
    {
      title: 'Preventing Financial Statement Fraud with Blockchain-based Verifiable Accounting System',
      url: 'https://doi.org/10.1109/ICECCME57830.2023.10252842',
      venue: 'IEEE International Conference on Electrical, Computer, Communications, and Mechatronics Engineering (ICECCME)',
      when: 'July 19–21, 2023 · Santa Cruz de Tenerife, Spain',
    },
    {
      title: 'Enhancing Transparency and Trust in Accounting with Triple-Entry Transactions and Digital Signatures in a Blockchain-based AIS Approach',
      venue: 'International Conference on Information, Management, and Knowledge Community',
      when: 'May 26, 2023 · Taipei, Taiwan',
    },
    {
      title: 'Designing A Compact Convolutional Neural Network Processor on Embedded FPGAs',
      venue: 'VLSI Design/CAD Symposium',
      when: 'August 3–6, 2021 · Virtual',
    },
  ] as Publication[],
};
