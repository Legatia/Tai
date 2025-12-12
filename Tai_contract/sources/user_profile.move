/// Module: user_profile
/// User identity, staking tiers, and profile management
module tai::user_profile {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};

    // ========== Error Codes ==========
    const EInsufficientStake: u64 = 0;
    const EAlreadyHasProfile: u64 = 1;
    const ENoStakedBalance: u64 = 2;
    const ENotOwner: u64 = 3;

    // ========== Tier Constants (in MIST, 1 SUI = 1e9 MIST) ==========
    const TIER_FREE: u8 = 0;
    const TIER_AUDIO: u8 = 1;
    const TIER_PODCAST: u8 = 2;
    const TIER_VIDEO: u8 = 3;
    const TIER_PREMIUM: u8 = 4;

    const STAKE_AUDIO: u64 = 1_000_000_000;       // 1 SUI
    const STAKE_PODCAST: u64 = 10_000_000_000;     // 10 SUI
    const STAKE_VIDEO: u64 = 50_000_000_000;      // 50 SUI
    const STAKE_PREMIUM: u64 = 100_000_000_000;  // 100 SUI

    // ========== Structs ==========

    /// User profile NFT - owned by user
    public struct UserProfile has key, store {
        id: UID,
        tier: u8,
        staked_balance: Balance<SUI>,
        total_tips_sent: u64,
        total_tips_received: u64,
        total_points: u64,
        created_at: u64,
    }

    // ========== Events ==========

    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        timestamp: u64,
    }

    public struct TierUpgraded has copy, drop {
        profile_id: ID,
        old_tier: u8,
        new_tier: u8,
        amount_staked: u64,
    }

    public struct Unstaked has copy, drop {
        profile_id: ID,
        amount: u64,
        new_tier: u8,
    }

    // ========== Public Functions ==========

    /// Create a new user profile (FREE tier)
    public fun create_profile(clock: &Clock, ctx: &mut TxContext): UserProfile {
        let profile = UserProfile {
            id: object::new(ctx),
            tier: TIER_FREE,
            staked_balance: balance::zero(),
            total_tips_sent: 0,
            total_tips_received: 0,
            total_points: 0,
            created_at: clock::timestamp_ms(clock),
        };

        event::emit(ProfileCreated {
            profile_id: object::id(&profile),
            owner: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });

        profile
    }

    /// Create and transfer profile to sender
    public fun create_and_transfer(clock: &Clock, ctx: &mut TxContext) {
        let profile = create_profile(clock, ctx);
        transfer::public_transfer(profile, tx_context::sender(ctx));
    }

    /// Stake SUI to upgrade tier
    public fun stake_for_tier(
        profile: &mut UserProfile,
        payment: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        let old_tier = profile.tier;

        // Add to staked balance
        let coin_balance = coin::into_balance(payment);
        balance::join(&mut profile.staked_balance, coin_balance);

        // Calculate new tier based on total stake
        let total_staked = balance::value(&profile.staked_balance);
        let new_tier = calculate_tier(total_staked);

        profile.tier = new_tier;

        event::emit(TierUpgraded {
            profile_id: object::id(profile),
            old_tier,
            new_tier,
            amount_staked: amount,
        });
    }

    /// Unstake all SUI (tier reverts to FREE)
    public fun unstake(
        profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let amount = balance::value(&profile.staked_balance);
        assert!(amount > 0, ENoStakedBalance);

        let withdrawn = balance::withdraw_all(&mut profile.staked_balance);
        let coin = coin::from_balance(withdrawn, ctx);

        profile.tier = TIER_FREE;

        event::emit(Unstaked {
            profile_id: object::id(profile),
            amount,
            new_tier: TIER_FREE,
        });

        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    // ========== View Functions ==========

    public fun tier(profile: &UserProfile): u8 {
        profile.tier
    }

    public fun staked_amount(profile: &UserProfile): u64 {
        balance::value(&profile.staked_balance)
    }

    public fun total_tips_sent(profile: &UserProfile): u64 {
        profile.total_tips_sent
    }

    public fun total_tips_received(profile: &UserProfile): u64 {
        profile.total_tips_received
    }

    public fun total_points(profile: &UserProfile): u64 {
        profile.total_points
    }

    /// Check if user can create video rooms (tier >= VIDEO)
    public fun can_create_video_room(profile: &UserProfile): bool {
        profile.tier >= TIER_VIDEO
    }

    /// Check if user can stream audio (tier >= AUDIO)
    public fun can_stream_audio(profile: &UserProfile): bool {
        profile.tier >= TIER_AUDIO
    }

    // ========== Friend Functions (for other modules) ==========

    /// Add tips sent (called by tipping module)
    public(package) fun add_tips_sent(profile: &mut UserProfile, amount: u64) {
        profile.total_tips_sent = profile.total_tips_sent + amount;
    }

    /// Add tips received (called by tipping module)
    public(package) fun add_tips_received(profile: &mut UserProfile, amount: u64) {
        profile.total_tips_received = profile.total_tips_received + amount;
    }

    /// Add points (called by points module)
    public(package) fun add_points(profile: &mut UserProfile, amount: u64) {
        profile.total_points = profile.total_points + amount;
    }

    // ========== Internal Functions ==========

    fun calculate_tier(staked: u64): u8 {
        if (staked >= STAKE_PREMIUM) {
            TIER_PREMIUM
        } else if (staked >= STAKE_VIDEO) {
            TIER_VIDEO
        } else if (staked >= STAKE_PODCAST) {
            TIER_PODCAST
        } else if (staked >= STAKE_AUDIO) {
            TIER_AUDIO
        } else {
            TIER_FREE
        }
    }
}
