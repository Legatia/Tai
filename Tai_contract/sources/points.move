/// Module: points
/// Soulbound points tracking for future token airdrop
module tai::points {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use tai::user_profile::{Self, UserProfile};

    // ========== Error Codes ==========
    const ENotAuthorized: u64 = 0;

    // ========== Points Constants ==========
    // Points per activity
    const POINTS_PER_MINUTE_STREAMING: u64 = 10;
    const POINTS_PER_MINUTE_WATCHING: u64 = 1;
    const POINTS_PER_SUI_TIPPED_SENT: u64 = 2;
    const POINTS_PER_SUI_TIPPED_RECEIVED: u64 = 5;
    const POINTS_PER_SUI_BET: u64 = 3;
    const POINTS_PER_PREDICTION_WIN: u64 = 50;

    // Quest bonuses (one-time)
    const QUEST_FIRST_STREAM_WATCHED: u64 = 100;
    const QUEST_FIRST_TIP_SENT: u64 = 50;
    const QUEST_FIRST_PREDICTION_WON: u64 = 100;
    const QUEST_JOIN_5_ROOMS: u64 = 200;

    // Milestone thresholds
    const MILESTONE_1K: u64 = 1_000;
    const MILESTONE_5K: u64 = 5_000;
    const MILESTONE_10K: u64 = 10_000;
    const MILESTONE_50K: u64 = 50_000;
    const MILESTONE_100K: u64 = 100_000;

    // ========== Structs ==========

    /// Global points registry (shared object)
    public struct PointsRegistry has key {
        id: UID,
        total_points_issued: u64,
        total_users: u64,
        // Map from user address to their activity breakdown
        activity_breakdown: Table<address, ActivityBreakdown>,
    }

    /// Breakdown of user activity (for transparency)
    public struct ActivityBreakdown has store, copy, drop {
        streaming_minutes: u64,
        watching_minutes: u64,
        tips_sent_sui: u64,
        tips_received_sui: u64,
        bets_placed_sui: u64,
        predictions_won: u64,
        quests_completed: u8,
        rooms_joined: u64,
    }

    // ========== Events ==========

    public struct PointsAwarded has copy, drop {
        user: address,
        amount: u64,
        activity_type: u8,  // 0=streaming, 1=watching, 2=tip_sent, 3=tip_recv, 4=bet, 5=win, 6=quest
        total_points: u64,
    }

    public struct MilestoneReached has copy, drop {
        user: address,
        milestone: u64,
        timestamp: u64,
    }

    // ========== Init ==========

    /// Create the global points registry (called once on publish)
    fun init(ctx: &mut TxContext) {
        let registry = PointsRegistry {
            id: object::new(ctx),
            total_points_issued: 0,
            total_users: 0,
            activity_breakdown: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // ========== Public Functions ==========

    /// Award points for streaming (10 per minute)
    public fun award_streaming_points(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        minutes: u64,
        ctx: &mut TxContext
    ) {
        let points = minutes * POINTS_PER_MINUTE_STREAMING;
        let user = tx_context::sender(ctx);
        
        ensure_breakdown_exists(registry, user, ctx);
        let breakdown = table::borrow_mut(&mut registry.activity_breakdown, user);
        breakdown.streaming_minutes = breakdown.streaming_minutes + minutes;
        
        award_points_internal(registry, profile, user, points, 0, ctx);
    }

    /// Award points for watching (1 per minute)
    public fun award_watching_points(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        minutes: u64,
        ctx: &mut TxContext
    ) {
        let points = minutes * POINTS_PER_MINUTE_WATCHING;
        let user = tx_context::sender(ctx);
        
        ensure_breakdown_exists(registry, user, ctx);
        let breakdown = table::borrow_mut(&mut registry.activity_breakdown, user);
        breakdown.watching_minutes = breakdown.watching_minutes + minutes;
        
        award_points_internal(registry, profile, user, points, 1, ctx);
    }

    /// Award points for sending a tip (2 per SUI)
    public fun award_tip_sent_points(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        amount_sui: u64,
        ctx: &mut TxContext
    ) {
        let points = amount_sui * POINTS_PER_SUI_TIPPED_SENT;
        let user = tx_context::sender(ctx);
        
        ensure_breakdown_exists(registry, user, ctx);
        let breakdown = table::borrow_mut(&mut registry.activity_breakdown, user);
        breakdown.tips_sent_sui = breakdown.tips_sent_sui + amount_sui;
        
        award_points_internal(registry, profile, user, points, 2, ctx);
    }

    /// Award points for receiving a tip (5 per SUI)
    public fun award_tip_received_points(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        amount_sui: u64,
        recipient: address,
        _ctx: &mut TxContext
    ) {
        let points = amount_sui * POINTS_PER_SUI_TIPPED_RECEIVED;
        
        // Update profile
        user_profile::add_points(profile, points);
        
        // Update registry
        registry.total_points_issued = registry.total_points_issued + points;
        
        event::emit(PointsAwarded {
            user: recipient,
            amount: points,
            activity_type: 3,
            total_points: user_profile::total_points(profile),
        });
    }

    /// Award points for placing a bet (3 per SUI)
    public fun award_bet_points(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        amount_sui: u64,
        ctx: &mut TxContext
    ) {
        let points = amount_sui * POINTS_PER_SUI_BET;
        let user = tx_context::sender(ctx);
        
        ensure_breakdown_exists(registry, user, ctx);
        let breakdown = table::borrow_mut(&mut registry.activity_breakdown, user);
        breakdown.bets_placed_sui = breakdown.bets_placed_sui + amount_sui;
        
        award_points_internal(registry, profile, user, points, 4, ctx);
    }

    /// Award points for winning a prediction (50 bonus)
    public fun award_prediction_win_points(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let points = POINTS_PER_PREDICTION_WIN;
        let user = tx_context::sender(ctx);
        
        ensure_breakdown_exists(registry, user, ctx);
        let breakdown = table::borrow_mut(&mut registry.activity_breakdown, user);
        breakdown.predictions_won = breakdown.predictions_won + 1;
        
        award_points_internal(registry, profile, user, points, 5, ctx);
    }

    // ========== View Functions ==========

    public fun total_points_issued(registry: &PointsRegistry): u64 {
        registry.total_points_issued
    }

    public fun total_users(registry: &PointsRegistry): u64 {
        registry.total_users
    }

    // ========== Internal Functions ==========

    fun award_points_internal(
        registry: &mut PointsRegistry,
        profile: &mut UserProfile,
        user: address,
        points: u64,
        activity_type: u8,
        _ctx: &mut TxContext
    ) {
        // Update profile
        user_profile::add_points(profile, points);
        
        // Update registry total
        registry.total_points_issued = registry.total_points_issued + points;
        
        let total = user_profile::total_points(profile);
        
        // Emit event
        event::emit(PointsAwarded {
            user,
            amount: points,
            activity_type,
            total_points: total,
        });
    }

    fun ensure_breakdown_exists(
        registry: &mut PointsRegistry,
        user: address,
        _ctx: &mut TxContext
    ) {
        if (!table::contains(&registry.activity_breakdown, user)) {
            table::add(&mut registry.activity_breakdown, user, ActivityBreakdown {
                streaming_minutes: 0,
                watching_minutes: 0,
                tips_sent_sui: 0,
                tips_received_sui: 0,
                bets_placed_sui: 0,
                predictions_won: 0,
                quests_completed: 0,
                rooms_joined: 0,
            });
            registry.total_users = registry.total_users + 1;
        }
    }
}
