export type SourceLink = {
  label: string;
  href: string;
};

export type EthereumOrg = {
  id: string;
  name: string;
  shortName: string;
  handle: string;
  website: string;
  twitter: string;
  logoDomain: string;
  accent: string;
  category: string;
  stage: string;
  role: string;
  summary: string;
  evidence: string[];
  workstreams: string[];
  watch: string[];
  sources: SourceLink[];
};

export const ethereumOrgs: EthereumOrg[] = [
  {
    id: "ethereum-foundation",
    name: "Ethereum Foundation",
    shortName: "EF",
    handle: "@ethereumfndn",
    website: "https://ethereum.foundation/",
    twitter: "https://x.com/ethereumfndn",
    logoDomain: "ethereum.foundation",
    accent: "#8B5CF6",
    category: "Original steward",
    stage: "Established steward",
    role: "Protocol values, ecosystem support, and long-horizon public goods.",
    summary:
      "The Ethereum Foundation is the long-running non-profit steward that supports protocol development, ecosystem growth, advocacy, Devcon, grants, and Ethereum-aligned public goods without controlling the network.",
    evidence: [
      "The EF describes itself as a non-profit that supports the Ethereum ecosystem as part of a larger community.",
      "Its current organization is being narrowed into focused clusters across protocol, access, user, community, institutional, operations, and management work.",
      "The EF philosophy emphasizes long-term thinking, subtraction, and stewardship of Ethereum values.",
    ],
    workstreams: [
      "Protocol layer hardening, upgrades, research, security, privacy, and censorship resistance.",
      "Access and user-layer work that keeps self-sovereign Ethereum use understandable and recoverable.",
      "Community, ecosystem support, Devcon, education, institutional standards, and external relationships.",
    ],
    watch: [
      "How the 2026 structure settles after the reorganization.",
      "Which work stays inside EF versus moving to independent ecosystem nodes.",
      "How EF coordinates with specialized orgs without becoming the single center of gravity.",
    ],
    sources: [
      { label: "Official site", href: "https://ethereum.foundation/" },
      { label: "What is the EF?", href: "https://ethereum.foundation/ef" },
      {
        label: "2026 structure",
        href: "https://blog.ethereum.org/2026/06/23/ef-structure",
      },
      {
        label: "EF philosophy",
        href: "https://ethereum.foundation/philosophy",
      },
    ],
  },
  {
    id: "ethlabs",
    name: "Ethlabs",
    shortName: "Ethlabs",
    handle: "@ethlabs_org",
    website: "https://ethlabs.org/",
    twitter: "https://x.com/ethlabs_org",
    logoDomain: "ethlabs.org",
    accent: "#E84142",
    category: "Protocol R&D",
    stage: "Announced Jun 2026",
    role: "Adoption-driven R&D for Ethereum and ETH.",
    summary:
      "Ethlabs is an independent non-profit R&D lab for Ethereum and ETH, built around making Ethereum the settlement layer of the global economy and translating real adoption needs into protocol work, standards, infrastructure, and shipped products.",
    evidence: [
      "The public thesis centers Ethereum as neutral settlement infrastructure for users, institutions, and agents.",
      "The founding team listed on the site includes Ansgar Dietrichs, Barnabe Monnot, Caspar Schwarz-Schilling, Josh Rudolf, and Julian Ma.",
      "Funding disclosures list Bitmine, Sharplink, and Joe Lubin as anchor funders, with additional ecosystem contributors and community supporters.",
    ],
    workstreams: [
      "Protocol and product translation between core devs, wallets, L2s, infrastructure teams, institutions, apps, ETH holders, and users.",
      "Open research around Ethereum adoption, ETH, neutral settlement, DeFi, and infrastructure readiness.",
      "Lean team-building around senior Ethereum research and development talent.",
    ],
    watch: [
      "The first public research agenda and concrete shipped artifacts.",
      "How funder accountability works without funder control over the roadmap.",
      "Where Ethlabs complements EF protocol work versus owning independent tracks.",
    ],
    sources: [
      { label: "Official site", href: "https://ethlabs.org/" },
      { label: "Thesis", href: "https://ethlabs.org/thesis.html" },
      { label: "Funding", href: "https://ethlabs.org/funding.html" },
      {
        label: "Launch coverage",
        href: "https://www.techtimes.com/articles/318906/20260623/ethereum-research-lab-ethlabs-launches-five-ef-alumni-target-15-minute-finality-problem.htm",
      },
    ],
  },
  {
    id: "ethereum-applications-guild",
    name: "Ethereum Applications Guild",
    shortName: "EAG",
    handle: "@EthAppsGuild",
    website: "https://gathering.ethappsguild.org/",
    twitter: "https://x.com/EthAppsGuild",
    logoDomain: "ethappsguild.org",
    accent: "#22C55E",
    category: "Application adoption",
    stage: "Initiated 2025, active 2026",
    role: "Real-world Ethereum application growth and sustainable builder funding.",
    summary:
      "EAG is a global non-profit collaborative organization focused on Ethereum-native applications, real-world impact, open co-creation, ecosystem partnerships, sustainable funding, and builder programs in emerging and underrepresented regions.",
    evidence: [
      "HashKey announced the EAG initiative at Token2049 in October 2025 with Vitalik Buterin and Dr. Xiao Feng as co-initiators.",
      "The 2026 site positions EAG as a global non-profit for innovation, adoption, and real-world impact of Ethereum-native applications.",
      "The Ethereum Applications Gathering took place in Hong Kong on April 22, 2026 with application-layer and institutional adoption programming.",
    ],
    workstreams: [
      "Application acceleration, open collaboration tools, ecosystem partnerships, shared evaluation frameworks, and public-goods-first funding.",
      "Membership fees, ETH staking-yield contribution pools, event sponsorship, and transparent funding flows.",
      "Regional builder programs across Africa, Oceania, Latin America, India, and other underserved regions.",
    ],
    watch: [
      "Which regional programs move from roadmap to recurring local communities.",
      "How contribution-pool funding is governed and allocated.",
      "Whether EAG produces applications with durable real users rather than event-only momentum.",
    ],
    sources: [
      { label: "Official site", href: "https://www.ethappsguild.org/" },
      {
        label: "Global initiatives",
        href: "https://www.ethappsguild.org/global",
      },
      {
        label: "Gathering 2026",
        href: "https://gathering.ethappsguild.org/",
      },
      {
        label: "Origin announcement",
        href: "https://www.prnewswire.com/news-releases/vitalik-buterin-and-dr-xiao-feng-jointly-initiate-ethereum-applications-guild-eag-calling-on-global-builders-to-co-create-a-new-paradigm-for-collaboration-302573791.html",
      },
    ],
  },
  {
    id: "ethereum-economic-zone",
    name: "Ethereum Economic Zone",
    shortName: "EEZ",
    handle: "@etheconomiczone",
    website: "https://eez.io/",
    twitter: "https://x.com/etheconomiczone",
    logoDomain: "eez.io",
    accent: "#F59E0B",
    category: "Composability infrastructure",
    stage: "Launched Mar 2026",
    role: "Synchronous composability across Ethereum L1 and compatible L2s.",
    summary:
      "EEZ is an initiative to make Ethereum feel like one ecosystem again by reducing liquidity fragmentation and enabling synchronous composability across L1 and L2 environments using real-time zero-knowledge proving.",
    evidence: [
      "The launch post frames EEZ as an L1-to-L2 framework rather than another isolated L2 framework.",
      "Gnosis and Zisk are founding contributors, with Ethereum Foundation funding and Jordi Baylina's Zisk proving stack named as core technical infrastructure.",
      "The public alliance names founding members and contributors including Aave, Titan, Beaver Build, Centrifuge, and xStocks.",
    ],
    workstreams: [
      "Real-time ZK proving fast enough to support atomic cross-environment interactions.",
      "Shared liquidity, ETH as default gas, and bridge-free user experiences across compatible networks.",
      "Open-source specifications, benchmarks, developer tooling, and ecosystem integrations.",
    ],
    watch: [
      "The promised technical architecture, protocol specs, and performance benchmarks.",
      "Which rollups or protocols commit to real integrations.",
      "Whether the architecture can preserve Ethereum neutrality while reducing fragmentation.",
    ],
    sources: [
      { label: "Official site", href: "https://eez.io/" },
      {
        label: "Launch post",
        href: "https://eez.io/blog/introducing-the-eez",
      },
      {
        label: "External coverage",
        href: "https://www.coindesk.com/tech/2026/03/29/new-ethereum-project-aims-to-fix-network-fragmentation-and-improve-user-experience",
      },
      {
        label: "Technical coverage",
        href: "https://thedefiant.io/news/blockchains/gnosis-and-zisk-unveil-ethereum-economic-zone-framework",
      },
    ],
  },
  {
    id: "argot",
    name: "Argot Collective",
    shortName: "Argot",
    handle: "@argotorg",
    website: "https://www.argot.org/",
    twitter: "https://x.com/argotorg",
    logoDomain: "argot.org",
    accent: "#38BDF8",
    category: "Compiler and tooling public goods",
    stage: "Formed 2024, incorporated 2025",
    role: "Independent home for Solidity and Ethereum developer tooling.",
    summary:
      "Argot is a self-governed collective of engineers and researchers maintaining Solidity and open-source compiler tooling, while also housing language, verification, debugging, and source-code verification projects.",
    evidence: [
      "Argot describes itself as the largest spin-out of the Ethereum Foundation and an independent non-profit stewarding core programming languages and developer tooling.",
      "Its projects include Solidity, Fe, Sourcify, ethdebug, Act, and hevm.",
      "The 2026 roadmap reports work on Solidity SSA-CFG, stack-too-deep fixes, Core Solidity, ethdebug, Act, Fe, Sourcify, and Clear Signing.",
    ],
    workstreams: [
      "Solidity compiler maintenance, releases, SSA-CFG backend stabilization, and future Core Solidity work.",
      "Formal verification and execution tooling through Act and hevm.",
      "Sourcify, ethdebug, Fe, transparency reporting, diversified funding, and open governance.",
    ],
    watch: [
      "Solidity SSA-CFG moving out of experimental mode.",
      "Whether Argot diversifies funding beyond EF while preserving neutrality.",
      "The cadence and substance of six-month transparency and roadmap reports.",
    ],
    sources: [
      { label: "Official site", href: "https://www.argot.org/" },
      {
        label: "Roadmap 2026",
        href: "https://www.argot.org/blog/2026-07-01-argot-roadmap-update-2026-2",
      },
      {
        label: "EF funding update",
        href: "https://www.argot.org/blog/2026-06-30-ef-funding-final-part",
      },
      {
        label: "Transparency report",
        href: "https://www.argot.org/reports/transparency-report-2025",
      },
    ],
  },
  {
    id: "ethereum-institutional",
    name: "Ethereum Institutional",
    shortName: "EI",
    handle: "@ethereuminsti",
    website: "https://www.ethereuminstitutional.org/",
    twitter: "https://x.com/ethereuminsti",
    logoDomain: "ethereuminstitutional.org",
    accent: "#F97316",
    category: "Institutional adoption",
    stage: "Announced Jul 2026",
    role: "Neutral institutional front door for Ethereum, L2s, apps, and the broader ecosystem.",
    summary:
      "Ethereum Institutional is an independent non-profit founded by the Ethereum Foundation enterprise team to help banks, asset managers, market infrastructure firms, public institutions, and other large organizations evaluate and build on Ethereum.",
    evidence: [
      "The official site defines the organization as an independent non-profit for institutional adoption of Ethereum, L2s, applications, and the broader ecosystem.",
      "The team page names David Walsh, Marius Smith, and Matthew Dawson, with explicit roots in the EF enterprise function.",
      "Its FAQ positions the group as separate from the EF and different from Ethlabs: institutional demand generation and engagement versus technical execution.",
    ],
    workstreams: [
      "Institutional education and engagement across banks, asset managers, custodians, fintechs, market infrastructure, and sovereign institutions.",
      "Neutral research, ETH and ecosystem marketing, industry requirements discovery, and institutional events.",
      "Routing institutional needs back to standards, builders, infrastructure providers, L2s, and application teams.",
    ],
    watch: [
      "Early research output and named institutional participation.",
      "How the org coordinates with Ethlabs, Etherealize, EEA, EF, and app-layer teams.",
      "Whether it remains a neutral front door rather than a vendor or consulting channel.",
    ],
    sources: [
      {
        label: "Official site",
        href: "https://www.ethereuminstitutional.org/",
      },
      {
        label: "FAQ and team",
        href: "https://www.ethereuminstitutional.org/#FAQ",
      },
      {
        label: "Launch coverage",
        href: "https://www.coindesk.com/tech/2026/07/01/ethereum-gets-a-new-nonprofit-focused-on-institutional-adoption",
      },
    ],
  },
];

export const roleMap = [
  {
    label: "Stewardship",
    description: "Values, grants, public goods, long-horizon coordination",
    orgIds: ["ethereum-foundation"],
  },
  {
    label: "Protocol adoption",
    description:
      "R&D that turns real demand into Ethereum upgrades and standards",
    orgIds: ["ethlabs"],
  },
  {
    label: "Applications",
    description: "Builder networks, emerging markets, funding, real users",
    orgIds: ["ethereum-applications-guild"],
  },
  {
    label: "Unified liquidity",
    description:
      "Cross-L1/L2 synchronous composability and shared infrastructure",
    orgIds: ["ethereum-economic-zone"],
  },
  {
    label: "Developer base layer",
    description:
      "Solidity, compilers, verification, debugging, source verification",
    orgIds: ["argot"],
  },
  {
    label: "Institutions",
    description: "Banks, asset managers, market infrastructure, public sector",
    orgIds: ["ethereum-institutional"],
  },
];

export const sourceTrail: SourceLink[] = [
  { label: "EF official site", href: "https://ethereum.foundation/ef" },
  {
    label: "EF new structure",
    href: "https://blog.ethereum.org/2026/06/23/ef-structure",
  },
  { label: "Ethlabs thesis", href: "https://ethlabs.org/thesis.html" },
  { label: "Ethlabs funding", href: "https://ethlabs.org/funding.html" },
  { label: "EAG official site", href: "https://www.ethappsguild.org/" },
  {
    label: "EAG global initiatives",
    href: "https://www.ethappsguild.org/global",
  },
  { label: "EAG Gathering", href: "https://gathering.ethappsguild.org/" },
  { label: "EEZ launch post", href: "https://eez.io/blog/introducing-the-eez" },
  {
    label: "Argot roadmap",
    href: "https://www.argot.org/blog/2026-07-01-argot-roadmap-update-2026-2",
  },
  {
    label: "Argot transparency",
    href: "https://www.argot.org/reports/transparency-report-2025",
  },
  {
    label: "Ethereum Institutional",
    href: "https://www.ethereuminstitutional.org/",
  },
  {
    label: "Ethereum Institutional coverage",
    href: "https://www.coindesk.com/tech/2026/07/01/ethereum-gets-a-new-nonprofit-focused-on-institutional-adoption",
  },
];
