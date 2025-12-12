# MVP Token Strategy & Points System Summary

## Strategic Decision: No Custom Token for MVP

**Rationale:**
- Avoid regulatory complexity during bootstrapping
- No need for DEX liquidity management
- Users can use tokens they already have (SUI/USDC)
- Focus on product-market fit, not tokenomics

---

## 🪙 Currency for MVP (Phase 1-2)

### Accepted Tokens
1. **SUI** (Primary)
   - Native Sui token
   - Used for staking tiers
   - Used for predictions
   - Used for tips

2. **USDC** (Secondary)
   - Stablecoin for risk-averse users
   - Used for predictions and tips
   - Not accepted for staking (only SUI)

### Tier Requirements (Updated)
| Tier | SUI Required | Features |
|------|--------------|----------|
| Audio Only | 10 SUI | Voice-only streaming |
| Podcast | 50 SUI | Audio + screen share |
| Video | 200 SUI | Full video streaming |
| Premium | 1,000 SUI | Priority routing, custom branding |

---

## 📊 Points System Architecture

### Purpose
Track all user activity on-chain to enable fair token distribution when native token launches (end of Phase 2).

### Points Accrual Rules

#### Streaming
- **10 points per minute** streamed
- Example: 2-hour stream = 1,200 points

#### Watching
- **1 point per minute** watched
- Example: Watch 10 streams (1hr each) = 600 points

#### Tipping (Sent)
- **2 points per SUI** tipped
- Example: Tip 100 SUI total = 200 points

#### Tipping (Received)
- **5 points per SUI** received
- Example: Receive 100 SUI in tips = 500 points

#### Prediction Markets (Betting)
- **3 points per SUI** bet
- Example: Bet 50 SUI across predictions = 150 points

#### Prediction Markets (Winning)
- **50 bonus points** per win
- Example: Win 10 predictions = 500 bonus points

### Quest System (One-Time Bonuses)
- First stream watched: **100 points**
- First tip sent: **50 points**
- First prediction won: **100 points**
- Join 5 different rooms: **200 points**

---

## 🎁 Token Launch & Airdrop (End of Phase 2)

### Airdrop Formula
```
User's Token Allocation = (User Points / Total Points) × Airdrop Pool
```

### Example Scenario
**Assumptions:**
- Total points issued during Phase 1-2: 10,000,000 points
- Native token total supply: 100,000,000 tokens
- Airdrop allocation: 10% of supply = 10,000,000 tokens

**User Outcomes:**
| User Type | Points Earned | Token Allocation | % of Airdrop |
|-----------|---------------|------------------|--------------|
| Top Streamer | 100,000 | 100,000 tokens | 1% |
| Active Viewer | 10,000 | 10,000 tokens | 0.1% |
| Casual User | 1,000 | 1,000 tokens | 0.01% |

### Revenue Share (Post-Launch)
After token launch, OG point holders may also receive:
- **Revenue share** from platform fees (TBD governance)
- **Governance rights** (voting on parameters)

---

## 🏗️ Technical Implementation

### Smart Contract: `points.move`
- **PointsRegistry** (shared object)
  - Global storage of all user points
  - Activity breakdown tracking
- **Events:**
  - `PointsAwarded` (for each activity)
  - `MilestoneReached` (1K, 5K, 10K, etc.)

### Integration Points
Points are awarded automatically when users:
1. **Disconnect from room** → Streaming + Watching points
2. **Send tip** → Tip sent + tip received points
3. **Place prediction bet** → Betting points
4. **Claim prediction winnings** → Win bonus points

### Frontend Display
- **User Dashboard:** Show points balance and breakdown
- **Leaderboards:** Top streamers, top viewers, top bettors
- **Progress Bars:** Next milestone tracker

---

## 📈 Economic Benefits

### For Platform
- **No token launch risk** during MVP
- **Build organic demand** for future token
- **Regulatory safety** (points are not securities)

### For Users
- **Clear value accrual** (points = future tokens)
- **No price volatility** during bootstrapping (SUI/USDC are stable)
- **Early adopter advantage** (most points during low competition)

### For Streamers
- **Immediate earnings** in SUI/USDC (no token dump risk)
- **Points = future equity** in the platform

---

## 📋 Updated Documents

All technical and business documents have been updated:

1. ✅ `/docs/mvp_technical_spec.md`
   - Replaced TAI with SUI/USDC
   - Added complete `points.move` module
   - Updated tier requirements

2. ✅ `/docs/business_model.md`
   - Updated Phase 1 features to include Points System
   - Replaced token airdrops with points-based rewards
   - Added token launch timeline (end of Phase 2)

3. 📝 *Pending:* `/docs/roadmap_and_mvp.md`
   - Should update Smart Contract LOC estimates (add points.move)
   - Update token launch timeline

4. 📝 *Pending:* `README.md`
   - Update "Platform Token" section to clarify Phase 1-2 strategy

---

## 🎯 Success Metrics (Points-Adjusted)

### Phase 1 Goals
- **100M+ points** distributed
- **50+ streamers** actively earning points
- **500+ viewers** participating

### Leaderboard Competition
- Top 10 streamers get **special badge** at token launch
- Top 100 users get **2x multiplier** on airdrop
- Creates FOMO and engagement

---

## ⚠️ Important Considerations

### Points are NOT Transferable
- Cannot be sold or traded
- Soulbound to user address
- Prevents Sybil attacks

### Snapshot Timing
- Points snapshot taken at **end of Phase 2**
- Announced 2 weeks before snapshot
- Creates urgency to participate

### Governance (Post-Launch)
- Point holders vote on:
  - Platform fee adjustments
  - Points multiplier changes
  - Airdrop allocation %

---

This strategy lets us **prove product-market fit** with SUI/USDC while building a **fair token distribution** mechanism that rewards early adopters.
