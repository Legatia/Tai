# Tai

> A decentralized livestreaming platform built on Sui blockchain — think "decentralized Twitch with economic physics baked into the substrate"

Tai is a Web3 livestreaming ecosystem featuring public/private rooms, podcasts, game streams, replay storage, micropayments, staking, advertising, moderation, and node contributor rewards. The platform leverages Sui's object model for ownership semantics and low-latency mutations, while Walrus handles cold storage and a P2P layer manages livestream transport.

## Current Status: P2P Meeting & Chat
We have currently implemented the core P2P infrastructure in the form of **Tai Meet** — a secure, private video meeting application. This serves as the foundational layer for the broader streaming platform.

**Features Live Now:**
- 🎥 **P2P Video Calls**: Secure, low-latency video via WebRTC.
- 💬 **Rich Chat**: Text, file sharing, and location sharing over Data Channels.
- 🛡️ **Privacy Mode**: End-to-end encryption with URL-based key sharing.
- 🆔 **ZkLogin**: Frictionless onboarding using Google/Twitch credentials via Enoki.

## Architecture Overview

### What Sui Provides

Sui serves as the platform's economic and social backbone:
- **Directory & Registry** — User profiles, room metadata, connection records
- **Permission Oracle** — Access control, tier eligibility, moderation privileges
- **Economics Engine** — Staking, micropayments, settlements, rewards, escrows
- **Accountability** — Transparent record of moderator actions, node contributions, ad delivery

The blockchain doesn't handle bandwidth (P2P does that) or cold storage (Walrus does that) — it orchestrates ownership, payments, and trust.

### Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contracts** | Sui Move | User objects, rooms, staking, payments, ads, moderation |
| **Cold Storage** | Walrus | Replay/recording storage via blob references |
| **Livestream Transport** | P2P (WebRTC/libp2p) | Real-time video/audio bandwidth |
| **Platform Token** | Sui Move Token | Staking, rewards, tipping, in-app purchases |
| **Frontend** | React/TypeScript | User interface for streaming, staking, moderation |
| **Backend** | Node.js | Coordination, analytics, AI moderation, notifications |

---

## The 10 Core Components

### 1️⃣ Identity and User Objects

Every user has a **Sui object** representing their platform identity:

```move
struct UserProfile {
  id: UID,
  stake_tier: StakeTier,
  unlocked_features: vector<Feature>,  // podcast, video streaming
  moderation_eligible: bool,
  revenue_routes: RevenueConfig,       // tips, rewards, ad payouts
  engagement_metrics: EngagementData
}
```

**Key Features:**
- Stake-based tier system (audio-only, podcast, video streaming)
- Dynamic feature unlocks based on engagement + stake
- Eligibility tracking for moderation privileges
- Revenue routing for multiple income streams

### 2️⃣ Room Objects

**Public rooms** are immutable containers representing livestream sessions:

```move
struct Room {
  id: UID,
  host: address,
  metadata: RoomMetadata,              // title, category, thumbnail
  status: RoomStatus,                  // open, ended
  constraints: Option<RoomConstraints>, // age, auto-moderation level
  connection_count: u64
}
```

**Connection tracking:**
- Each viewer gets a `RoomConnection` object when joining
- Powers micropayments, attendance metrics, and ad reach proofs
- Enables pay-per-minute streaming revenue

### 3️⃣ Platform Economy

**MVP Strategy (Phase 1-2):** Use **SUI** and **USDC** for all economic activities. No custom token during bootstrapping to avoid regulatory complexity and focus on product-market fit.

**💰 In-App Balance:**
- Users see balances in **USD** ($50.00), not crypto units
- zkLogin users: USDC stored in platform-managed wallet
- Web3 users: USDC balance from their connected wallet
- Seamless UX: "Tip $5" instead of "Tip 5 USDC"

**🏆 Tier Access: "Pay with Cash, Clout, or Commitment"**

Three paths to unlock streaming tiers:

1. **Cash (Staking)** — Refundable SUI collateral
   - Audio: 1 SUI | Podcast: 10 SUI | Video: 50 SUI | Premium: 100 SUI

2. **Clout (Proof of Fame)** — Verify existing audience (tiered)
   - 10K+ followers → Podcast tier
   - 100K+ followers → Video tier
   - 200K+ followers → Premium tier
   - Generate $200+ platform revenue over 8 weeks → Keep tier forever

3. **Commitment (Proof of Effort)** — Prove yourself
   - Free Audio access + 10 hours/week streaming quota (2-month trial)
   - Hit weekly revenue bar → Graduate to earned tier permanently (no staking!)

**Economic Currencies:**
- 💰 **Tipping (SUI or USDC)** — Viewer-to-streamer instant payments
- 🎲 **Predictions (SUI or USDC)** — Bet on stream outcomes, platform earns 5% fee
- 📊 **Points System** — Track all activity for future token airdrop

**Native Token Launch (End of Phase 2):**
When the platform token launches, Points convert to tokens:
```
User's Token Allocation = (User Points / Total Points) × Airdrop Pool
```

**Future Use Cases:**
- ⚖️ **Moderation** — Token stake required for moderator eligibility
- 🖥️ **Node Operators** — Earn tokens for bandwidth relay and indexing
- 🎬 **Governance** — Vote on platform parameters
- 🗳️ **Revenue Share** — Token holders receive % of platform fees


### 4️⃣ Micropayment System

**Trustless Watch Time Tracking:**

Instead of constant on-chain updates, we use a **witness-based architecture** leveraging the Sui ecosystem:

```move
struct RoomConnection {
  id: UID,
  viewer: address,
  room_id: ID,
  join_time: u64,
  watch_minutes: u64  // Written only once, on disconnect
}

struct WatchTimeReport has copy, drop {
  connection_id: ID,
  node_operator: address,
  watch_seconds: u64,
  timestamp: u64
}
```

**The Flow:**
1. **Join:** Viewer connects → `RoomConnection` object created on-chain.
2. **Watch:** Node Operators (P2P relay nodes) track connection time off-chain.
3. **Disconnect:** Multiple nodes (3+) emit `WatchTimeReport` events to chain.
4. **Settlement:** Smart contract queries **Nautilus** for reports → takes **median** → updates `watch_minutes`.

**Why This Works:**
- ✅ **No Gas Spam:** Only 2 transactions per session (join + disconnect).
- ✅ **Trustless:** Multiple independent node witnesses prevent fraud.
- ✅ **Sui-Native:** Uses Node Operators + Nautilus (no centralized backend).

**Example:** Viewer watches 47 minutes → 3 nodes report [47, 47, 48] → Contract takes median (47) → Streamer earns payment for 47 minutes.

### 5️⃣ Node Operator Economy

Decentralized nodes provide infrastructure and earn rewards:

**Node Responsibilities:**
- Bandwidth relaying for livestreams
- Metadata gossip across the network
- Optional Walrus link indexing
- Viewing metrics aggregation
- Ad reach data reporting
- **Feed Provider** (Indexing + Recommendation)

**Reward System:**
```move
struct NodeOperator {
  id: UID,
  reputation: u64,
  stake: Balance<TAI>,
  duties: vector<NodeDuty>,
  metrics: PerformanceMetrics
}
```

**Fraud Detection:**
- Multiple nodes report same event → consensus
- Redundancy-based verification
- Slashing for provable dishonesty

### 6️⃣ Replay and Recording Storage (Walrus)

All replays stored as Walrus blobs:

```move
struct ReplayContent {
  id: UID,
  walrus_blob_id: vector<u8>,
  owner: address,                    // the streamer
  access_rules: AccessRules,         // free, pay-per-view, token-gated
  moderation_flags: vector<Flag>,
  metadata: ContentMetadata
}
```

**Access Control:**
- Free public replays
- Pay-per-view with token/stablecoin
- Token-gated (stake tier requirement)
- Subscriber-only content

**Moderation:**
- AI agents scan content periodically
- Moderators can flag/annotate replays
- Flags stored on-chain for transparency

### 7️⃣ Advertisement System

Ad agreements as **Sui objects** with escrow:

```move
struct AdAgreement {
  id: UID,
  advertiser: address,
  streamer: address,
  display_window: AdWindow,          // 20s mid-stream, banner placement
  escrow: Balance<TAI>,
  validation_rules: ReachRequirements,
  status: AdStatus
}
```

**How It Works:**
1. Advertiser creates agreement + deposits escrow
2. Streamer accepts and displays ad
3. Viewer connection objects + nodes prove delivery
4. Once reach/duration validated → escrow releases
5. Transparent on-chain record of all ad deliveries

**Validation:**
- Minimum viewer count
- Minimum display duration
- Geographic reach (optional)
- Fraud detection via node consensus

### 8️⃣ Moderation System

Community-driven content moderation with skin in the game:

**Eligibility Requirements:**
- Minimum platform token stake
- Account age threshold
- Minimum engagement hours
- Good reputation score

**Moderator Capabilities:**
- Submit content reports
- Mark risky/inappropriate streams
- Temporarily reduce room visibility
- Annotate replay objects with warnings
- Vote on appeals

**Accountability:**
```move
struct ModeratorRecord {
  id: UID,
  moderator: address,
  accuracy_rate: u64,       // % of actions upheld
  overturn_count: u64,      // actions reversed by community
  total_actions: u64,
  rewards_earned: u64
}
```

**Transparency:**
- All actions recorded on-chain
- Public accuracy metrics
- Reward distribution visible
- Appeal process with community voting

### 9️⃣ P2P Livestream Layer

The **only component not on-chain** — handles real-time video/audio:

**Technology Options:**
- WebRTC with supernodes
- go-libp2p custom mesh
- Self-hosted SFU (Selective Forwarding Unit)

**Requirements:**
- Node operators can plug in and relay
- Broadcast metrics reported to Sui
- Low latency for real-time interaction
- Adaptive bitrate for varying connections

**Integration:**
- Nodes report viewer counts → Sui
- Bandwidth metrics → reward calculation
- Ad impressions → validation data

### 1️⃣1️⃣ Short-Form Video (Clips)

**VOD-First Architecture:**
Unlike livestreams, Clips are uploaded directly to Walrus and indexed by Feed Nodes.

```move
struct ShortVideo {
  id: UID,
  creator: address,
  walrus_blob_id: vector<u8>,
  metadata: VideoMetadata,   // hashtags, music_id, duration
  engagement: EngagementCounter,
  viral_score: u64           // Computed by nodes, verified by consensus
}
```

**The Viral Pool:**
- A dedicated reward pool for short-form content.
- Distributed weekly based on engagement epochs.
- "Feed Provider" nodes earn a cut for serving high-quality feeds.

**Feed Architecture:**
- **On-Chain:** Source of truth (Video objects, Likes, Tips).
- **Off-Chain (Nodes):** Index content -> Compute "Viral Score" -> Serve sorted feed API.
- **Client:** Fetches feed from nodes, verifies signatures, plays video from Walrus.

### 1️⃣2️⃣ Advanced Economy Modules

**A. Streamer PK (Battle) System:**
A high-stakes, gamified prediction market where streamers compete and fans vote with tokens.

```move
struct Battle {
  id: UID,
  streamer_a: address,
  streamer_b: address,
  pool_a: Balance<TAI>,
  pool_b: Balance<TAI>,
  status: BattleStatus,
  end_time: u64
}
```

**The "Winner-Takes-All" Split:**
When a battle ends, the losing side's pool is distributed:
- **50%** → Yield to Winning Fans (pro-rata)
- **45%** → Prize to Winning Streamer
- **5%** → Platform Treasury

**B. Native Tipping (Frictionless):**
Direct, one-click payments without external services.
- **Multi-Token:** Accepts SUI, USDC, TAI.
- **Instant Settlement:** No withdrawal minimums or delays.
- **On-Chain Events:** Triggers overlay alerts immediately.

**C. Bounty Board & Prediction Markets:**
Fans can sponsor challenges or bet on outcomes (e.g., "Will streamer get the rare item within 5 runs?").

```move
struct Challenge {
  id: UID,
  type: ChallengeType,   // BOUNTY or PREDICTION
  condition: String,     // "Get Legendary Sword"
  pool_yes: Balance,
  pool_no: Balance,
  resolution: Resolution
}
```

**Optimistic Oracle:**
1. Streamer claims "I did it!"
2. **5-Minute Challenge Window:** Community/Nodes can dispute with evidence.
3. If no dispute, funds release automatically. (Avoids complex game API integrations).

**D. Equity NFTs (OG Certificates):**
Turn early fans into stakeholders.
- **Revenue Share:** Holders earn a % of the creator's **Ad Revenue** and **Marketplace Fees**.
- **Dynamic Loyalty:** The NFT tracks "Loyalty Score" (watch time). Higher score = higher share.
- **Tradable:** Can be sold on the secondary market (with royalties to the creator).

### 🔟 The Application Layer

**Frontend (React/TypeScript):**
- P2P transport integration
- Sui wallet connection (Sui Wallet, Suiet)
- Staking dashboard
- Tipping interface
- Ad campaign management
- Moderator control panel
- Replay viewer with access control
- **Feed View** (Vertical swipe interface for Clips)

**Backend (Node.js - Minimal):**
- Coordination helpers for node discovery
- Optional analytics aggregation
- Off-chain AI moderation pipeline
- Push notifications
- Webhook integrations

**Design Philosophy:**
- Heavy lifting on P2P (bandwidth) and Walrus (storage)
- Sui handles only what requires consensus
- Backend is stateless coordination layer
- Frontend is primary user interface

---

## Economic Model

### Staking Tiers

| Tier | Stake Required | Unlocked Features |
|------|---------------|-------------------|
| **Audio Only** | 100 TAI | Voice-only streaming |
| **Podcast** | 500 TAI | Audio + screen share |
| **Video Streaming** | 2,000 TAI | Full video + overlays |
| **Premium** | 10,000 TAI | Priority node routing, custom branding |

### Revenue Streams

**For Streamers:**
- Viewer micropayments (per-minute watching)
- Direct tips (token or stablecoins)
- Ad revenue (delivery-verified)
- Paid replay access
- Subscriber tiers (token-gated)

**For Node Operators:**
- Bandwidth relay rewards
- Indexing rewards
- Uptime bonuses
- Metrics reporting rewards

**For Moderators:**
- Action-based rewards
- Accuracy bonuses
- Community governance participation

**For Platform:**
- Small fee on ad agreements (5%)
- Small fee on paid replays (10%)
- Premium tier subscriptions

---

## Why Sui?

Tai leverages Sui's unique capabilities:

✅ **Object-Centric Model** — Rooms, connections, profiles, ad agreements are natural Sui objects  
✅ **High Throughput** — Handles thousands of micropayment updates per second  
✅ **Low Latency** — Sub-second finality for real-time tipping and connections  
✅ **Ownership Semantics** — Clear ownership of content, replays, revenue streams  
✅ **Parallel Execution** — Multiple rooms operate independently without conflicts  
✅ **Programmable Transactions** — Complex multi-step operations (join room + stake + pay)  

**What Sui Doesn't Do:**
- ❌ Store video data (Walrus does this)
- ❌ Handle bandwidth (P2P does this)
- ❌ Real-time video processing (off-chain)

Sui is the **economic and social substrate**, not the video infrastructure.

---

## Development Status

**Current Phase:** 🔨 Initial Planning & Architecture

### Completed
- ✅ **Tai Meet** (P2P Meeting App)
- ✅ ZkLogin Integration
- ✅ Basic project structure
- ✅ Architecture design

### In Progress
- 🔨 Sui Move contract development
- 🔨 Documentation and implementation planning

### Upcoming
- ⏳ User profile and staking contracts
- ⏳ Room management contracts
- ⏳ Micropayment settlement system
- ⏳ Node operator registry
- ⏳ Walrus integration
- ⏳ P2P livestream layer (Broadcasting)
- ⏳ Ad agreement contracts
- ⏳ Moderation system
- ⏳ Frontend Sui wallet integration
- ⏳ Backend Sui RPC integration

---

## Project Structure

```
Tai/
├── tai_move/          # Sui Move smart contracts
│   ├── sources/
│   │   ├── user_profile.move
│   │   ├── room_manager.move
│   │   ├── staking.move
│   │   ├── micropayments.move
│   │   ├── node_operator.move
│   │   ├── replay_storage.move
│   │   ├── advertising.move
│   │   └── moderation.move
│   └── tests/
├── frontend/              # Tai Web App (React/Next.js)
├── legacy_frontend/       # Archived legacy UI
├── node-operator-cli/     # CLI for running relay nodes
└── docs/                  # Additional documentation
```

---

## Getting Started

### Prerequisites
- Sui CLI (`brew install sui`)
- Node.js 18+
- Walrus CLI (for storage testing)

### Build Smart Contracts
```bash
cd tai_move
sui move build
sui move test
```

### Run Frontend (Development)
```bash
cd frontend
npm install
npm run dev
```

### Run Node Operator (Signaling/TURN)
```bash
cd node-operator-cli
npm install
npm run dev
```

---

## Key Design Principles

1. **Decentralization First** — No single point of control
2. **Economic Sustainability** — All participants earn from contributions
3. **Transparency** — All economic actions visible on-chain
4. **User Sovereignty** — Users own their content, data, and revenue
5. **Moderation with Accountability** — Community moderation with public track records
6. **Scalability** — Sui + Walrus + P2P = infinite scale potential
7. **Privacy-Aware** — Optional private rooms, encrypted tipping details

---

## Contributing

Tai is in active development. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT License - See [LICENSE](./LICENSE) for details

---

## Contact & Resources

- **Documentation:** [docs.tai.io](https://docs.tai.io) *(coming soon)*
- **Discord:** [discord.gg/tai](https://discord.gg/tai) *(coming soon)*
- **Sui Documentation:** [docs.sui.io](https://docs.sui.io)
- **Walrus Documentation:** [docs.walrus.site](https://docs.walrus.site)

---

*Tai: Where streaming meets sovereignty* �
