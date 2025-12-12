# Tai Development Roadmap & MVP Specification

## Overview
This document defines the **scope, scale, and deliverables** for each development phase of Tai, with a detailed breakdown of the **MVP (Minimum Viable Product)**.

---

## 🎯 Phase Definitions & Success Metrics

### Phase 1: MVP Launch (Months 1-3)
**Goal:** Prove the core economic model works with early adopters.

#### Scale Targets
- **Streamers:** 50-100 active
- **Viewers:** 500-1,000 MAU (Monthly Active Users)
- **Streams/Day:** 20-50
- **Prediction Markets/Day:** 10-30
- **Platform Revenue:** $5K-10K/month

#### Key Metrics
- **Retention:** 30% weekly active streamers
- **Engagement:** Avg 3 predictions per stream
- **Revenue per User:** $5-10/month from predictions + tips

---

### Phase 2: Growth & Legitimacy (Months 4-9)
**Goal:** Attract mainstream streamers with advanced features.

#### Scale Targets
- **Streamers:** 500-1,000 active
- **Viewers:** 5K-10K MAU
- **Streams/Day:** 200-500
- **Platform Revenue:** $50K-100K/month

#### Key Metrics
- **Ad Deals:** 10-20 active advertisers
- **Equity NFT Sales:** 50-100 collections minted
- **Token Liquidity:** $500K TVL in DEX pools

---

### Phase 3: Decentralization & Scale (Months 10-18)
**Goal:** Transition to fully decentralized infrastructure.

#### Scale Targets
- **Streamers:** 5K-20K active
- **Viewers:** 50K-200K MAU
- **Node Operators:** 100+ active nodes
- **Platform Revenue:** $500K-1M/month

#### Key Metrics
- **Decentralization:** 90% of bandwidth via community nodes
- **Micropayments:** 1M+ watch-time settlements/month
- **Privacy Features:** 20% of streams use ZK-gated content

---

## 🚀 MVP Specification (Phase 1)

### Core Philosophy
**The MVP must prove:** "Streamers earn more than Twitch from day one, without needing ads."

---

## MVP Feature Breakdown

### 1️⃣ User Onboarding & Authentication

#### Smart Contracts
```move
// user_profile.move
struct UserProfile {
    id: UID,
    stake_tier: StakeTier,  // AUDIO_ONLY, PODCAST, VIDEO
    staked_balance: Balance<SUI>
}
```

#### Frontend
- **zkLogin Integration** (Google/Apple sign-in)
- **Wallet Creation Flow** (automatic, gasless via Shinami)
- **Staking Interface** (buy SUI → stake → unlock tier)

#### Backend
- None (fully on-chain + Shinami RPC)

#### Success Criteria
- ✅ User can sign up with Google in <30 seconds
- ✅ No manual wallet setup required
- ✅ First transaction is sponsored (gasless)

---

### 2️⃣ Room Creation & Streaming

#### Smart Contracts
```move
// room_manager.move
struct Room {
    id: UID,
    host: address,
    metadata: RoomMetadata,  // title, category, thumbnail_url
    status: RoomStatus,      // LIVE, ENDED
    connection_count: u64
}

struct RoomConnection {
    id: UID,
    viewer: address,
    room_id: ID,
    join_time: u64,
    watch_minutes: u64
}
```

#### Frontend
- **Room Creation Form** (title, category, thumbnail upload to Walrus)
- **Stream Key Generation** (integrate with Shelby)
- **Live Stream View** (video player + chat)
- **Viewer Counter** (real-time from Sui events)

#### Backend/Infrastructure
- **Shelby Setup** (bandwidth relay for streams)
- **Walrus Integration** (thumbnail storage)

#### Success Criteria
- ✅ Streamer can go live in <2 minutes
- ✅ Stream latency <3 seconds
- ✅ Supports 100 concurrent viewers per stream

---

### 3️⃣ Native Tipping

#### Smart Contracts
```move
// tipping.move
public fun send_tip(
    sender_profile: &mut UserProfile,
    receiver_profile: &mut UserProfile,
    payment: Coin<SUI>,  // or Coin<USDC>
    ctx: &TxContext
) {
    // Transfer + emit TipEvent
}
```

#### Frontend
- **Tip Button** (1-click payment: 1/5/10 SUI or USDC)
- **On-Stream Alert** (real-time overlay: "Alice tipped 5 SUI!")
- **Tip History** (streamer dashboard)

#### Backend
- **Nautilus Indexer** (track tip events for analytics)

#### Success Criteria
- ✅ Tip appears on stream within 2 seconds
- ✅ No wallet popup for viewers (session keys or sponsored tx)
- ✅ Streamer can withdraw anytime

---

### 4️⃣ In-Room Prediction Markets

#### Smart Contracts
```move
// prediction.move
struct Prediction {
    id: UID,
    creator: address,        // Streamer
    question: String,        // "Will I beat this boss?"
    pool_yes: Balance<SUI>,
    pool_no: Balance<SUI>,
    resolution: Option<bool>, // Some(true), Some(false), or None
    end_time: u64
}

public fun create_prediction(...);
public fun place_bet(...);  // Accepts Coin<SUI> or Coin<USDC>
public fun resolve_prediction(...);  // Optimistic oracle
```

#### Frontend
- **Prediction Creation UI** (streamer creates question + duration)
- **Betting Interface** (viewers vote YES/NO with SUI or USDC)
- **Live Pool Display** (shows YES: $500, NO: $300)
- **Resolution Modal** (streamer claims outcome, 5-min challenge window)
- **Payout Claims** (winners claim share of loser pool)

#### Backend
- **Nautilus Indexer** (track prediction outcomes, platform fees)

#### Success Criteria
- ✅ Prediction created in <10 seconds
- ✅ Bets settle instantly after resolution
- ✅ Platform earns 5% on every prediction
- ✅ Winners can claim within 1 minute of resolution

---

### 5️⃣ Staking Tiers

#### Smart Contracts
```move
// staking.move
public fun stake_for_tier(
    profile: &mut UserProfile,
    payment: Coin<SUI>,
    tier: StakeTier
) {
    // Lock tokens, upgrade tier
}

public fun unstake(profile: &mut UserProfile): Coin<SUI> {
    // Unlock tokens, downgrade tier
}
```

#### Frontend
- **Staking Dashboard** (show current tier, requirements)
- **Tier Comparison Table** (AUDIO/PODCAST/VIDEO features)
- **Upgrade Flow** (stake SUI → unlock tier)

#### Success Criteria
- ✅ Clear visual difference between tiers
- ✅ Instant tier upgrade after staking
- ✅ 7-day unstake cooldown (prevent gaming)

---

### 6️⃣ Basic Analytics (Nautilus)

#### Infrastructure
- **Nautilus Deployment** (index all Sui events)

#### Frontend
- **Streamer Dashboard:**
  - Total tips received
  - Prediction market volume
  - Viewer count (peak, average)
  - Watch time distribution

#### Success Criteria
- ✅ Analytics update within 5 seconds of on-chain event
- ✅ Historical data queryable (last 30 days)

---

### 6️⃣ Points System

#### Smart Contracts
```move
// points.move
struct PointsRegistry {
    id: UID,
    user_points: Table<address, UserPoints>
}

public fun award_streaming_points(...);
public fun award_watching_points(...);
public fun award_tip_points(...);
public fun award_prediction_points(...);
```

#### Frontend
- **Points Dashboard** (show balance and activity breakdown)
- **Leaderboards** (top streamers, viewers, bettors)
- **Milestone Notifications** ("You reached 10K points!")

#### Backend
- **Nautilus Indexer** (track all points events)

#### Success Criteria
- ✅ Points awarded in real-time
- ✅ Leaderboard updates every 5 minutes
- ✅ No double-counting of activities

---

## 🛠️ MVP Technical Stack

### Smart Contracts
| Contract | Purpose | Lines of Code (Est.) |
|----------|---------|----------------------|
| `user_profile.move` | Identity + Staking | ~200 |
| `room_manager.move` | Rooms + Connections | ~300 |
| `tipping.move` | Tips | ~100 |
| `prediction.move` | Prediction Markets | ~400 |
| `points.move` | Points System | ~250 |
| **Total** | | **~1,250 LOC** |

### Frontend (React/TypeScript)
| Component | Purpose |
|-----------|---------|
| `Auth` | zkLogin + Wallet |
| `RoomCreate` | Stream setup |
| `StreamView` | Video player + chat |
| `TipButton` | Payment UI |
| `PredictionWidget` | Betting interface |
| `Dashboard` | Analytics |

### Infrastructure
- **Shelby:** Bandwidth relay
- **Walrus:** Thumbnail + metadata storage
- **Shinami:** Sponsored transactions + RPC
- **Nautilus:** Event indexing

---

## 📋 MVP Development Timeline (12 Weeks)

### Weeks 1-2: Smart Contract Development
- [ ] Write all 5 core contracts (user_profile, room_manager, tipping, prediction, points)
- [ ] Unit tests (Move)
- [ ] Deploy to Sui Testnet

### Weeks 3-4: Frontend Foundation
- [ ] zkLogin integration
- [ ] Room creation flow
- [ ] Stream player (integrate Shelby)

### Weeks 5-6: Tipping + Predictions
- [ ] Tip UI + on-stream alerts
- [ ] Prediction creation + betting interface
- [ ] Optimistic oracle resolution

### Weeks 7-8: Staking + Points + Analytics
- [ ] Staking dashboard
- [ ] Points system integration
- [ ] Nautilus indexer setup
- [ ] Streamer analytics dashboard

### Weeks 9-10: Testing & Polish
- [ ] End-to-end testing
- [ ] UI/UX refinements
- [ ] Gas optimization

### Weeks 11-12: Beta Launch
- [ ] Deploy to Sui Mainnet
- [ ] Invite 20 beta streamers
- [ ] Monitor, fix bugs

---

## 🎯 MVP Success Criteria

### Technical
- ✅ All contracts deployed and verified
- ✅ <2 second transaction finality
- ✅ 99% uptime for Shelby bandwidth
- ✅ Zero critical bugs in first week

### Product
- ✅ 50+ streamers onboarded
- ✅ 500+ viewers registered
- ✅ 100+ predictions created
- ✅ $5K+ in prediction market volume

### Economic
- ✅ Platform earns $5K+ in first month
- ✅ Average streamer earns $50-100/month (more than Twitch affiliate)
- ✅ 70%+ of viewers participate in predictions

---

## 🚫 What's NOT in MVP

### Explicitly Excluded (Save for Phase 2+)
- ❌ Ads (no advertisers yet)
- ❌ Equity NFTs (need proven revenue first)
- ❌ Bounty Board (too complex for MVP)
- ❌ Micropayments (requires node network)
- ❌ Short-form videos (focus on live first)
- ❌ Advanced moderation (basic filtering only)
- ❌ SuiNS handles (use addresses for MVP)
- ❌ Seal/ZK features (privacy v2)

### Why This Scope?
**The MVP is a laser-focused test of the core hypothesis:**
> "Can we create a sustainable creator economy using prediction markets instead of ads?"

Everything else is a distraction until we prove this works.

---

## 💰 MVP Budget Estimate

### Development Costs
| Item | Cost |
|------|------|
| Smart Contract Dev (3 months) | $30K |
| Frontend Dev (3 months) | $40K |
| Infrastructure Setup | $5K |
| **Total Dev** | **$75K** |

### Monthly Operating Costs (Post-Launch)
| Item | Cost |
|------|------|
| Shelby Bandwidth | $2K |
| Walrus Storage | $500 |
| Shinami RPC + Sponsorship | $1K |
| Nautilus Hosting | $500 |
| **Total Monthly** | **$4K** |

### ROI Calculation
- **Break-even:** $4K/month platform revenue
- **Target:** $10K/month by Month 3
- **Margin:** 60% after infrastructure costs

---

## 📊 Phase Transition Criteria

### When to Move to Phase 2
- ✅ 100+ active streamers (weekly)
- ✅ $10K+ monthly platform revenue
- ✅ 30% weekly retention
- ✅ First advertiser interest (inbound)
- ✅ Zero critical contract vulnerabilities

### When to Move to Phase 3
- ✅ 1,000+ active streamers
- ✅ $100K+ monthly revenue
- ✅ 50+ node operator applications
- ✅ **Native token launched** (airdrop to points holders)
- ✅ Token listed on major DEX (Trident)
- ✅ Successful Equity NFT drop (Phase 2 test)

---

## 🎓 Key Learnings to Validate in MVP

1. **Will streamers adopt prediction markets?** (Behavioral risk)
2. **Will viewers bet frequently enough?** (Economic risk)
3. **Can we onboard Web2 users without crypto UX?** (Technical risk)
4. **Is 5% platform fee sustainable?** (Business model risk)
5. **Can Shelby handle 100+ concurrent streams?** (Infrastructure risk)

**If any of these fail, we pivot before Phase 2.**

---

## 🚀 Post-MVP Roadmap Summary

### Phase 2 Focus
- Add Ads (proven user base attracts advertisers)
- Launch Equity NFTs (streamers have revenue to share)
- Build Bounty Board (scale prediction market concept)

### Phase 3 Focus
- Decentralize bandwidth (node operator network)
- Launch Micropayments (sustainable at scale)
- Privacy features (Seal for premium content)

**The MVP is just the beginning.** Each phase builds on proven success from the previous one.
