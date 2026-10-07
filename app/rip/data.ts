export type ShutdownProject = {
  id: string;
  name: string;
  category: string;
  status: "Closed" | "Winding down" | "Product retired";
  announced?: string;
  dateKind?: "Reporting";
  closed?: string;
  dateNote?: string;
  summary: string;
  reason: string;
  website?: string;
  social?: string;
  logo?: string;
  logoBackground?: string;
  logoFrame?: {
    left: number;
    top: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
  };
  sources: { label: string; url: string; kind: "Primary" | "Reporting" }[];
};

export const archiveReviewedAt = "2026-10-07";

export const shutdownProjects: ShutdownProject[] = [
  {
    id: "poap",
    name: "POAP",
    category: "NFTs",
    status: "Winding down",
    announced: "2026-08-03",
    dateNote:
      "Maintenance mode began March 16, with existing issuers retaining access. The August wind-down announcement gives no final cutoff for hosted tools; existing collectibles remain onchain.",
    summary:
      "Proof of Attendance Protocol created digital mementos for events and communities. Its co-founder announced the company would wind down after more than five years.",
    reason:
      "Crypto funding and distribution dynamics made a sustainable business difficult without compromising the project's ethos.",
    website: "https://poap.xyz",
    social: "https://x.com/poapxyz",
    logo: "/external/rip/poap.jpg",
    sources: [
      {
        label: "Co-founder wind-down announcement",
        url: "https://x.com/izonline/status/2084273977938080092",
        kind: "Primary",
      },
      {
        label: "Official maintenance-mode notice",
        url: "https://x.com/poapxyz/status/2032182456481202614",
        kind: "Primary",
      },
    ],
  },
  {
    id: "balancer",
    name: "Balancer",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-09-14",
    closed: "2026-11-30",
    dateNote:
      "Wind-down approved September 29. Applicable pools become withdrawals-only October 30; extended v3 pools stop trading with the November 30 Vault pause. Withdrawals remain available, unpausable pools may continue, and treasury distribution and entity closures extend beyond the trading sunset.",
    summary:
      "Automated market maker whose DAO approved a phased protocol sunset and distribution of its treasury to BAL holders.",
    reason:
      "Restructuring failed to produce sustained revenue growth; v3 did not replace v2 revenue, and the 2025 exploit further hindered traction.",
    website: "https://balancer.fi",
    social: "https://x.com/Balancer",
    logo: "/external/rip/balancer.png",
    sources: [
      {
        label: "BIP-928 wind-down plan",
        url: "https://forum.balancer.fi/t/bip-928-orderly-winddown-of-balancer-and-distribution-of-the-treasury/7107",
        kind: "Primary",
      },
      {
        label: "Approved vote and execution update",
        url: "https://forum.balancer.fi/t/bip-928-orderly-winddown-of-balancer-and-distribution-of-the-treasury/7107/23",
        kind: "Primary",
      },
    ],
  },
  {
    id: "dango",
    name: "Dango",
    category: "Trading",
    status: "Closed",
    announced: "2026-07-24",
    closed: "2026-08-13",
    dateNote: "Trading halted July 29; L1 stop date given as August 13.",
    summary:
      "Perpetual trading and its L1 network wound down after failing to find a lasting commercial path.",
    reason: "No viable path to lasting commercial success.",
    social: "https://x.com/dango",
    logo: "/external/rip/dango.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/dango/status/2080707796144705625",
        kind: "Primary",
      },
    ],
  },
  {
    id: "odos",
    name: "Odos",
    category: "Trading",
    status: "Closed",
    announced: "2026-07-23",
    closed: "2026-07-30",
    summary:
      "The operating company wound down; the swap app became read-only July 27 and services ended July 30.",
    reason: "Not specified in the announcement.",
    website: "https://odos.xyz",
    social: "https://x.com/odosprotocol",
    logo: "/external/rip/odos.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/odosprotocol/status/2080337624922018014",
        kind: "Primary",
      },
    ],
  },
  {
    id: "ctrl-wallet",
    name: "Ctrl Wallet",
    category: "Wallets",
    status: "Closed",
    announced: "2026-07-07",
    closed: "2026-08-03",
    summary:
      "The wallet ended sending, receiving, swaps and dApp connections; recovery phrase export remains available.",
    reason: "Not specified in the announcement.",
    social: "https://x.com/Ctrl_Wallet",
    logo: "/external/rip/ctrl-wallet.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/Ctrl_Wallet/status/2074310251378270343",
        kind: "Primary",
      },
    ],
  },
  {
    id: "ionic-protocol",
    name: "Ionic Protocol",
    category: "DeFi",
    status: "Closed",
    announced: "2026-06-18",
    closed: "2026-06-18",
    summary:
      "The lending protocol ceased operations immediately following the effects of its 2025 exploit.",
    reason: "Consequences of the 2025 exploit.",
    social: "https://x.com/ionicmoney",
    logo: "/external/rip/ionic-protocol.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/ionicmoney/status/2067518110635016213",
        kind: "Primary",
      },
    ],
  },
  {
    id: "soundness-labs",
    name: "Soundness Labs",
    category: "Infrastructure",
    status: "Winding down",
    announced: "2026-06-18",
    dateNote: "Closure announced; exact service shutdown date not specified.",
    summary:
      "The ZK and post-quantum wallet infrastructure team closed while retaining its public repositories.",
    reason:
      "A working product but a market not ready for coordinated post-quantum migration.",
    website: "https://github.com/SoundnessLabs",
    social: "https://x.com/SoundnessLabs",
    logo: "/external/rip/soundness-labs.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/SoundnessLabs/status/2067492901886796006",
        kind: "Primary",
      },
    ],
  },
  {
    id: "swellchain",
    name: "Swellchain",
    category: "Networks",
    status: "Product retired",
    announced: "2026-06-16",
    closed: "2026-06-23",
    dateNote: "This entry covers Swellchain, not every Swell product.",
    summary:
      "The Swell L2 began shutting down, asking users to bridge all assets off before June 23.",
    reason: "Not specified in the linked notice.",
    social: "https://x.com/swellnetworkio",
    logo: "/external/rip/swellchain.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/swellnetworkio/status/2067031459731570952",
        kind: "Primary",
      },
    ],
  },
  {
    id: "satori-finance",
    name: "Satori Finance",
    category: "Trading",
    status: "Closed",
    announced: "2026-06-16",
    closed: "2026-07-16",
    dateNote: "Platform ceased operating after July 16, 23:59 UTC.",
    summary:
      "The derivatives platform wound down with a month-long withdrawal and position-closing window.",
    reason:
      "Revenue could not sustain operations in prolonged unfavorable market conditions.",
    social: "https://x.com/SatoriFinance",
    logo: "/external/rip/satori-finance.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/SatoriFinance/status/2066909927973740797",
        kind: "Primary",
      },
    ],
  },
  {
    id: "fishing-frenzy-uncharted",
    name: "Fishing Frenzy / Uncharted",
    category: "Gaming",
    status: "Closed",
    announced: "2026-06-15",
    closed: "2026-06-25",
    dateNote: "Servers shut down June 25 at 02:00 UTC.",
    summary:
      "The game and studio ceased operations, redistributed liquidity and published a Karma snapshot.",
    reason:
      "Could not establish product-market-business fit after testing multiple directions.",
    social: "https://x.com/FishingFrenzyCo",
    logo: "/external/rip/fishing-frenzy-uncharted.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/FishingFrenzyCo/status/2066376668357566509",
        kind: "Primary",
      },
    ],
  },
  {
    id: "botanix",
    name: "Botanix",
    category: "Networks",
    status: "Winding down",
    announced: "2026-06-09",
    dateNote:
      "July 9 asset withdrawal deadline; notice does not give a separate sequencer stop time.",
    summary:
      "The Bitcoin-based network wound down after its utility thesis failed to establish a sustainable market.",
    reason:
      "Bitcoin utility market timing and lack of a sustainable path after years of building.",
    social: "https://x.com/BotanixLabs",
    logo: "/external/rip/botanix.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/BotanixLabs/status/2064420116578590941",
        kind: "Primary",
      },
    ],
  },
  {
    id: "hyli",
    name: "Hyli",
    category: "Networks",
    status: "Winding down",
    announced: "2026-06-10",
    dateNote: "Closure announced; exact service shutdown date not specified.",
    summary:
      "The team closed the ZK blockchain project before a viable launch, leaving its code open source.",
    reason:
      "ZK adoption and market conditions did not support a viable launch.",
    website: "https://github.com/hyli-org",
    social: "https://x.com/hyli_org",
    logo: "/external/rip/hyli.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/hyli_org/status/2064678967035224555",
        kind: "Primary",
      },
    ],
  },
  {
    id: "syndicate-labs",
    name: "Syndicate Labs",
    category: "Infrastructure",
    status: "Winding down",
    announced: "2026-05-21",
    dateNote:
      "This concerns Syndicate Labs; network and token consequences are covered in the source thread.",
    summary:
      "The onchain developer infrastructure company announced its wind-down.",
    reason: "The rollup market fundamentally shifted.",
    social: "https://x.com/syndicateio",
    logo: "/external/rip/syndicate-labs.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/syndicateio/status/2057291537860706672",
        kind: "Primary",
      },
    ],
  },
  {
    id: "phi",
    name: "Phi",
    category: "Social",
    status: "Closed",
    announced: "2026-05-04",
    closed: "2026-05-25",
    summary:
      "The onchain identity project wound down after four years; phi.box and related services went offline May 25.",
    reason: "Not specified in the announcement.",
    website: "https://phi.box",
    social: "https://x.com/phi_xyz",
    logo: "/external/rip/phi.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/phi_xyz/status/2051182324080083227",
        kind: "Primary",
      },
    ],
  },
  {
    id: "carrot",
    name: "Carrot",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-04-30",
    dateNote: "Exact service shutdown date not stated in this source.",
    summary:
      "The yield project announced it was shutting down after the Drift exploit damaged continued operations.",
    reason: "The Drift exploit was catastrophic for continued operations.",
    social: "https://x.com/DeFiCarrot",
    logo: "/external/rip/carrot.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/DeFiCarrot/status/2049907092664762624",
        kind: "Primary",
      },
    ],
  },
  {
    id: "luckio",
    name: "Luckio",
    category: "Gaming",
    status: "Winding down",
    announced: "2026-04-24",
    dateNote: "Exact closure date not stated.",
    summary:
      "The onchain casino announced closure and directed players to withdraw funds from Smart Vaults.",
    reason: "Not specified in the announcement.",
    website: "https://luck.io",
    social: "https://x.com/luckio",
    logo: "/external/rip/luckio.png",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/luckio/status/2047642254681231545",
        kind: "Primary",
      },
    ],
  },
  {
    id: "mint-blockchain",
    name: "Mint Blockchain",
    category: "Networks",
    status: "Closed",
    announced: "2026-04-17",
    closed: "2026-04-17",
    summary:
      "The NFT-oriented blockchain officially ceased operations and directed users to withdraw assets.",
    reason: "Not specified in the announcement.",
    social: "https://x.com/Mint_Blockchain",
    logo: "/external/rip/mint-blockchain.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/Mint_Blockchain/status/2044980026819617147",
        kind: "Primary",
      },
    ],
  },
  {
    id: "megaphone",
    name: "Megaphone",
    category: "Social",
    status: "Closed",
    announced: "2026-04-12",
    dateNote:
      "Already offline by the date of the statement; exact earlier closure date unspecified.",
    summary:
      "Contribution Labs stated that Megaphone was no longer operating and customer campaign data was handed off.",
    reason: "Not specified in the announcement.",
    social: "https://x.com/megaphone_hq",
    logo: "/external/rip/megaphone.png",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/megaphone_hq/status/2043224242054217793",
        kind: "Primary",
      },
    ],
  },
  {
    id: "intergaze",
    name: "Intergaze",
    category: "NFTs",
    status: "Winding down",
    announced: "2026-04-03",
    dateNote:
      "Bridge closing planned 14 days after April 3 announcement; NFT migration expected in May.",
    summary:
      "The NFT rollup wound down and closed its bridge after a 14-day withdrawal window; NFTs were scheduled to migrate to Stargaze.",
    reason: "Not specified in the announcement.",
    website: "https://forum.initia.xyz/t/intergaze-rollup-wind-down-notice/432",
    social: "https://x.com/intergaze_xyz",
    logo: "/external/rip/intergaze.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/intergaze_xyz/status/2039881751170818227",
        kind: "Primary",
      },
    ],
  },
  {
    id: "leap-wallet",
    name: "Leap Wallet",
    category: "Wallets",
    status: "Closed",
    announced: "2026-04-02",
    closed: "2026-05-28",
    summary:
      "Leap sunset its wallet apps, Compass Wallet, WebApp, Swapfast, Cosmos validator and Snaps.",
    reason: "Not specified in the announcement.",
    website: "https://leapwallet.io",
    social: "https://x.com/leap_wallet",
    logo: "/external/rip/leap-wallet.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/leap_wallet/status/2039729267685376026",
        kind: "Primary",
      },
    ],
  },
  {
    id: "yupp",
    name: "Yupp",
    category: "AI",
    status: "Closed",
    announced: "2026-03-31",
    closed: "2026-04-15",
    dateNote:
      "April 15 is derived from the 15-day website availability window.",
    summary:
      "The AI model comparison app ended sign-ups and new chats March 31, leaving 15 days to export data.",
    reason: "Not specified in the announcement.",
    website: "https://yupp.ai",
    social: "https://x.com/pankaj",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/pankaj/status/2039010092255969712",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/yupp.png",
  },
  {
    id: "milkyway-l1",
    name: "MilkyWay L1",
    category: "Networks",
    status: "Product retired",
    announced: "2026-03-26",
    dateNote:
      "Official shutdown notice dated March 26; no exact earlier chain stop date stated.",
    summary:
      "The team completed a chain upgrade and returned assets to canonical chains before shutting the L1 down.",
    reason: "Not specified in the announcement.",
    social: "https://x.com/milky_way_zone",
    logo: "/external/rip/milkyway-l1.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/milky_way_zone/status/2037020332775923746",
        kind: "Primary",
      },
    ],
  },
  {
    id: "remora-markets",
    name: "Remora Markets",
    category: "DeFi",
    status: "Closed",
    announced: "2026-02-23",
    closed: "2026-02-23",
    summary:
      "The tokenized stock platform wound down immediately and prepared a USDC redemption process for backed rTokens.",
    reason:
      "Unable to continue sustainably after events impacting parent Step Finance.",
    social: "https://x.com/RemoraMarkets",
    logo: "/external/rip/remora-markets.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/RemoraMarkets/status/2025986960938995937",
        kind: "Primary",
      },
    ],
  },
  {
    id: "parsec",
    name: "Parsec",
    category: "Analytics",
    status: "Winding down",
    announced: "2026-02-19",
    dateNote: "Closure announced; exact service shutdown date not specified.",
    summary:
      "The onchain analytics platform announced closure after five years.",
    reason: "Not specified in the announcement.",
    social: "https://x.com/parsec_finance",
    logo: "/external/rip/parsec.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/parsec_finance/status/2024519983330468049",
        kind: "Primary",
      },
    ],
  },
  {
    id: "polynomial-chain-trade",
    name: "Polynomial Chain & Trade",
    category: "Trading",
    status: "Product retired",
    announced: "2026-02-13",
    dateNote:
      "The company later rebranded; this entry covers the retired Polynomial products.",
    summary:
      "Polynomial announced it was shutting down its chain and trading platform.",
    reason: "Not stated in the opening announcement.",
    social: "https://x.com/OpenstockInc",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/OpenstockInc/status/2022344918111494169",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/polynomial-chain-trade.png",
  },
  {
    id: "fireplace",
    name: "Fireplace",
    category: "Prediction markets",
    status: "Closed",
    announced: "2026-08-10",
    closed: "2026-09-30",
    dateNote:
      "Trading ended August 15, 2026 (site notice captured in source screenshot). Site access for withdrawals, position management and exports ended September 30 at 23:59 UTC.",
    summary: "Professional trading terminal for prediction markets.",
    reason:
      "The team announced closure without stating a cause in its shutdown post.",
    website: "https://pro.fireplace.gg",
    social: "https://x.com/fireplacegg",
    logo: "/external/rip/fireplace.jpg",
    sources: [
      {
        label: "Official shutdown announcement",
        url: "https://x.com/fireplacegg/status/2086770360930734102",
        kind: "Primary",
      },
      {
        label: "Trading cutoff site screenshot",
        url: "https://x.com/nursexxl/status/2086841170068643871",
        kind: "Reporting",
      },
    ],
  },
  {
    id: "zapper",
    name: "Zapper",
    category: "Analytics",
    status: "Closed",
    announced: "2026-07-08",
    closed: "2026-08-03",
    summary:
      "The portfolio tracker, mobile apps and API services shut down after almost seven years.",
    reason:
      "The team evaluated alternatives and concluded an orderly wind-down was best.",
    website: "https://zapper.xyz",
    social: "https://x.com/sebaudet26",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/sebaudet26/status/2074918469376856150",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/zapper.png",
  },
  {
    id: "loopring-l2",
    name: "Loopring L2",
    category: "Networks",
    status: "Product retired",
    announced: "2026-07-03",
    dateNote:
      "Already shut down by the July 3 statement; exact earlier chain stop date unspecified.",
    summary:
      "Loopring L2 shut down; the team published a snapshot and Ethereum asset-return plan.",
    reason: "Not specified in the linked return-plan article.",
    social: "https://x.com/loopringorg",
    logo: "/external/rip/loopring-l2.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/loopringorg/status/2072987477405835340",
        kind: "Primary",
      },
    ],
  },
  {
    id: "sophon-chain",
    name: "Sophon Chain",
    category: "Networks",
    status: "Product retired",
    announced: "2026-06-25",
    dateNote: "The chain is retired; the studio and product pipeline continue.",
    summary:
      "Sophon sunset its ZK L2 and continued as Soph(+), a consumer app studio building on Base.",
    reason:
      "Operating a separate chain cost millions without delivering enough additional user value.",
    website: "https://sophon.com",
    social: "https://x.com/Sophon",
    logo: "/external/rip/sophon-chain.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/Sophon/status/2070192257295335800",
        kind: "Primary",
      },
    ],
  },
  {
    id: "ventuals",
    name: "Ventuals",
    category: "Trading",
    status: "Closed",
    announced: "2026-06-15",
    closed: "2026-06-18",
    dateNote:
      "Pre-IPO markets stopped June 15; commodity and index markets settled June 18. Export and withdrawal page maintained at least through September 15.",
    summary:
      "The private-company and asset derivatives platform settled and halted HIP-3 markets; the team joined another Hyperliquid project.",
    reason: "The team chose to join another team in the Hyperliquid ecosystem.",
    website: "https://app.ventuals.com/sunset",
    social: "https://x.com/ventuals",
    logo: "/external/rip/ventuals.png",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/ventuals/status/2066517389169025294",
        kind: "Primary",
      },
    ],
  },
  {
    id: "fantasy-top",
    name: "Fantasy.top",
    category: "Gaming",
    status: "Closed",
    announced: "2026-05-20",
    dateNote:
      "Announcement says end of June; main competitions through June 18 and website 7 days afterward. No exact final date asserted.",
    summary:
      "The social trading card platform ended after two years, with final competitions concluding in June.",
    reason:
      "Trading volume could not sustain the TCG model and adjacent experiments did not achieve durable fit.",
    social: "https://x.com/fantasy_top_",
    logo: "/external/rip/fantasy-top.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/fantasy_top_/status/2057120720799383935",
        kind: "Primary",
      },
    ],
  },
  {
    id: "legend",
    name: "Legend",
    category: "DeFi",
    status: "Closed",
    announced: "2026-05-12",
    closed: "2026-07-12",
    summary:
      "The mainstream DeFi app and company wound down after two years, keeping the app running for a 60-day exit period.",
    reason:
      "Audience growth fell below the scale needed for sustainable operations.",
    website: "https://legend.xyz/sunset",
    social: "https://x.com/jaysonhobby",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/jaysonhobby/status/2054253835003347306",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/legend.jpg",
  },
  {
    id: "opulous",
    name: "Opulous",
    category: "DeFi",
    status: "Closed",
    announced: "2026-04-15",
    closed: "2026-04-30",
    dateNote:
      "All services went offline April 30; user data deletion scheduled May 30.",
    summary:
      "The music finance project shut down all services and platforms after the Messina bridge exploit damaged the OPUL market.",
    reason:
      "Bridge exploit, exhausted market-making reserves and an unviable token relaunch.",
    website: "https://opulous.org",
    social: "https://x.com/opulousapp",
    logo: "/external/rip/opulous.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/opulousapp/status/2044409892237107327",
        kind: "Primary",
      },
    ],
  },
  {
    id: "angle-stablecoins",
    name: "Angle Protocol",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-03-04",
    closed: "2027-03-01",
    dateNote:
      "Active operations cease after March 1, 2027. The team continues work on Merkl.",
    summary:
      "The DAO approved an orderly wind-down of EURA and USDA, allowing a one-year redemption period.",
    reason:
      "Declining stablecoin activity, operational risk and a changed stablecoin market.",
    website: "https://www.angle.money",
    social: "https://x.com/AngleProtocol",
    logo: "/external/rip/angle-stablecoins.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/AngleProtocol/status/2029161525580112263",
        kind: "Primary",
      },
      {
        label: "Official redemption and wind-down notice",
        url: "https://www.angle.money/",
        kind: "Primary",
      },
    ],
  },
  {
    id: "pudgy-party",
    name: "Pudgy Party",
    category: "Gaming",
    status: "Product retired",
    announced: "2026-06-12",
    dateNote:
      "Source is the official announcement image; no service stop date given in it.",
    summary:
      "Pudgy Penguins wound down the mobile game and halted development to focus resources on Pudgy World.",
    reason: "The team chose Pudgy World as its flagship gaming product.",
    social: "https://x.com/PlayPudgyParty",
    logo: "/external/rip/pudgy-party.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/PlayPudgyParty/status/2065555998031384917",
        kind: "Primary",
      },
    ],
  },
  {
    id: "tally",
    name: "Tally",
    category: "DAO tooling",
    status: "Winding down",
    announced: "2026-03-17",
    dateNote:
      "Governance app begins winding down at end of March; interface remained available during enterprise transitions.",
    summary:
      "The DAO governance tooling company canceled its ICO and began an orderly closure.",
    reason:
      "Governance tooling had not become a viable venture-backed business at the needed scale.",
    social: "https://x.com/tallyxyz",
    logo: "/external/rip/tally.jpg",
    sources: [
      {
        label: "Official shutdown article",
        url: "https://x.com/tallyxyz/status/2033914203837280737",
        kind: "Primary",
      },
    ],
  },
  {
    id: "powerloom",
    name: "Powerloom",
    category: "Networks",
    status: "Closed",
    announced: "2026-06-15",
    closed: "2026-07-21",
    dateNote: "Permanent chain shutdown July 21 at 06:00 UTC.",
    summary:
      "The decentralized data infrastructure network completed its wind-down; hosted services ended June 16 and the chain permanently stopped July 21.",
    reason:
      "No sustainable operating model; founders could no longer personally fund operations.",
    website: "https://docs.powerloom.io/wind-down/timeline/",
    social: "https://x.com/Powerloom",
    logo: "/external/rip/powerloom.jpg",
    sources: [
      {
        label: "Official wind-down timeline",
        url: "https://docs.powerloom.io/wind-down/timeline/",
        kind: "Primary",
      },
      {
        label: "Founder announcement",
        url: "https://blog.powerloom.io/wind-down/",
        kind: "Primary",
      },
    ],
  },
  {
    id: "seamless-protocol",
    name: "Seamless Protocol",
    category: "DeFi",
    status: "Closed",
    announced: "2026-04-07",
    closed: "2026-07-01",
    dateNote:
      "Original timeline expected UI shutdown June 30; official July 10 governance proposal states UI actually went offline July 1.",
    summary:
      "Seamless completed its UI wind-down and later proposed retiring DAO permissions while preserving onchain withdrawals.",
    reason: "Product-market fit and sustainable liquidity challenges.",
    website:
      "https://seamlessprotocol.discourse.group/t/sip-treasury-wind-down-distribution-plan/987",
    social: "https://x.com/SeamlessFi",
    logo: "/external/rip/seamless-protocol.jpg",
    sources: [
      {
        label: "Official treasury wind-down proposal",
        url: "https://seamlessprotocol.discourse.group/t/sip-treasury-wind-down-distribution-plan/987",
        kind: "Primary",
      },
      {
        label: "Official DAO sunset proposal",
        url: "https://seamlessprotocol.discourse.group/t/sip-seamless-dao-sunset/988",
        kind: "Primary",
      },
    ],
  },
  {
    id: "magic-eden-wallet",
    name: "Magic Eden Wallet",
    category: "Wallets",
    status: "Product retired",
    announced: "2026-02-27",
    closed: "2026-05-01",
    dateNote:
      "Wallet support ended April 1; full shutdown planned May 1. Announcement date supported by reporting on the founder statement.",
    summary:
      "Magic Eden deprecated its wallet and Account Wallets; support and downloads ended April 1 before complete services shutdown May 1.",
    reason: "Strategic marketplace and wallet product changes.",
    website:
      "https://help.magiceden.io/en/articles/13885539-magic-eden-wallet-deprecation-overview",
    social: "https://x.com/MagicEden",
    sources: [
      {
        label: "Official wallet deprecation overview",
        url: "https://help.magiceden.io/en/articles/13885539-magic-eden-wallet-deprecation-overview",
        kind: "Primary",
      },
      {
        label: "Founder announcement reporting",
        url: "https://decrypt.co/359422/magic-eden-pulls-plug-bitcoin-ethereum-doubles-down-solana",
        kind: "Reporting",
      },
    ],
    dateKind: "Reporting",
    logo: "/external/rip/magic-eden-wallet.png",
  },
  {
    id: "code4rena",
    name: "Code4rena",
    category: "Security",
    status: "Winding down",
    announced: "2026-05-13",
    summary:
      "The competitive audit platform announced closure after five years while completing active contests and bounties.",
    reason: "Not specified in the official statement.",
    website: "https://code4rena.com",
    social: "https://x.com/code4rena",
    sources: [
      {
        label: "Official closure notice",
        url: "https://code4rena.com",
        kind: "Primary",
      },
      {
        label: "Shutdown announcement reporting",
        url: "https://www.theblock.co/news/regulation/2026-05-13-immufefi-absorb-code4rena-bug-bounty-customers-shutdown-decision-401179",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/code4rena.png",
  },
  {
    id: "nifty-gateway",
    name: "Nifty Gateway",
    category: "NFTs",
    status: "Closed",
    announced: "2026-01-23",
    dateNote:
      "Initial platform close date February 23; January 27 update extended asset migration through April 23 and promised continued help afterward.",
    summary:
      "The NFT marketplace entered withdrawal-only mode and wound down; the asset migration deadline was later extended to April 23.",
    reason: "Gemini chose to focus on its broader super-app vision.",
    website:
      "https://www.blog.niftygateway.com/blog/announcing-nifty-gateways-closure",
    social: "https://x.com/niftygateway",
    logo: "/external/rip/nifty-gateway.jpg",
    sources: [
      {
        label: "Original official closure announcement",
        url: "https://www.blog.niftygateway.com/blog/announcing-nifty-gateways-closure",
        kind: "Primary",
      },
      {
        label: "Official extended withdrawal deadline",
        url: "https://x.com/niftygateway/status/2016254238347891112",
        kind: "Primary",
      },
    ],
  },
  {
    id: "abstract",
    name: "Abstract",
    category: "Networks",
    status: "Winding down",
    announced: "2026-10-06",
    closed: "2026-12-15",
    dateNote:
      "Chain shutdown is scheduled for December 15, 2026. Announced October 6; funds must migrate before the chain stops.",
    summary:
      "Consumer-focused Ethereum L2 and Abstract Global Wallet ecosystem. The team announced a full chain wind-down.",
    reason:
      "The team cited a consumer-only chain model that became unsustainable, thin liquidity, restricted DeFi, limited institutional adoption, and a smaller budget.",
    website: "https://abs.xyz",
    social: "https://x.com/AbstractChain",
    logo: "/external/rip/abstract.jpg",
    sources: [
      {
        label: "Official wind-down article",
        url: "https://x.com/AbstractChain/status/2107554632675340420",
        kind: "Primary",
      },
    ],
  },
  {
    id: "blast",
    name: "Blast",
    category: "Networks",
    status: "Winding down",
    announced: "2026-10-02",
    dateNote:
      "October 26, 2026 is the normal interface withdrawal deadline, not a confirmed chain-stop date. Assets remain withdrawable directly through L1 bridge contracts afterward.",
    summary:
      "Ethereum L2 with native yield. The team announced it would wind the chain down and asked users to withdraw to Ethereum.",
    reason:
      "Chain maintenance costs exceeded L2 revenue, with no credible path to economic sustainability.",
    website: "https://blast.io",
    social: "https://x.com/blast",
    logo: "/external/rip/blast.jpg",
    sources: [
      {
        label: "Official shutdown announcement",
        url: "https://x.com/blast/status/2106032805280891073",
        kind: "Primary",
      },
    ],
  },
  {
    id: "trepa",
    name: "Trepa",
    category: "Prediction markets",
    status: "Closed",
    announced: "2026-08-10",
    closed: "2026-09-30",
    dateNote:
      "Final playable round: August 12. Referral and streak rewards: August 13. App withdrawal access ended September 30; email users were directed to Privy for recovery afterward.",
    summary:
      "Solana precision prediction market with sixty-second rounds, rewarding numerical accuracy rather than binary outcomes.",
    reason:
      "The founders cited lack of product-market fit, high cognitive load, weak distribution, retention friction, and concurrency dilution when expanding markets.",
    website: "https://trepa.io",
    social: "https://x.com/trepa_io",
    logo: "/external/rip/trepa.png",
    sources: [
      {
        label: "Official shutdown article",
        url: "https://x.com/trepa_io/status/2086748576483528920",
        kind: "Primary",
      },
    ],
  },
  {
    id: "oxium",
    name: "Oxium",
    category: "Trading",
    status: "Closed",
    announced: "2026-06-25",
    closed: "2026-08-01",
    dateNote:
      "The website interface closed August 1; the team said assets remained recoverable directly through smart contracts.",
    summary:
      "On-chain order-book exchange built on Sei. The team closed the trading interface and advised users to cancel orders, close positions, and withdraw.",
    reason:
      "Prolonged weak market conditions left revenue below operating costs.",
    website: "https://oxium.xyz",
    social: "https://x.com/oxiumxyz",
    logo: "/external/rip/oxium.jpg",
    sources: [
      {
        label: "Official shutdown announcement",
        url: "https://x.com/oxiumxyz/status/2070162907145330799",
        kind: "Primary",
      },
    ],
  },
  {
    id: "nftfi",
    name: "NFTfi",
    category: "NFTs",
    status: "Closed",
    announced: "2026-06-02",
    closed: "2026-08-31",
    dateNote:
      "The frontend and team operations ended. Existing loans can still be repaid or foreclosed directly onchain.",
    summary: "Peer-to-peer NFT-backed lending platform on Ethereum.",
    reason:
      "Shrinking NFT markets meant expected revenues no longer covered operating costs.",
    website: "https://app.nftfi.com",
    social: "https://x.com/NFTfi",
    sources: [
      {
        label: "Original announcement",
        url: "https://x.com/NFTfi/status/2061804810752409998",
        kind: "Primary",
      },
      {
        label: "Official wind-down repository",
        url: "https://github.com/NFTfi-Genesis/nftfi-wind-down",
        kind: "Primary",
      },
      {
        label: "Final shutdown notice",
        url: "https://app.nftfi.com/",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/nftfi.jpg",
  },
  {
    id: "0xppl",
    name: "0xPPL",
    category: "Social",
    status: "Closed",
    announced: "2026-06-02",
    closed: "2026-06-30",
    dateNote:
      "The official opening post confirms sunsetting; June 30 closure and June 6 trading disablement are reported by The Coinformer from the continuation of the official thread.",
    summary:
      "On-chain social and trading app spanning wallet tracking, cross-chain activity, token discovery, and trading. Built for four years.",
    reason:
      "The team said the market for an on-chain super app did not arrive on the timeline it needed.",
    website: "https://0xppl.com",
    social: "https://x.com/0xppl_",
    logo: "/external/rip/0xppl.png",
    sources: [
      {
        label: "Official wind-down announcement",
        url: "https://x.com/0xppl_/status/2061699111225561363",
        kind: "Primary",
      },
      {
        label: "Closure timeline reporting",
        url: "https://thecoinformer.com/news/balaji-backed-0xppl-shuts-down-after-failing-to-build-crypto-super-app",
        kind: "Reporting",
      },
    ],
  },
  {
    id: "charmverse",
    name: "CharmVerse",
    category: "DAO tooling",
    status: "Closed",
    announced: "2026-03-25",
    closed: "2026-04-30",
    dateNote:
      "Official team announcement states operations would shut April 30. A May 18 customer update confirms the platform had closed and grants moved away.",
    summary:
      "Collaborative workspace for DAO operations, proposals, grants, and community coordination.",
    reason: "The retrieved team announcement did not specify a reason.",
    website: "https://charmverse.io",
    social: "https://x.com/CharmVerse",
    logo: "/external/rip/charmverse.jpg",
    sources: [
      {
        label: "Official shutdown announcement",
        url: "https://x.com/CharmVerse/status/2036766170158674264",
        kind: "Primary",
      },
      {
        label: "Customer migration confirmation",
        url: "https://forum.celo.org/t/prezenti-grant-applications-have-moved-to-tally/13318",
        kind: "Primary",
      },
    ],
  },
  {
    id: "ranger-finance",
    name: "Ranger Finance",
    category: "Trading",
    status: "Winding down",
    announced: "2026-05-14",
    dateNote:
      "Founder announced wind-down May 14. No final service-stop date is specified in the retrieved statement. Users affected by the Drift exploit were told recovery tokens would follow Drift distributions.",
    summary:
      "Solana perpetuals aggregation and vault project. Its founder announced closure after funding and treasury problems.",
    reason:
      "Delayed funding, an unexpected tokenholder treasury liquidation, and the Drift exploit exhausted runway and founders' personal capital; some contributors and vendors remained unpaid.",
    website: "https://ranger.finance",
    social: "https://x.com/ranger_finance",
    sources: [
      {
        label: "Founder wind-down statement",
        url: "https://x.com/barrett_io/status/2055015245538832540",
        kind: "Primary",
      },
      {
        label: "Wind-down context",
        url: "https://solanafloor.com/news/ranger-finance-winds-down",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/ranger-finance.png",
  },
  {
    id: "buck",
    name: "Buck",
    category: "DeFi",
    status: "Closed",
    dateNote:
      "Exact announcement and final closure dates remain unverified. The official website now states the project shut and all token holders were repaid. Do not confuse BuckToken/buck.io with Sui Bucket Protocol.",
    summary:
      "Yield-bearing savings token backed by STRC and USDC. The current official website confirms closure and full return of holder funds.",
    reason:
      "The team described a voluntary wind-down to make room for its next project.",
    website: "https://buck.io",
    social: "https://x.com/BuckToken",
    sources: [
      {
        label: "Official closed-project notice",
        url: "https://www.buck.io/",
        kind: "Primary",
      },
      {
        label: "Team statement reproduced",
        url: "https://twstalker.com/BuckToken",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/buck.png",
  },
  {
    id: "ux-chain",
    name: "UX Chain",
    category: "Networks",
    status: "Winding down",
    announced: "2026-04-01",
    dateNote:
      "April 1 is the reporting date. A full May 15 shutdown was planned, but governance proposals continued through July; May 15 must not be represented as verified chain-stop. Original team post is now unavailable.",
    summary:
      "Cosmos lending blockchain formerly Umee, with a protocol liquidation and chain wind-down plan.",
    reason:
      "Funding shortfall; reporting said UX reserves and treasury would cover protocol deficits.",
    website: "https://ux.xyz",
    social: "https://x.com/ux_xyz",
    sources: [
      {
        label: "Shutdown timeline reporting",
        url: "https://www.techflowpost.com/en-US/newsletter/118603",
        kind: "Reporting",
      },
      {
        label: "Later governance record",
        url: "https://ux.valopers.com/proposals",
        kind: "Primary",
      },
      {
        label: "Original team announcement (unavailable)",
        url: "https://x.com/ux_xyz/status/2039031451111330264",
        kind: "Primary",
      },
    ],
    dateKind: "Reporting",
    logo: "/external/rip/ux-chain.png",
  },
  {
    id: "paystream",
    name: "Paystream",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-08-15",
    dateNote:
      "Liquidation announced; final shutdown and liquidation proposal dates were not disclosed.",
    summary:
      "Onchain yield startup that moved from P2P lending to LP management and delta-neutral funding-rate arbitrage.",
    reason:
      "Repeated pivots, reduced runway, team departures and narrowing funding spreads made continuing untenable.",
    website: "https://paystream.finance",
    social: "https://x.com/Paystreamlabs",
    logo: "/external/rip/paystream.jpg",
    sources: [
      {
        label: "Founder wind-down article",
        url: "https://x.com/Paystreamlabs/status/2088486027304550883",
        kind: "Primary",
      },
    ],
  },
  {
    id: "bitmart",
    name: "BitMart",
    category: "Exchanges",
    status: "Winding down",
    announced: "2026-07-26",
    closed: "2027-01-31",
    dateNote:
      "Trading ended August 26, 2026. Formal platform operations are scheduled to end January 31, 2027 at 15:59 UTC.",
    summary:
      "Centralized cryptocurrency exchange winding down its trading platform in stages.",
    reason:
      "The company cited operating conditions, the market environment and its future strategic direction.",
    website: "https://www.bitmart.com",
    social: "https://x.com/BitMartExchange",
    sources: [
      {
        label: "Orderly cessation notice",
        url: "https://bitmart.zendesk.com/hc/en-us/articles/53544595916059-Important-Notice-Regarding-the-Orderly-Cessation-of-BitMart-Operations",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/bitmart-token.png",
  },
  {
    id: "moonbeam",
    name: "Moonbeam (Polkadot chain)",
    category: "Networks",
    status: "Product retired",
    announced: "2026-07-03",
    dateNote:
      "July 31 was the migration deadline, not a verified chain-stop date. An August 11 infrastructure report describes a halt around August 10 but could not verify the exact final block. Moonbeam and GLMR continue on Base; this is a chain retirement, not a company shutdown.",
    summary:
      "EVM-compatible Polkadot parachain replaced by an AI-agent coordination and settlement protocol on Base.",
    reason:
      "The team redirected resources toward AI-native coordination and execution infrastructure.",
    website: "https://moonbeam.network",
    social: "https://x.com/MoonbeamNetwork",
    sources: [
      {
        label: "Official relaunch announcement",
        url: "https://moonbeam.network/news/moonbeam-strategic-update-moonbeam-network-relaunches-on-base",
        kind: "Primary",
      },
      {
        label: "Foundation forum migration guide",
        url: "https://forum.moonbeam.network/t/moonbeam-relaunches-on-base/2501",
        kind: "Primary",
      },
      {
        label: "Infrastructure halt report and verification limits",
        url: "https://github.com/nightswatchhq/graph-support/issues/14",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/moonbeam.png",
  },
  {
    id: "dogechain",
    name: "Dogechain",
    category: "Networks",
    status: "Closed",
    announced: "2026-07-21",
    closed: "2026-08-08",
    dateNote:
      "Network services ceased August 8 at 12:00 UTC. This is the EVM network, not Dogecoin or the unrelated Dogechain.info wallet.",
    summary: "EVM-compatible network built around the Dogecoin ecosystem.",
    reason: "The official sunset notice did not specify a cause.",
    website: "https://dogechain.dog",
    social: "https://x.com/DogechainFamily",
    sources: [
      {
        label: "Official shutdown notice",
        url: "https://x.com/DogechainFamily/status/2079579454767063405",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/dogechain.jpg",
  },
  {
    id: "step-app",
    name: "Step App",
    category: "Gaming",
    status: "Closed",
    announced: "2026-08-05",
    closed: "2026-08-21",
    dateNote:
      "All services scheduled to wind down August 21; source retrieval recovered the announcement introduction, with service date corroborated by reporting.",
    summary:
      "Move-to-earn fitness application using FITFI, KCAL and NFT sneakers.",
    reason:
      "The team did not disclose a financial, technical or regulatory reason.",
    website: "https://step.app",
    social: "https://x.com/StepApp_",
    sources: [
      {
        label: "Official shutdown announcement",
        url: "https://x.com/StepApp_/status/2085038602828783837",
        kind: "Primary",
      },
      {
        label: "Service closure date",
        url: "https://crypto.news/step-app-sets-aug-21-shutdown-deadline/",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/step-app.png",
  },
  {
    id: "proof-of-play",
    name: "Proof of Play",
    category: "Gaming",
    status: "Winding down",
    announced: "2026-08-04",
    dateNote:
      "Studio cessation announced August 4 with no final operational date disclosed. Pirate Nation Foundation and the PIRATE token remain separate and supported.",
    summary:
      "Blockchain gaming studio behind Pirate Nation; released client code, smart contracts and art as archives.",
    reason:
      "It could not build a scalable product and sustainable business around its blockchain gaming thesis.",
    website: "https://proofofplay.gg",
    social: "https://x.com/ProofOfPlay",
    sources: [
      {
        label: "Official cessation announcement",
        url: "https://x.com/ProofOfPlay/status/2084699843868733615",
        kind: "Primary",
      },
      {
        label: "Open-source archives",
        url: "https://github.com/proofofplay",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/proof-of-play.jpg",
  },
  {
    id: "foundation",
    name: "Foundation",
    category: "NFTs",
    status: "Closed",
    announced: "2026-04-27",
    dateNote:
      "The April 27 statement confirmed the already-offline marketplace would not resume. Exact original outage day was not established. Contracts remain onchain and its IPFS gateway continues until April 27, 2027.",
    summary: "Ethereum digital-art NFT marketplace whose planned sale failed.",
    reason:
      "The sale did not complete; the original team was gone and there were insufficient resources to responsibly restore operations.",
    website: "https://www.foundation.app",
    social: "https://x.com/foundation",
    sources: [
      {
        label: "Official final platform statement",
        url: "https://www.foundation.app/",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/foundation.svg",
  },
  {
    id: "entropy",
    name: "Entropy",
    category: "Infrastructure",
    status: "Winding down",
    announced: "2026-01-24",
    dateNote:
      "Founder announced winding up and capital return; no final closure date disclosed.",
    summary:
      "Decentralized custody startup that pivoted to crypto workflow automation.",
    reason:
      "After several pivots and layoffs, the team could not find a venture-scale business model.",
    website: "https://entropy.xyz",
    social: "https://x.com/entropydotxyz",
    sources: [
      {
        label: "Founder announcement",
        url: "https://x.com/__tux/status/2015111615801131117",
        kind: "Primary",
      },
      {
        label: "Context and business-model details",
        url: "https://crypto.news/a16z-backed-entropy-to-wind-down-after-failing-to-find-a-venture-scale-model/",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/entropy.png",
  },
  {
    id: "slingshot",
    name: "Slingshot",
    category: "Wallets",
    status: "Product retired",
    announced: "2026-02-13",
    closed: "2026-02-28",
    dateNote:
      "February 13 is the verified Help Center notice date. Earlier January announcement cited by supplied threads could not be retrieved. Infrastructure ended February 28; users retain their onchain wallets.",
    summary:
      "Crypto trading mobile app and wallet acquired by Magic Eden; independent app infrastructure was retired.",
    reason:
      "The sunset notice explains the retirement and key-export process without providing a cause.",
    website: "https://slingshot.app",
    social: "https://x.com/SlingshotCrypto",
    sources: [
      {
        label: "Official app sunset and recovery guide",
        url: "https://help.slingshot.app/en/articles/13394285-slingshot-app-sunset-how-to-access-your-wallet-secure-your-assets",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/slingshot.png",
  },
  {
    id: "zerolend",
    name: "ZeroLend",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-02-16",
    dateNote:
      "The protocol announced an orderly wind-down and asset recovery; no exact final closure date disclosed. Most markets were set to zero loan-to-value.",
    summary: "Multichain lending protocol winding down after three years.",
    reason:
      "Supported chains lost activity and liquidity, oracle support ended, and security pressure plus thin margins led to prolonged operating losses.",
    website: "https://zerolend.xyz",
    social: "https://x.com/zerolendxyz",
    sources: [
      {
        label: "Official founder notice image",
        url: "https://x.com/zerolendxyz/status/2023402141545791866",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/zerolend.jpg",
  },
  {
    id: "corn-network",
    name: "Corn Network",
    category: "Networks",
    status: "Product retired",
    announced: "2026-05-14",
    closed: "2026-06-30",
    summary:
      "Bitcoin-focused network retired its sequencer and bridging infrastructure; the team continued with a new product.",
    reason: "Team redirected resources to its next chapter.",
    dateNote:
      "Sequencer went offline June 30; this retires the network, not the team.",
    social: "https://x.com/use_corn",
    sources: [
      {
        label: "Official announcement",
        url: "https://t.me/usecorn/107",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/corn-network.jpg",
  },
  {
    id: "xenea-wallet",
    name: "Xenea Wallet",
    category: "Wallets",
    status: "Product retired",
    announced: "2026-07-05",
    closed: "2026-07-09",
    summary: "Xenea discontinued its mobile wallet service.",
    reason: "Not stated in the wallet closure notice.",
    dateNote:
      "Wallet service ended July 9 at 06:00 UTC; subsequent July 13 notice separately suspended the testnet.",
    social: "https://x.com/Xenea_io",
    logo: "/external/rip/xenea-wallet.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://t.me/Xenea_official/1934",
        kind: "Primary",
      },
    ],
  },
  {
    id: "radiant-capital",
    name: "Radiant Capital DAO",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-06-01",
    summary:
      "The DAO stopped active development and entered a recovery phase, retaining essential maintenance and withdrawal support.",
    reason:
      "Two 2024 exploits damaged finances and user trust; recovery, new funding and grants did not restore sustainable operations.",
    dateNote:
      "The DAO is winding down; the protocol explicitly remains in maintenance mode with position management and recovery continuing. No final shutdown date was announced.",
    social: "https://x.com/RDNTCapital",
    sources: [
      {
        label: "Official announcement",
        url: "https://medium.com/@RadiantCapital/sunsetting-radiant-capital-dao-entering-recovery-phase-and-lessons-for-the-future-of-defi-c47837ffa499",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/radiant-capital.jpg",
  },
  {
    id: "everclear",
    name: "Everclear",
    category: "Infrastructure",
    status: "Winding down",
    announced: "2026-05-21",
    summary:
      "Everclear sunset its crosschain clearing protocol, foundation and labs operations.",
    reason:
      "Clearing volume did not produce sustainable revenue and planned partnerships took longer than runway allowed.",
    dateNote: "Reporting date; exact completion day was not established.",
    sources: [
      {
        label: "Closure reporting",
        url: "https://www.theblock.co/news/business/2026-05-21-clear-token-tanks-48-everclear-winds-down-protocol-foundation-labs-unit-402252",
        kind: "Reporting",
      },
    ],
    dateKind: "Reporting",
    logo: "/external/rip/everclear.jpg",
  },
  {
    id: "over-protocol",
    name: "Over Protocol",
    category: "Networks",
    status: "Product retired",
    announced: "2026-04-28",
    summary:
      "The Over Foundation discontinued wallets, nodes, RPCs, explorers and APIs and did not plan to restore services.",
    reason: "Financial constraints.",
    dateNote:
      "Infrastructure was already discontinued by April 28; exact cessation day was not specified. Independent validators could still run the open client.",
    social: "https://x.com/overprotocol",
    logo: "/external/rip/over-protocol.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/overprotocol/status/2049096903493840913",
        kind: "Primary",
      },
    ],
  },
  {
    id: "pingu-exchange",
    name: "Pingu Exchange",
    category: "Trading",
    status: "Closed",
    announced: "2026-06-01",
    closed: "2026-07-31",
    summary:
      "Pingu wound down its Arbitrum and Monad perpetuals exchange, with treasury-funded exit liquidity for eligible early holders.",
    reason:
      "Monad expansion failed to generate enough volume and treasury runway ended.",
    dateNote:
      "Trading became reduce-only June 3; final settlement and dApp offline July 31 at 13:00 UTC.",
    social: "https://x.com/PinguExchange",
    logo: "/external/rip/pingu-exchange.png",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/PinguExchange/status/2061487370004766813",
        kind: "Primary",
      },
    ],
  },
  {
    id: "rova",
    name: "Rova",
    category: "Social",
    status: "Winding down",
    announced: "2026-06-01",
    summary: "The engagement and user reward platform announced its closure.",
    reason:
      "Project demand was weak and participation relied heavily on financial incentives.",
    dateNote: "Founder announced the site would close without a precise date.",
    social: "https://x.com/rovadotxyz",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/spenserhuang/status/2061588924875813321",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/rova.png",
  },
  {
    id: "colony",
    name: "Colony",
    category: "Infrastructure",
    status: "Winding down",
    announced: "2026-02-26",
    summary:
      "The Avalanche-focused ecosystem funding project announced closure after five years.",
    reason:
      "The ecosystem no longer allowed the team to pursue its mission with conviction.",
    dateNote:
      "Original post is readable but its longer continuation was unavailable; no exact closure date asserted.",
    social: "https://x.com/Colonylab",
    logo: "/external/rip/colony.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/Colonylab/status/2027057233629237499",
        kind: "Primary",
      },
    ],
  },
  {
    id: "openrank",
    name: "OpenRank / Karma3 Labs",
    category: "Infrastructure",
    status: "Winding down",
    announced: "2026-06-15",
    summary:
      "Karma3 Labs wound down OpenRank and returned remaining capital while publishing its protocol, SDKs, pipelines and learnings as open source.",
    reason:
      "Real usage and revenue never became a business that could sustain itself.",
    dateNote:
      "Original article also identifies Cura as a consumer product; treated as the same company closure rather than double-counted.",
    website: "https://openrank.com",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/SahilDewan/status/2066587393529098534",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/openrank.png",
  },
  {
    id: "rodeo",
    name: "Rodeo",
    category: "NFTs",
    status: "Closed",
    announced: "2026-01-27",
    closed: "2026-03-10",
    summary:
      "The social collecting platform provided a send-off and asset migration experience before shutting down.",
    reason:
      "The platform did not achieve the scale needed for sustainable operation.",
    dateNote:
      "Read-only February 10; platform turned off March 10. Media and metadata could migrate to Arweave.",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/saturnial/status/2016212705036939476",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/rodeo.svg",
  },
  {
    id: "family-wallet",
    name: "Family Wallet",
    category: "Wallets",
    status: "Winding down",
    announced: "2026-02-03",
    closed: "2027-04-01",
    summary:
      "Aave Labs is retiring the standalone Family iOS wallet while retaining Family Accounts infrastructure in its products.",
    reason: "Refocus on purpose-built DeFi experiences.",
    dateNote:
      "No new users from April 1, 2026; existing app users supported through April 1, 2027, with funds accessible through Aave afterwards.",
    website: "https://family.co",
    social: "https://x.com/family",
    sources: [
      {
        label: "Official announcement",
        url: "https://avara.xyz/blog/the-future-of-family-wallet",
        kind: "Primary",
      },
      {
        label: "Retirement timeline reporting",
        url: "https://ct.com/news/aave-shuts-down-avara-family-wallet-refocus-defi",
        kind: "Reporting",
      },
    ],
    logo: "/external/rip/family-wallet.png",
    logoBackground: "#f4f4f5",
  },
  {
    id: "dl-news",
    name: "DL News",
    category: "Media",
    status: "Closed",
    announced: "2026-05-07",
    summary:
      "The crypto newsroom shut down after its research revenue could not offset falling audience reach.",
    reason:
      "Search distribution and media traffic contracted; research revenue growth was insufficient.",
    dateNote:
      "The announcement says closure at the end of May; exact last day was not independently stated.",
    social: "https://x.com/dlnews",
    sources: [
      {
        label: "Official announcement",
        url: "https://finance.yahoo.com/markets/crypto/articles/dl-news-closing-191859051.html",
        kind: "Primary",
      },
      {
        label: "Original closure announcement",
        url: "https://www.dlnews.com/articles/people-culture/dl-news-is-closing/",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/dl-news.svg",
  },
  {
    id: "webn-group",
    name: "WebN Group",
    category: "Infrastructure",
    status: "Closed",
    announced: "2026-02-25",
    summary:
      "The digital assets incubator closed; portfolio projects and some staff continued elsewhere.",
    reason:
      "Reporting described the incubator as having completed its mission.",
    dateNote:
      "UK company filing records a February 10 resolution to wind up and February 20 appointment of a voluntary liquidator; February 25 is public reporting date.",
    sources: [
      {
        label: "Closure reporting",
        url: "https://www.coindesk.com/business/2026/02/25/billionaire-alan-howard-s-crypto-incubator-webn-closes-down",
        kind: "Reporting",
      },
      {
        label: "UK voluntary liquidation filings",
        url: "https://find-and-update.company-information.service.gov.uk/company/13737948/filing-history",
        kind: "Primary",
      },
    ],
    dateKind: "Reporting",
    logo: "/external/rip/webn-group.png",
  },
  {
    id: "creed",
    name: "Creed",
    category: "Security",
    status: "Closed",
    announced: "2026-03-12",
    summary:
      "The web3 security collective dissolved and transitioned its existing client commitments; members continued independently.",
    reason: "Strategic decision.",
    dateNote:
      "Official LinkedIn JSON-LD dates the announcement March 12; it says the dissolution decision was made one week earlier without specifying an exact day.",
    website: "https://thecreed.xyz",
    sources: [
      {
        label: "Official dissolution announcement",
        url: "https://www.linkedin.com/posts/creed-dao_over-the-past-three-years-creed-operated-activity-7437884231374139393-2BG2",
        kind: "Primary",
      },
      {
        label: "Official dissolved collective website",
        url: "https://thecreed.xyz",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/creed.png",
  },
  {
    id: "coinflare",
    name: "Coinflare",
    category: "Trading",
    status: "Winding down",
    summary:
      "The exchange entered an orderly wind-down, replacing platform withdrawals with a manual claims process.",
    reason: "Not stated in the accessible official notice.",
    dateNote:
      "Official notice says platform withdrawals stopped April 20, 2026. Original announcement date and final cessation day remain unverified.",
    website: "https://www.coinflare.com/campaign/member-login/",
    sources: [
      {
        label: "Official manual withdrawal notice",
        url: "https://www.coinflare.com/campaign/member-login/",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/coinflare.png",
  },
  {
    id: "goat-gaming",
    name: "GOAT Gaming",
    category: "Gaming",
    status: "Closed",
    announced: "2026-02-02",
    closed: "2026-02-16",
    dateNote:
      "Full game shutdown; the related Gifts.Fun service continued until March 2.",
    summary:
      "Telegram gaming ecosystem ended its games and cancelled the GG token launch. Alpha Goats never launched and purchasers were offered full refunds.",
    reason: "Repeated pivots failed to produce sustainable product-market fit.",
    website: "https://playgoatgaming.com",
    social: "https://x.com/playgoatgaming",
    sources: [
      {
        label: "Official announcement",
        url: "https://playgoatgaming.substack.com/p/a-farewell-to-goat-gaming",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/goat-gaming.png",
  },
  {
    id: "gifts-fun",
    name: "Gifts.Fun",
    category: "Gaming",
    status: "Closed",
    announced: "2026-02-02",
    closed: "2026-03-02",
    dateNote:
      "GOAT ecosystem service; gem purchases ended February 23 and activities ended March 2.",
    summary:
      "GOAT Gaming’s gifts platform sunset all activities; the announcement warned that remaining gems and inventory would be lost.",
    reason: "The GOAT ecosystem failed to find durable product-market fit.",
    website: "https://gifts.fun",
    sources: [
      {
        label: "Official announcement",
        url: "https://playgoatgaming.substack.com/p/a-farewell-to-goat-gaming",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/gifts-fun.png",
    logoFrame: {
      left: 215,
      top: 88,
      width: 595,
      height: 283,
      sourceWidth: 1024,
      sourceHeight: 1024,
    },
  },
  {
    id: "bloktopia",
    name: "Bloktopia",
    category: "Gaming",
    status: "Product retired",
    announced: "2026-01-05",
    dateNote:
      "Announced closure of all ecosystem activity during the week of January 5; no exact day given. Team described the active-platform closure as a pause with possible future return.",
    summary:
      "Metaverse platform and BLOKPAD launchpad closed. The technology was retained, and BPAD investors in the final M3TACARD raise were refunded; M3TACARD remains independent.",
    reason:
      "Metaverse demand faded before the product was ready; ongoing costs were unjustified without sustained users.",
    website: "https://bloktopia.com",
    social: "https://x.com/bloktopia",
    sources: [
      {
        label: "Official announcement",
        url: "https://medium.com/@bloktopia/a-final-chapter-for-bloktopia-fd6789e42439",
        kind: "Primary",
      },
    ],
    logo: "/external/rip/bloktopia.jpg",
  },
  {
    id: "catalog",
    name: "Catalog",
    category: "NFTs",
    status: "Closed",
    closed: "2026-03-09",
    dateNote:
      "Official site gives March 9 with no year or announcement timestamp; the 2026 registry supplies year context. Uploads and purchases ended March 2.",
    summary:
      "Onchain music marketplace closed and open-sourced its code. Music uploaded after April 19, 2022 remains on Arweave; older records have a migration portal.",
    reason:
      "After five years and multiple product iterations, founders concluded the project had reached its natural completion point.",
    website: "https://catalog.works",
    social: "https://x.com/catalogworks",
    logo: "/external/rip/catalog.svg",
    sources: [
      {
        label: "Official closure page",
        url: "https://fin.catalog.works",
        kind: "Primary",
      },
      {
        label: "Shutdown registry",
        url: "https://lainncalvo.github.io/signal-lost/",
        kind: "Reporting",
      },
    ],
  },
  {
    id: "voodoo",
    name: "Voodoo Trade",
    category: "DeFi",
    status: "Closed",
    dateNote:
      "Official site confirms completed wind-down but supplies no announcement or completion date.",
    summary:
      "Base perpetual exchange wound down, refunded all liquidity-bootstrap participants, and removed all capital from its platform.",
    reason:
      "Team addressed stakeholder concerns after launch; no more specific cause provided.",
    website: "https://voodoo.trade",
    social: "https://x.com/voodootrade",
    logo: "/external/rip/voodoo.svg",
    sources: [
      {
        label: "Official site closure notice",
        url: "https://voodoo.trade",
        kind: "Primary",
      },
    ],
  },
  {
    id: "rage-trade",
    name: "Rage Trade",
    category: "DeFi",
    status: "Winding down",
    announced: "2025-10-06",
    dateNote:
      "Original announcement is from 2025, despite inclusion in some 2026 roundups; no final closure date was supplied.",
    summary:
      "Perpetual trading app announced deprecation and automatic capital returns. Users were directed to underlying protocol interfaces for open positions.",
    reason: "No shutdown reason given in the official announcement.",
    website: "https://rage.trade",
    social: "https://x.com/rage_trade",
    logo: "/external/rip/rage-trade.png",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/rage_trade/status/1975111275668443509",
        kind: "Primary",
      },
    ],
  },
  {
    id: "stream-finance",
    name: "Stream Finance",
    category: "DeFi",
    status: "Winding down",
    announced: "2026-05-11",
    dateNote:
      "Announcement concerns liquidation alternatives; it does not confirm an exact final shutdown date.",
    summary:
      "Stream Trading Protocol said it was consolidating, liquidating, and distributing assets for customers and creditors while considering strategic alternatives.",
    reason:
      "The official notice focuses on maximizing recoveries and does not state the initiating cause.",
    website: "https://stream.finance",
    social: "https://x.com/StreamDefi",
    logo: "/external/rip/stream-finance.jpg",
    sources: [
      {
        label: "Official announcement",
        url: "https://x.com/StreamDefi/status/2053826155505992169",
        kind: "Primary",
      },
    ],
  },
];
