import type { TreasuryQuoteSymbol } from "@/lib/treasury-quotes";

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

export type EthTreasuryCompany = {
  id: string;
  name: string;
  shortName: string;
  exchange: string;
  ticker: TreasuryQuoteSymbol;
  priceUrl: string;
  handle: string;
  website: string;
  twitter: string;
  logoDomain: string;
  treasuryRole: string;
  ecosystemConnection: string;
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
    id: "protocol-guild",
    name: "Protocol Guild",
    shortName: "PG",
    handle: "@ProtocolGuild",
    website: "https://www.protocolguild.org/",
    twitter: "https://x.com/ProtocolGuild",
    logoDomain: "protocolguild.org",
    accent: "#E5E7EB",
    category: "Core contributor funding",
    stage: "Pilot May 2022, entity 2024",
    role: "Onchain funding and vesting for Ethereum L1 R&D maintainers.",
    summary:
      "Protocol Guild is a peer-managed collective and funding mechanism for Ethereum core protocol contributors, maintaining an eligibility framework, member registry, and onchain donation contracts so ecosystem funding can flow directly to the people sustaining Ethereum L1 research, development, testing, and coordination.",
    evidence: [
      "The official site describes Protocol Guild as the leading independent funding organization for Ethereum core developers, focused on securing the future of Ethereum core development.",
      "The documentation defines three core components: an eligibility framework, a member registry, and onchain donation contracts, while stating that donations do not affect protocol stewardship decisions.",
      "Membership and donation docs describe self-curation by active contributors, quarterly onchain weight updates, one-year vesting contracts for donations, and the 1% Protocol Guild Pledge for token projects.",
    ],
    workstreams: [
      "Maintaining the eligibility framework and self-curated registry for Ethereum L1 R&D maintainers across client implementations, upgrade delivery, research, testing, and coordination.",
      "Operating donation, vesting, pass-through wallet, and split-contract infrastructure across Ethereum mainnet and major L2s.",
      "Growing sustainable funding norms through the Protocol Guild Pledge, donor outreach, annual reporting, legal operations, and public dashboards.",
    ],
    watch: [
      "Whether funding remains diversified enough to avoid reliance on a narrow set of donors or one-off pledge events.",
      "How accurately the member registry tracks the evolving set of Ethereum core protocol contributors as teams and roadmap priorities change.",
      "How Protocol Guild preserves credible neutrality while accepting large ecosystem and institutional donations.",
    ],
    sources: [
      { label: "Official site", href: "https://www.protocolguild.org/" },
      { label: "Docs", href: "https://protocol-guild.readthedocs.io/" },
      {
        label: "Membership",
        href: "https://protocol-guild.readthedocs.io/en/latest/01-membership.html",
      },
      {
        label: "Donate and pledge",
        href: "https://protocol-guild.readthedocs.io/en/latest/03-donate.html",
      },
      {
        label: "Entity and operations",
        href: "https://protocol-guild.readthedocs.io/en/latest/04-entity-%26-operations.html",
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
    id: "pbs-foundation",
    name: "PBS Foundation",
    shortName: "PBSF",
    handle: "@PBS_Foundation",
    website: "https://pbs.foundation/",
    twitter: "https://x.com/PBS_Foundation",
    logoDomain: "pbs.foundation",
    accent: "#0EA5E9",
    category: "PBS and MEV public goods",
    stage: "Set up Sep 2023",
    role: "Research, grants, and neutral infrastructure for Ethereum PBS and MEV markets.",
    summary:
      "PBS Foundation is an independent non-profit supporting a healthy proposer-builder separation ecosystem for Ethereum through grants, research coordination, neutral infrastructure support, market transparency, and improvements to out-of-protocol MEV mechanisms such as mev-boost.",
    evidence: [
      "The official site describes PBS Foundation as a non-profit for a healthy Ethereum PBS ecosystem with stable infrastructure and fair MEV markets.",
      "A July 2024 introduction says PBSF was set up on September 15, 2023 as an independent non-profit initiative supporting Ethereum proposer-builder-separation research collaboration.",
      "Independent coverage reported an initial $1 million grants program backed by Coinbase, Consensys, Fenbushi Capital, Flashbots, Paradigm, Uniswap Foundation, and Vitalik Buterin.",
    ],
    workstreams: [
      "Grantmaking for PBS, mev-boost, data transparency, community education, research, and neutral infrastructure.",
      "Support for independent and credibly neutral infrastructure such as mev-boost relays and relay-market experimentation.",
      "Research coordination around builder concentration, order-flow access, relay trust assumptions, enshrined PBS, L2 PBS, and competitive MEV market design.",
    ],
    watch: [
      "Whether PBSF can keep funding independent of dominant builders, relays, validators, and order-flow sources.",
      "How research outputs translate into practical improvements for mev-boost, relay diversity, or future enshrined PBS designs.",
      "How PBSF avoids duplicating Ethereum Foundation research while still acting as a neutral coordination point for contentious MEV topics.",
    ],
    sources: [
      { label: "Official site", href: "https://pbs.foundation/" },
      {
        label: "Intro to PBSF",
        href: "https://simbro.medium.com/intro-to-the-pbs-foundation-488423453628",
      },
      {
        label: "Grant launch coverage",
        href: "https://blockworks.com/news/grant-funding-for-ethereum-decentralization",
      },
      {
        label: "Supported research",
        href: "https://ethresear.ch/t/incentives-of-builder-multiplexing-in-pbs/22239",
      },
      {
        label: "Bitwise donation",
        href: "https://www.prnewswire.com/news-releases/bitwise-donating-100-000-from-ethw-profits-to-ethereum-open-source-developers-302704971.html",
      },
    ],
  },
  {
    id: "lido-labs-foundation",
    name: "Lido Labs Foundation",
    shortName: "Lido Labs",
    handle: "@LidoFinance",
    website: "https://lido.fi/",
    twitter: "https://x.com/LidoFinance",
    logoDomain: "lido.fi",
    accent: "#00A3FF",
    category: "Ethereum staking infrastructure",
    stage: "Approved Jan 2025",
    role: "Lido on Ethereum protocol R&D, maintenance, governance, and node-operator support.",
    summary:
      "Lido Labs Foundation is a Lido-DAO-approved Cayman Islands foundation company that researches, develops, deploys, and helps maintain the Lido on Ethereum protocol, with work spanning Lido V3, stVaults, Dual Governance, protocol security, node-operator tooling, and DAO operations.",
    evidence: [
      "A June 2026 Lido governance post describes Lido Labs Foundation as approved by Lido DAO on January 30, 2025 and funded through the Ecosystem Grant gRequest.",
      "The establishment proposal defines purposes including Lido on Ethereum protocol R&D, canonical contracts and applications, node-operator documentation, DAO governance processes, and staking ecosystem collaboration.",
      "The 2025 EGG request sought funding through December 31, 2025 for protocol R&D, Lido V3 implementation, Dual Governance development, security research, and Lido protocol maintenance.",
    ],
    workstreams: [
      "Protocol research, smart contracts, oracles, services, audits, test suites, Lido V3, stVaults, and maintenance of Lido on Ethereum.",
      "Governance and operations infrastructure including Dual Governance, Snapshot and Aragon processes, Easy Track, DAO transaction execution, and committee or multisig oversight.",
      "Node-operator and validator-set work across the Node Operator Portal, Community Staking Module, DVT and permissionless participation research, documentation, and grants.",
    ],
    watch: [
      "How Lido balances product growth with Ethereum validator-set decentralization and stake-concentration risk.",
      "Whether DAO-approved budgets, board updates, multisig reports, and EGG reporting keep foundation operations accountable to LDO governance.",
      "How Lido Labs coordinates with Lido Ecosystem Foundation and Lido Alliance BORG without concentrating too much operational authority outside token-holder review.",
    ],
    sources: [
      {
        label: "Lido Labs background",
        href: "https://research.lido.fi/t/lido-labs-proposes-nemo-as-a-new-director/11624",
      },
      {
        label: "Establishment proposal",
        href: "https://research.lido.fi/t/establishment-of-lido-labs-borg-foundation-as-a-lido-dao-adjacent-foundation/9344",
      },
      {
        label: "2025 EGG request",
        href: "https://research.lido.fi/t/egg-lido-labs-borg-foundation-grant-funding-request/9708",
      },
      { label: "Lido opportunities", href: "https://lido.fi/opportunities" },
      {
        label: "GOOSE-3 proposal",
        href: "https://research.lido.fi/t/lido-labs-goose-3-lido-s-next-chapter/10927",
      },
    ],
  },
  {
    id: "nomic-foundation",
    name: "Nomic Foundation",
    shortName: "Nomic",
    handle: "@NomicFoundation",
    website: "https://nomic.foundation/",
    twitter: "https://x.com/NomicFoundation",
    logoDomain: "nomic.foundation",
    accent: "#EAB308",
    category: "Developer platform public goods",
    stage: "Announced Feb 2022",
    role: "Open-source Ethereum developer environment, runtime, and compiler tooling.",
    summary:
      "Nomic Foundation is a non-profit Ethereum developer-platform organization that maintains Hardhat and builds reusable open-source infrastructure such as Slang and EDR, with a mandate to improve developer experience and reduce Ethereum's dependence on any single team for core tooling.",
    evidence: [
      "The official site describes Nomic Foundation as a non-profit advancing the Ethereum ecosystem through open-source engineering software for developers.",
      "The February 2022 launch announcement says Nomic Labs became Nomic Foundation, took over Hardhat and Nomic Labs' open engineering projects, and launched with Ethereum ecosystem backing.",
      "Current project pages list Hardhat, Slang, and EDR as active developer-platform work spanning smart contract development, Solidity compiler APIs, and reusable EVM runtime infrastructure.",
    ],
    workstreams: [
      "Hardhat development environment work across testing, deployment, debugging, coverage, plugins, and the Hardhat 3 migration path.",
      "EDR runtime work for reusable EVM tooling primitives, local simulation, JSON-RPC behavior, tracing, coverage, and Solidity test execution.",
      "Slang compiler APIs for full-fidelity Solidity parsing and downstream code analysis, editor, linting, and tooling use cases.",
    ],
    watch: [
      "Hardhat 3 adoption and the migration path for projects still anchored on Hardhat 2.",
      "Whether Slang and EDR become shared building blocks beyond Nomic-maintained tools.",
      "How Nomic sustains diversified public-goods funding while coordinating with EF, Argot, and Dev Tools Guild.",
    ],
    sources: [
      { label: "Official site", href: "https://nomic.foundation/" },
      {
        label: "Launch announcement",
        href: "https://blog.nomic.foundation/introducing-the-nomic-foundation-an-ethereum-public-goods-organization-31012af67df9/",
      },
      { label: "Hardhat", href: "https://hardhat.org/" },
      { label: "Slang", href: "https://github.com/NomicFoundation/slang" },
      { label: "EDR", href: "https://github.com/NomicFoundation/edr" },
    ],
  },
  {
    id: "wevm",
    name: "Wevm",
    shortName: "Wevm",
    handle: "@wevm_dev",
    website: "https://wevm.dev/",
    twitter: "https://x.com/wevm_dev",
    logoDomain: "wevm.dev",
    accent: "#FACC15",
    category: "Ethereum TypeScript tooling",
    stage: "Active 2023-present",
    role: "Open-source TypeScript libraries and frameworks for Ethereum applications.",
    summary:
      "Wevm is an independent collective building open-source TypeScript tooling for Ethereum developers, including Viem, Wagmi, ABIType, and Ox, with a focus on typed clients, application frameworks, contract interfaces, and reusable frontend infrastructure.",
    evidence: [
      "The official site describes Wevm as a collective building open-source TypeScript software used by hundreds of enterprise organizations and millions of developers.",
      "Its public GitHub organization frames the work as TypeScript tools for Ethereum and lists active repositories including Viem, Wagmi, Ox, Vocs, and ABIType.",
      "Project docs position Viem as a TypeScript interface for Ethereum and Wagmi as reactive primitives for Ethereum applications, with Wagmi built on Viem.",
    ],
    workstreams: [
      "Viem and Ox libraries for typed Ethereum clients, JSON-RPC abstractions, ABI utilities, smart contract interaction, and low-level Ethereum primitives.",
      "Wagmi frontend primitives, connectors, and framework adapters for Ethereum app accounts, wallets, contracts, transactions, signing, ENS, and caching.",
      "ABIType, documentation infrastructure, contributor workflows, sponsors, and supporting TypeScript tools used across Ethereum application stacks.",
    ],
    watch: [
      "Sponsor and maintainer sustainability for libraries that many wallets, apps, and infrastructure teams depend on.",
      "How Wevm tracks protocol, wallet, L2, account abstraction, and standards changes without fragmenting developer APIs.",
      "Coordination with Dev Tools Guild, Nomic, Argot, and application teams around shared developer-tooling priorities.",
    ],
    sources: [
      { label: "Official site", href: "https://wevm.dev/" },
      { label: "GitHub", href: "https://github.com/wevm" },
      { label: "Viem", href: "https://viem.sh/" },
      { label: "Wagmi", href: "https://wagmi.sh/" },
      { label: "ABIType", href: "https://abitype.dev/" },
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
    id: "dev-tools-guild",
    name: "Dev Tools Guild",
    shortName: "DTG",
    handle: "@devtoolsguild",
    website: "https://devtoolsguild.xyz/",
    twitter: "https://x.com/devtoolsguild",
    logoDomain: "devtoolsguild.xyz",
    accent: "#14B8A6",
    category: "Developer tooling funding",
    stage: "Pilot launched Jun 2025",
    role: "Collective funding and coordination for Ethereum developer tooling maintainers.",
    summary:
      "Dev Tools Guild is a Protocol-Guild-inspired collective funding mechanism and coordination layer for widely used Ethereum developer tooling, sustaining the projects and individuals who maintain critical libraries, compilers, and frameworks while bridging protocol developers and application-layer builders.",
    evidence: [
      "The official intro describes DTG as uniting Ethereum developer tool projects to collectively fund members and projects and boost coordination between protocol and dev tools developers.",
      "Coordinated by founder Conor Svensson (author of the Web3j Java integration library) and Andrew B Coathup (former Week in Ethereum News editor), starting with a one-year pilot from June 2025.",
      "Initial member projects announced at launch include Solidity, Vyper, ethers.js, viem, alloy, Nethereum, Web3j, web3.py, Foundry, Scaffold-ETH, Ape, and Sourcify.",
    ],
    workstreams: [
      "Collective funding for developer tooling projects and individual maintainers, with donations routed to donate.devtoolsguild.eth on Ethereum mainnet, Arbitrum, Base, and Optimism.",
      "Coordination between protocol developers and application-layer builders through roadmap sharing, protocol-change awareness, and cross-project knowledge exchange.",
      "Visibility and accountability across dev-tools projects through progress tracking, community updates, and public communications.",
    ],
    watch: [
      "Whether the one-year pilot converts into a durable funding entity with diversified donors and a stable member registry.",
      "How DTG membership evolves across both projects and individual maintainers, and how eligibility is curated over time.",
      "How DTG coordinates with Protocol Guild, Argot, and EF ecosystem support without duplicating scope.",
    ],
    sources: [
      { label: "Official site", href: "https://devtoolsguild.xyz/" },
      { label: "Introduction", href: "https://devtoolsguild.xyz/intro" },
      { label: "FAQs", href: "https://devtoolsguild.xyz/faq" },
      {
        label: "Launch announcement",
        href: "https://devtoolsguild.xyz/blog/devtoolsguild-launch",
      },
      { label: "GitHub", href: "https://github.com/devtoolsguild" },
    ],
  },
  {
    id: "enterprise-ethereum-alliance",
    name: "Enterprise Ethereum Alliance",
    shortName: "EEA",
    handle: "@EntEthAlliance",
    website: "https://entethalliance.org/",
    twitter: "https://x.com/EntEthAlliance",
    logoDomain: "entethalliance.org",
    accent: "#5B7CFA",
    category: "Enterprise standards",
    stage: "Launched Feb 2017",
    role: "Enterprise Ethereum standards, education, and cross-industry coordination.",
    summary:
      "The Enterprise Ethereum Alliance is a member-led non-profit trade organization connecting Ethereum, L2s, and enterprises through education, standardization, working groups, technical resources, and enterprise adoption coordination.",
    evidence: [
      "The official about page describes EEA as a non-profit trade organization bridging Ethereum, Layer 2 solutions, and enterprises through education, standardization, and collaboration.",
      "The February 28, 2017 launch post says EEA was formed to build, promote, and support Ethereum-based best practices, standards, and reference architecture for enterprise-grade Ethereum.",
      "Current working-group and GitHub pages show active standards and adoption work across privacy, cross-chain interoperability, technical specifications, reports, and public repositories.",
    ],
    workstreams: [
      "Member coordination across enterprises, L2s, Ethereum organizations, financial institutions, vendors, universities, and public-good groups.",
      "Open enterprise standards, implementation guides, best practices, specifications, primers, webinars, surveys, and reports.",
      "Working groups for privacy, cross-chain interoperability, security, DeFi risk, and enterprise requirements feeding into Ethereum technical standards.",
    ],
    watch: [
      "Whether working-group output turns into production Ethereum and L2 deployments rather than staying at the report layer.",
      "How EEA coordinates with Ethereum Institutional, Etherealize, EEI, EF, and member companies while staying neutral and standards-focused.",
      "How much enterprise work remains open, Ethereum-aligned, and connected to public Ethereum infrastructure versus private or permissioned systems.",
    ],
    sources: [
      { label: "Official site", href: "https://entethalliance.org/" },
      {
        label: "About and mission",
        href: "https://entethalliance.org/about-enterprise-ethereum-alliance/",
      },
      {
        label: "2017 launch",
        href: "https://entethalliance.org/enterprise-ethereum-alliance-launches/",
      },
      {
        label: "Working groups",
        href: "https://entethalliance.org/eea-groups/",
      },
      {
        label: "GitHub",
        href: "https://github.com/EntEthAlliance",
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
  {
    id: "etherealize",
    name: "Etherealize",
    shortName: "Etherealize",
    handle: "@Etherealize_io",
    website: "https://www.etherealize.com/",
    twitter: "https://x.com/Etherealize_io",
    logoDomain: "etherealize.com",
    accent: "#8B5CF6",
    category: "Institutional infrastructure",
    stage: "Launched Jan 2025",
    role: "Institutional trading, tokenization, settlement, and privacy infrastructure on Ethereum.",
    summary:
      "Etherealize is a company building Ethereum-based products, research, and go-to-market infrastructure for Wall Street, with work across tokenized assets, Ethereum-native settlement, institutional privacy, policy engagement, and education for banks and asset managers.",
    evidence: [
      "The official site says Etherealize is building the rails to move Wall Street onto Ethereum, with tokenization, Ethereum-native settlement engines, and institutional-grade privacy environments.",
      "Its about and product pages describe meetings with banks, asset managers, sovereigns, and hedge funds, Washington engagement, tokenized asset issuance and settlement, automated execution, instant settlement, and zk privacy.",
      "A September 2025 company announcement reports a $40 million round led by Electric Capital and Paradigm, plus a 2024 grant from Vitalik Buterin and the Ethereum Foundation to start institutional education work.",
    ],
    workstreams: [
      "Institutional education, research, content, and market narrative around ETH, Ethereum L2s, tokenized assets, stablecoins, and Ethereum as financial infrastructure.",
      "Product development for tokenized asset workflows, settlement engines, compliant privacy environments, and institutional-grade applications.",
      "Wall Street and policy engagement across banks, asset managers, payment networks, the SEC, Treasury, Congress, and Ethereum ecosystem builders.",
    ],
    watch: [
      "Which products move from public thesis and fundraising into production systems used by institutions.",
      "How Etherealize coordinates with Ethereum Institutional, EEI, EF, and L2/app teams while remaining an investor-backed product company.",
      "Whether institutional privacy and compliance work preserves Ethereum's open, neutral, and self-custodial properties.",
    ],
    sources: [
      { label: "Official site", href: "https://www.etherealize.com/" },
      { label: "About", href: "https://www.etherealize.com/about" },
      { label: "Product", href: "https://www.etherealize.com/product" },
      { label: "Content", href: "https://www.etherealize.com/content" },
      {
        label: "Funding announcement",
        href: "https://www.globenewswire.com/news-release/2025/09/03/3143712/0/en/Etherealize-Raises-40-Million-to-Rewire-Wall-Street-s-Infrastructure-with-Ethereum.html",
      },
    ],
  },
  {
    id: "ethereum-community-foundation",
    name: "Ethereum Community Foundation",
    shortName: "ECF",
    handle: "@ethcforg",
    website: "https://ethcf.org/",
    twitter: "https://x.com/ethcforg",
    logoDomain: "ethcf.org",
    accent: "#60A5FA",
    category: "ETH-aligned public infrastructure",
    stage: "Launched 2025",
    role: "Token-free infrastructure, transparency tooling, and ETH-holder-aligned public goods.",
    summary:
      "The Ethereum Community Foundation is an Ethereum-aligned organization building token-free public infrastructure that strengthens ETH, with work spanning transparency dashboards, proof-of-burn grant experiments, blob tooling, and validator coordination.",
    evidence: [
      "The official site describes ECF as building token-free public infrastructure that strengthens ETH and benefits ETH holders.",
      "Glassbox is presented as an open-source transparency dashboard for Ethereum-based DAOs and foundations, showing onchain activity around treasury movement, grants, and transactions.",
      "ECF says it created and funded the Ethereum Validators Association to give validators a coordinated voice around protocol, economics, research, and operations.",
    ],
    workstreams: [
      "BETH and proof-of-burn grant experiments for builders creating ETH-aligned applications and infrastructure.",
      "BlobKit, EIPN, Glassbox, transparency dashboards, and other public infrastructure projects.",
      "Validator coordination through EVA, including research, signaling, standards, and forum programming.",
    ],
    watch: [
      "Whether BETH and proof-of-burn grants lead to durable public goods rather than one-off incentives.",
      "How ECF governance, treasury activity, and grants remain transparent as the scope grows.",
      "How the validator coordination track interacts with core development without becoming a narrow stakeholder lobby.",
    ],
    sources: [
      { label: "Official site", href: "https://ethcf.org/" },
      { label: "Blog", href: "https://ethcf.org/blog/" },
      { label: "Glassbox", href: "https://ethcf.org/blog/glassbox/" },
      { label: "BlobKit", href: "https://ethcf.org/blog/blobkit/" },
      {
        label: "Ethereum Validators Association",
        href: "https://blog.ethcf.org/blog/eva/",
      },
    ],
  },
  {
    id: "european-ethereum-institute",
    name: "European Ethereum Institute",
    shortName: "EEI",
    handle: "@EuEthInstitute",
    website: "https://ethereum.institute/",
    twitter: "https://x.com/EuEthInstitute",
    logoDomain: "ethereum.institute",
    accent: "#1C1CF5",
    category: "European policy advocacy",
    stage: "Launched Mar 2026",
    role: "European policy advocacy for Ethereum as open, permissionless public infrastructure.",
    summary:
      "The European Ethereum Institute is a Brussels-based advocacy organization focused on shaping EU regulation for open, permissionless, decentralized applications and positioning Ethereum as neutral public infrastructure for Europe's digital and financial future.",
    evidence: [
      "The official site describes EEI as an advocacy organization based in Brussels that supports EU regulation for open, permissionless decentralized applications, SMEs, and innovative CASPs.",
      "Its EthCC[9] launch event says EUCI evolved into the European Ethereum Institute after six years of EU policy work, with a focus on Ethereum as neutral public infrastructure.",
      "The site positions EEI as an industry body giving dedicated attention to decentralized use cases, with policy submissions to the European Commission, EDPB, FCA, and Bank of England.",
    ],
    workstreams: [
      "Policy submissions, consultation responses, and position papers across eIDAS, GDPR anonymization, open-source policy, DeFi, staking, and stablecoins.",
      "Policymaker education through EEIpedia, Ethereum public-infrastructure explainers, library resources, dictionary entries, and institutional reference material.",
      "Events, workshops, and forums connecting policymakers, regulators, central banks, Ethereum builders, DeFi teams, and financial institutions.",
    ],
    watch: [
      "Whether EU programs and regulatory frameworks begin to recognize Ethereum as open public infrastructure.",
      "How EEI keeps an Ethereum-specific voice while coordinating with broader crypto trade groups and institutional adoption organizations.",
      "How its governance, supporters, and policy positions remain transparent as the organization grows beyond the EUCI transition.",
    ],
    sources: [
      { label: "Official site", href: "https://ethereum.institute/" },
      { label: "Team and mission", href: "https://ethereum.institute/team" },
      { label: "Advocacy", href: "https://ethereum.institute/advocacy" },
      {
        label: "Launch event",
        href: "https://ethereum.institute/events/ethcc-eei-launch",
      },
      {
        label: "Ethereum as infrastructure",
        href: "https://ethereum.institute/learn-about-ethereum#ethereum-as-infrastructure",
      },
    ],
  },
];

export const ethTreasuryCompanies: EthTreasuryCompany[] = [
  {
    id: "sharplink",
    name: "SharpLink",
    shortName: "SBET",
    exchange: "NASDAQ",
    ticker: "SBET",
    priceUrl: "https://www.google.com/finance/quote/SBET:NASDAQ",
    handle: "@SharpLink",
    website: "https://www.sharplink.com/",
    twitter: "https://x.com/SharpLink",
    logoDomain: "sharplink.com",
    treasuryRole:
      "Public ETH treasury platform focused on staking, custody, and ETH-per-share growth.",
    ecosystemConnection:
      "Consensys and Joe Lubin-backed treasury strategy; named anchor funder of Ethlabs and Ethereum Institutional.",
    sources: [
      { label: "Investors", href: "https://www.sharplink.com/investors" },
      {
        label: "Treasury launch",
        href: "https://www.globenewswire.com/news-release/2025/05/27/3088575/0/en/sharplink-gaming-announces-425-000-000-private-placement-to-initiate-ethereum-treasury-strategy.html",
      },
    ],
  },
  {
    id: "bitmine",
    name: "BitMine",
    shortName: "BMNR",
    exchange: "NYSE",
    ticker: "BMNR",
    priceUrl: "https://www.google.com/finance/quote/BMNR:NYSE",
    handle: "@BitMNR",
    website: "https://www.bitminetech.io/",
    twitter: "https://x.com/BitMNR",
    logoDomain: "bitminetech.io",
    treasuryRole:
      "ETH treasury company pursuing its Alchemy of 5% strategy and operating MAVAN staking infrastructure.",
    ecosystemConnection:
      "Named anchor funder of Ethlabs and Ethereum Institutional; frames itself as a bridge between Ethereum and Wall Street.",
    sources: [
      {
        label: "Investor relations",
        href: "https://www.bitminetech.io/investor-relations",
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
    label: "Core contributor funding",
    description:
      "Onchain funding, vesting, and registry infrastructure for Ethereum L1 maintainers",
    orgIds: ["protocol-guild"],
  },
  {
    label: "Protocol adoption",
    description:
      "R&D that turns real demand into Ethereum upgrades and standards",
    orgIds: ["ethlabs"],
  },
  {
    label: "Staking infrastructure",
    description:
      "Liquid staking, validator-set decentralization, governance, and node-operator support",
    orgIds: ["lido-labs-foundation"],
  },
  {
    label: "Block building and MEV",
    description:
      "PBS, mev-boost, relay health, market transparency, and neutral infrastructure",
    orgIds: ["pbs-foundation"],
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
    label: "Developer platform",
    description:
      "Open-source smart contract development environments, runtimes, and compiler APIs",
    orgIds: ["nomic-foundation"],
  },
  {
    label: "Developer base layer",
    description:
      "Solidity, compilers, verification, debugging, source verification",
    orgIds: ["argot"],
  },
  {
    label: "Developer tooling",
    description:
      "Application libraries, frameworks, SDKs, and collective funding coordination",
    orgIds: ["wevm", "dev-tools-guild"],
  },
  {
    label: "Institutions",
    description:
      "Banks, asset managers, enterprise standards, market infrastructure, public sector",
    orgIds: [
      "enterprise-ethereum-alliance",
      "ethereum-institutional",
      "etherealize",
    ],
  },
  {
    label: "Policy and regulation",
    description:
      "EU policy advocacy, regulator education, Ethereum public-infrastructure framing",
    orgIds: ["european-ethereum-institute"],
  },
  {
    label: "ETH-aligned public goods",
    description:
      "Token-free infrastructure, transparent funding, burn-aligned grants, validator coordination",
    orgIds: ["ethereum-community-foundation"],
  },
];

export const sourceTrail: SourceLink[] = [
  { label: "EF official site", href: "https://ethereum.foundation/ef" },
  {
    label: "EF new structure",
    href: "https://blog.ethereum.org/2026/06/23/ef-structure",
  },
  { label: "Protocol Guild site", href: "https://www.protocolguild.org/" },
  {
    label: "Protocol Guild docs",
    href: "https://protocol-guild.readthedocs.io/",
  },
  {
    label: "Protocol Guild funding",
    href: "https://protocol-guild.readthedocs.io/en/latest/03-donate.html",
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
  { label: "PBS Foundation", href: "https://pbs.foundation/" },
  {
    label: "PBSF intro",
    href: "https://simbro.medium.com/intro-to-the-pbs-foundation-488423453628",
  },
  {
    label: "PBSF grant launch",
    href: "https://blockworks.com/news/grant-funding-for-ethereum-decentralization",
  },
  {
    label: "Lido Labs background",
    href: "https://research.lido.fi/t/lido-labs-proposes-nemo-as-a-new-director/11624",
  },
  {
    label: "Lido Labs establishment",
    href: "https://research.lido.fi/t/establishment-of-lido-labs-borg-foundation-as-a-lido-dao-adjacent-foundation/9344",
  },
  {
    label: "Lido Labs EGG",
    href: "https://research.lido.fi/t/egg-lido-labs-borg-foundation-grant-funding-request/9708",
  },
  { label: "Nomic official site", href: "https://nomic.foundation/" },
  {
    label: "Nomic launch",
    href: "https://blog.nomic.foundation/introducing-the-nomic-foundation-an-ethereum-public-goods-organization-31012af67df9/",
  },
  { label: "Hardhat", href: "https://hardhat.org/" },
  { label: "Wevm official site", href: "https://wevm.dev/" },
  { label: "Wevm GitHub", href: "https://github.com/wevm" },
  { label: "Viem", href: "https://viem.sh/" },
  {
    label: "Argot roadmap",
    href: "https://www.argot.org/blog/2026-07-01-argot-roadmap-update-2026-2",
  },
  {
    label: "Argot transparency",
    href: "https://www.argot.org/reports/transparency-report-2025",
  },
  { label: "Dev Tools Guild site", href: "https://devtoolsguild.xyz/" },
  { label: "Dev Tools Guild intro", href: "https://devtoolsguild.xyz/intro" },
  {
    label: "Dev Tools Guild launch",
    href: "https://devtoolsguild.xyz/blog/devtoolsguild-launch",
  },
  {
    label: "EEA about",
    href: "https://entethalliance.org/about-enterprise-ethereum-alliance/",
  },
  {
    label: "EEA working groups",
    href: "https://entethalliance.org/eea-groups/",
  },
  {
    label: "EEA privacy report",
    href: "https://entethalliance.org/enterprise-ethereum-finally-has-a-privacy-playbook/",
  },
  {
    label: "Ethereum Institutional",
    href: "https://www.ethereuminstitutional.org/",
  },
  {
    label: "Ethereum Institutional coverage",
    href: "https://www.coindesk.com/tech/2026/07/01/ethereum-gets-a-new-nonprofit-focused-on-institutional-adoption",
  },
  { label: "Etherealize official site", href: "https://www.etherealize.com/" },
  { label: "Etherealize product", href: "https://www.etherealize.com/product" },
  {
    label: "Etherealize funding",
    href: "https://www.globenewswire.com/news-release/2025/09/03/3143712/0/en/Etherealize-Raises-40-Million-to-Rewire-Wall-Street-s-Infrastructure-with-Ethereum.html",
  },
  { label: "ECF official site", href: "https://ethcf.org/" },
  { label: "ECF Glassbox", href: "https://ethcf.org/blog/glassbox/" },
  {
    label: "ECF validator association",
    href: "https://blog.ethcf.org/blog/eva/",
  },
  { label: "EEI official site", href: "https://ethereum.institute/" },
  { label: "EEI advocacy", href: "https://ethereum.institute/advocacy" },
  {
    label: "EEI launch",
    href: "https://ethereum.institute/events/ethcc-eei-launch",
  },
];
