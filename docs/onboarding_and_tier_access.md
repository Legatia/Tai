# Tai Onboarding & Tier Access Strategy

## Overview
This document defines the **frictionless onboarding** strategy and **tier access system** designed to minimize crypto UX friction while rewarding both established and emerging creators.

---

## 🎯 Core Principle: "Pay with Cash, Clout, or Commitment"

Users can unlock streaming tiers through **three paths**:
1. **Cash (Staking)** — Deposit refundable SUI collateral
2. **Clout (Proof of Fame)** — Verify existing audience on other platforms
3. **Commitment (Proof of Effort)** — Earn access through consistent streaming

---

## 💰 In-App Balance System

### Problem
Showing "50 USDC on Sui" scares non-crypto users. They need to see "$50.00" like Venmo or PayPal.

### Solution: USDC as USD Display

**For zkLogin Users (Custodial)**
```typescript
interface AppBalance {
  displayBalance: "$50.00",  // User sees this
  actualBalance: 50_000_000,  // 50 USDC (6 decimals) on-chain
  custodial: true
}
```

**For Web3 Users (Non-Custodial)**
```typescript
interface AppBalance {
  displayBalance: "$50.00",  // Queried from their wallet USDC balance
  actualBalance: null,  // They control their own wallet
  custodial: false
}
```

### UX Examples
- ❌ "Bet 10 USDC on YES"
- ✅ "Bet $10 on YES"

- ❌ "Your balance: 150.5 USDC"
- ✅ "Your balance: $150.50"

### Technical Implementation
- No smart contract changes needed
- Frontend converts USDC ↔ USD 1:1
- For SUI amounts, query real-time price oracle

---

## 🏆 Tier Access System

### Tier Comparison

| Tier | Stake Path | Proof of Fame | Proof of Effort | Features |
|------|-----------|---------------|-----------------|----------|
| **Audio** | Free | N/A | Free | Voice-only |
| **Podcast** | 50 SUI | 10K followers | Graduate from Effort(10hrs/week) | Audio + screen share |
| **Video** | 200 SUI | 100K followers | Graduate from Effort(10hrs/week) | Full video streaming |
| **Premium** | 1000 SUI | 200K followers | Graduate from Effort(10hrs/week) | Priority routing, custom branding |

---

## 🌟 Path 1: Proof of Fame (Established Streamers)

### Target Audience
Streamers with existing audiences on Twitch, YouTube, TikTok who want to migrate.

### Eligibility Criteria (Tiered)

**Podcast Tier Unlock:**
- ≥10K followers on verified platform (YouTube or Twitch)
- ≥20 hours/month streaming (last 3 months)
- ≥30 avg concurrent viewers

**Video Tier Unlock:**
- ≥100K followers on verified platform (YouTube or Twitch)
- ≥40 hours/month streaming (last 3 months)
- ≥100 avg concurrent viewers

**Premium Tier Unlock:**
- ≥200K followers on verified platform (YouTube or Twitch)
- ≥60 hours/month streaming (last 3 months)
- ≥200 avg concurrent viewers

### Verification Flow

```typescript
// Step 1: User authenticates with Twitch/YouTube via Enoki
const credentials = await enoki.verifySocialCredentials({
  provider: 'twitch',
  scope: ['followers', 'streaming_hours', 'avg_viewers']
});

// Step 2: Check eligibility
if (meetsProofOfFameCriteria(credentials)) {
  // Grant 2-month trial tier
  await grantProofOfFameTier(userAddress, {
    tier: 'VIDEO',
    trial_duration: 60 days
  });
}
```

### Trial Period (2 Months)

**Weekly Performance Bar (Proposed):**

*These standards ensure the platform gets meaningful value from free-tier users:*

**Minimum Activity Thresholds:**
- Stream ≥10 hours/week
- Avg ≥50 concurrent viewers (for Fame) OR ≥20 concurrent viewers (for Effort)
- Platform revenue contribution: ≥$50/week from predictions + tips combined

**Token Flow Requirements:**
- Generate ≥$200 total platform revenue over 8 weeks
- At least 25% of viewers engage (tip or bet)
- Consistent week-over-week growth (3+ weeks showing improvement)

**Graduation Logic:**
- Hit the bar in **6 out of 8 weeks** → Keep tier forever (no staking)
- Fail → Downgrade to Audio tier (must stake to regain access)

**Why These Numbers:**
- $50/week × 8 weeks = $400 total value
- At 5% platform cut on predictions = $20 platform revenue
- Replaces what we'd earn from a 200 SUI stake (~$150-200)
- Proves streamer can sustain audience and monetization

---

## 💪 Path 2: Proof of Effort (New Streamers)

### Target Audience
Aspiring streamers with no existing audience who want to prove themselves.

### Trial Allocation
- **10 hours/week** of streaming quota
- **All tiers unlocked** (Audio, Podcast, Video)
- **2-month trial period**

### Weekly Performance Bar
- Use full 10 hours (stream at least 9.5 hours/week)
- Avg ≥10 concurrent viewers
- Engagement rate ≥20%

### Graduation Logic
- Hit the bar in **6 out of 8 weeks** → Keep **ALL tiers** (Audio/Podcast/Video/Premium) forever
- Fail → Downgrade to Audio (must stake for higher tiers)

### Why 10 Hours?
- Low enough to be achievable for part-time streamers
- High enough to filter out non-serious creators
- Weekly reset creates urgency

---

## 🔐 Smart Contract Design

### Unified Tier Access Struct

```move
struct TierAccess has store {
    tier: StakeTier,
    access_method: AccessMethod,
    proof_data: Option<ProofData>
}

struct AccessMethod has store, copy, drop {
    type: u8  // 0=STAKED, 1=PROOF_FAME, 2=PROOF_EFFORT, 3=GRADUATED
}

struct ProofData has store {
    granted_at: u64,
    expires_at: u64,
    weekly_metrics: VecMap<u64, WeeklyMetrics>,
    status: ProofStatus  // TRIAL, GRADUATED, REVOKED
}

struct WeeklyMetrics has store, copy, drop {
    hours_streamed: u64,
    avg_viewers: u64,
    engagement_rate: u64,  // Basis points: 3000 = 30%
    bar_met: bool
}
```

### Key Functions

```move
// Grant Proof of Fame tier
public fun grant_proof_of_fame(
    profile: &mut UserProfile,
    tier: StakeTier,
    verified_credentials: VerifiedCredentials,
    clock: &Clock
) {
    // Verify eligibility
    assert!(meets_fame_criteria(verified_credentials, tier), E_INSUFFICIENT_FAME);
    
    profile.tier_access = TierAccess {
        tier,
        access_method: AccessMethod { type: 1 },  // PROOF_FAME
        proof_data: option::some(ProofData {
            granted_at: clock::timestamp_ms(clock),
            expires_at: clock::timestamp_ms(clock) + 60 days,
            weekly_metrics: vec_map::empty(),
            status: TRIAL
        })
    };
}

// Grant Proof of Effort tier
public fun grant_proof_of_effort(
    profile: &mut UserProfile,
    clock: &Clock
) {
    profile.tier_access = TierAccess {
        tier: VIDEO,  // Full access during trial
        access_method: AccessMethod { type: 2 },  // PROOF_EFFORT
        proof_data: option::some(ProofData {
            granted_at: clock::timestamp_ms(clock),
            expires_at: clock::timestamp_ms(clock) + 60 days,
            weekly_metrics: vec_map::empty(),
            status: TRIAL
        })
    };
    
    // Set weekly quota
    profile.effort_quota = 600;  // 10 hours = 600 minutes
}

// Evaluate graduation
public fun evaluate_proof_graduation(
    profile: &mut UserProfile,
    clock: &Clock
) {
    let proof_data = option::borrow_mut(&mut profile.tier_access.proof_data);
    
    // Count passing weeks
    let total_weeks = vec_map::size(&proof_data.weekly_metrics);
    let passing_weeks = count_passing_weeks(proof_data);
    
    if (passing_weeks >= 6 && total_weeks >= 8) {
        // GRADUATE
        proof_data.status = GRADUATED;
        profile.tier_access.access_method = AccessMethod { type: 3 };  // GRADUATED
        
        // Proof of Effort graduates to Podcast, not Video
        if (profile.tier_access.access_method.type == 2) {
            profile.tier_access.tier = PODCAST;
        };
    } else {
        // REVOKE
        proof_data.status = REVOKED;
        profile.tier_access.tier = AUDIO_ONLY;
    };
}
```

---

## 📊 Metrics Tracking (Nautilus)

### Weekly Metrics Calculation

All metrics are derived from on-chain events:

```typescript
// Nautilus query for weekly metrics
const weeklyMetrics = await nautilus.aggregate({
  user: streamerAddress,
  week: currentWeek,
  
  // Hours streamed
  hours_streamed: sum(RoomConnection.watch_seconds) / 3600,
  
  // Avg concurrent viewers
  avg_viewers: avg(Room.connection_count),
  
  // Engagement rate
  unique_tippers: countUnique(TipSent.from),
  unique_bettors: countUnique(BetPlaced.bettor),
  total_viewers: countUnique(RoomConnection.viewer),
  
  engagement_rate: (unique_tippers + unique_bettors) / total_viewers
});

// Emit on-chain event
emit(WeeklyMetricsRecorded {
  user: streamerAddress,
  week: currentWeek,
  ...weeklyMetrics,
  bar_met: meetsBar(weeklyMetrics)
});
```

---

## 🚀 Onboarding UX Flow

### For Established Streamers (Proof of Fame)

```
1. Sign in with Google (zkLogin)
2. "You stream on Twitch? Link your account for instant premium access"
3. Authorize Twitch OAuth
4. "You have 50K followers! You've unlocked Video streaming (2-month trial)"
5. "Keep streaming 10hrs/week with good engagement to keep it forever"
6. Dashboard shows weekly progress bar
7. After 2 months: Auto-evaluate → Keep access or downgrade
```

### For New Streamers (Proof of Effort)

```
1. Sign in with Google
2. "New to streaming? Get 10 free hours/week to build your audience"
3. "Use all 10 hours and grow your viewers to unlock permanent access"
4. Dashboard shows quota: "7.5 / 10 hours used this week"
5. Weekly reset: "Your quota refreshed! You have 10 hours"
6. After 2 months: Auto-evaluate → Graduate to Podcast tier or restart
```

### For Staking Users (Traditional Path)

```
1. Sign in with Google
2. "Unlock premium streaming instantly by staking $150 (refundable)"
3. Add funds via credit card → Buy SUI → Stake
4. Instant Video tier access
5. Unstake anytime (7-day cooldown)
```

---

## 📈 Competitive Advantage

### vs. Twitch
| Feature | Twitch | Tai |
|---------|--------|----------|
| Entry Barrier | Free (but no monetization) | Free (monetization from day 1) |
| Affiliate Req | 50 followers, 8hrs, 3 avg viewers | Just stream 10hrs/week |
| Platform Cut | 50% | 5% |
| Payout Threshold | $100 minimum | No minimum |

### vs. Kick
| Feature | Kick | Tai |
|---------|------|----------|
| Proven Creators | Free (VC-subsidized) | Free (Proof of Fame) |
| New Creators | Free | Free (Proof of Effort) |
| Sustainability | Burning VC cash | Sustainable (5% fees) |
| Refundable Stake | No | Yes (SUI stake) |

---

## 🎯 Success Metrics

### Phase 1 (MVP)
- **Onboarding completion**: >80% of sign-ins complete first stream
- **Proof of Effort adoption**: >30% of new streamers choose trial over staking
- **Graduation rate**: >40% of trialists graduate

### Phase 2 (Growth)
- **Proof of Fame adoption**: >100 verified Twitch/YouTube streamers migrated
- **Retention**: Graduated users have 2x retention vs. staked users

---

## 🚧 Implementation Phases

### Phase 1 (MVP)
- ✅ In-App Balance (USDC as USD)
- ✅ Staking Tiers
- ✅ Proof of Effort (10hrs/week)

### Phase 2 (Growth)
- 🔄 Proof of Fame (Enoki social verification)
- 🔄 Auto-graduation logic
- 🔄 Weekly metrics dashboard

---

This strategy removes the biggest onboarding friction (capital requirement) while maintaining quality through merit-based gatekeeping.
