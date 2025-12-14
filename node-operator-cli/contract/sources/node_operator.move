/// Node Operator Contract for Tai Relay Network
/// 
/// Enables community members to run relay nodes, stake SUI, and earn rewards
/// for relaying P2P streams. Uses a challenge-based verification system where
/// operators must pass peer validation to claim accumulated rewards.
#[allow(lint(public_entry), unused_const)]
module tai_node::node_operator {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::table::{Self, Table};

    // ========== Error Codes ==========
    const EInsufficientStake: u64 = 1;
    const ENodeNotActive: u64 = 2;
    const ENotNodeOwner: u64 = 3;
    const EChallengeAlreadyPending: u64 = 4;
    const EChallengeExpired: u64 = 5;
    const ENotEnoughValidations: u64 = 6;
    const EAlreadyValidated: u64 = 7;
    const ECannotValidateSelf: u64 = 8;
    const EChallengeNotPending: u64 = 9;
    const EInvalidQualityScore: u64 = 10;
    const ECooldownNotPassed: u64 = 11;

    // ========== Constants ==========
    const MIN_STAKE: u64 = 100_000_000_000;      // 100 SUI in MIST
    const CHALLENGE_DURATION: u64 = 86400000;    // 24 hours in ms
    const CLAIM_COOLDOWN: u64 = 604800000;       // 7 days in ms
    const SLASH_PERCENT: u64 = 10;               // 10% slash on failure
    const MIN_VALIDATIONS: u64 = 3;              // Minimum peer validations
    const MIN_CLIENT_REPORTS: u64 = 5;           // Minimum client reports
    const PLATFORM_FEE_PERCENT: u64 = 10;        // 10% to platform

    // Challenge status
    const STATUS_PENDING: u8 = 0;
    const STATUS_PASSED: u8 = 1;
    const STATUS_FAILED: u8 = 2;

    // ========== Structs ==========

    /// Global registry tracking all relay nodes
    public struct NodeRegistry has key {
        id: UID,
        nodes: Table<address, ID>,
        total_nodes: u64,
        total_stake: u64,
        total_bytes_relayed: u64,
        platform_treasury: Balance<SUI>,
    }

    /// Individual relay node NFT - owned by operator
    public struct RelayNode has key, store {
        id: UID,
        owner: address,
        stake: Balance<SUI>,
        endpoint_url: vector<u8>,
        region: vector<u8>,
        
        // Performance metrics
        uptime_score: u64,           // 0-10000 (100.00%)
        total_sessions: u64,
        total_bytes_relayed: u64,
        
        // Rewards
        unclaimed_rewards: Balance<SUI>,
        
        // Status
        is_active: bool,
        registered_at: u64,
        last_claim_at: u64,
        pending_challenge: bool,
    }

    /// Challenge initiated by operator to claim rewards
    public struct Challenge has key {
        id: UID,
        node_id: ID,
        operator: address,
        initiated_at: u64,
        expires_at: u64,
        rewards_amount: u64,
        
        // Evidence collected
        client_reports_count: u64,
        avg_quality_score: u64,
        total_bytes_reported: u64,
        
        // Peer validations
        validators: vector<address>,
        pass_votes: u64,
        fail_votes: u64,
        
        // Result
        status: u8,
    }

    /// Session tracking for active relays
    public struct RelaySession has key {
        id: UID,
        node_id: ID,
        room_id: ID,
        started_at: u64,
        bytes_relayed: u64,
        is_active: bool,
    }

    // ========== Events ==========

    public struct NodeRegistered has copy, drop {
        node_id: ID,
        owner: address,
        stake_amount: u64,
        endpoint_url: vector<u8>,
        region: vector<u8>,
        timestamp: u64,
    }

    public struct NodeUnregistered has copy, drop {
        node_id: ID,
        owner: address,
        stake_returned: u64,
        timestamp: u64,
    }

    public struct SessionStarted has copy, drop {
        session_id: ID,
        node_id: ID,
        room_id: ID,
        timestamp: u64,
    }

    public struct SessionEnded has copy, drop {
        session_id: ID,
        node_id: ID,
        bytes_relayed: u64,
        duration_ms: u64,
        reward_earned: u64,
    }

    public struct ChallengeInitiated has copy, drop {
        challenge_id: ID,
        node_id: ID,
        operator: address,
        rewards_at_stake: u64,
        expires_at: u64,
    }

    public struct ChallengeResolved has copy, drop {
        challenge_id: ID,
        node_id: ID,
        passed: bool,
        rewards_paid: u64,
        stake_slashed: u64,
    }

    public struct ClientReportSubmitted has copy, drop {
        node_id: ID,
        reporter: address,
        quality_score: u8,
        bytes_received: u64,
    }

    public struct PeerValidationSubmitted has copy, drop {
        challenge_id: ID,
        validator: address,
        passed: bool,
        bandwidth_mbps: u64,
        latency_ms: u64,
    }

    // ========== Init ==========

    fun init(ctx: &mut TxContext) {
        let registry = NodeRegistry {
            id: object::new(ctx),
            nodes: table::new(ctx),
            total_nodes: 0,
            total_stake: 0,
            total_bytes_relayed: 0,
            platform_treasury: balance::zero(),
        };
        transfer::share_object(registry);
    }

    // ========== Entry Functions ==========

    /// Register as a relay node operator
    public entry fun register_node(
        registry: &mut NodeRegistry,
        stake: Coin<SUI>,
        endpoint_url: vector<u8>,
        region: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let stake_amount = coin::value(&stake);
        assert!(stake_amount >= MIN_STAKE, EInsufficientStake);
        
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        let node = RelayNode {
            id: object::new(ctx),
            owner: sender,
            stake: coin::into_balance(stake),
            endpoint_url,
            region,
            uptime_score: 10000,  // Start at 100%
            total_sessions: 0,
            total_bytes_relayed: 0,
            unclaimed_rewards: balance::zero(),
            is_active: true,
            registered_at: now,
            last_claim_at: now,
            pending_challenge: false,
        };
        
        let node_id = object::id(&node);
        
        // Update registry
        table::add(&mut registry.nodes, sender, node_id);
        registry.total_nodes = registry.total_nodes + 1;
        registry.total_stake = registry.total_stake + stake_amount;
        
        event::emit(NodeRegistered {
            node_id,
            owner: sender,
            stake_amount,
            endpoint_url: node.endpoint_url,
            region: node.region,
            timestamp: now,
        });
        
        transfer::transfer(node, sender);
    }

    /// Start a relay session
    public entry fun start_session(
        node: &mut RelayNode,
        room_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(node.is_active, ENodeNotActive);
        assert!(tx_context::sender(ctx) == node.owner, ENotNodeOwner);
        
        let now = clock::timestamp_ms(clock);
        
        let session = RelaySession {
            id: object::new(ctx),
            node_id: object::id(node),
            room_id,
            started_at: now,
            bytes_relayed: 0,
            is_active: true,
        };
        
        node.total_sessions = node.total_sessions + 1;
        
        event::emit(SessionStarted {
            session_id: object::id(&session),
            node_id: object::id(node),
            room_id,
            timestamp: now,
        });
        
        transfer::share_object(session);
    }

    public entry fun end_session(
        registry: &mut NodeRegistry,
        node: &mut RelayNode,
        session: RelaySession,
        bytes_relayed: u64,
        duration_ms: u64,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == node.owner, ENotNodeOwner);
        
        // Capture session ID before destructuring
        let session_id = object::id(&session);
        
        let RelaySession { id, node_id: _, room_id: _, started_at: _, bytes_relayed: _, is_active: _ } = session;
        object::delete(id);
        
        // Update node metrics
        node.total_bytes_relayed = node.total_bytes_relayed + bytes_relayed;
        registry.total_bytes_relayed = registry.total_bytes_relayed + bytes_relayed;
        
        // Calculate reward: 0.001 SUI per MB relayed (simple model)
        let mb_relayed = bytes_relayed / 1_000_000;
        let reward = mb_relayed * 1_000_000; // 0.001 SUI = 1_000_000 MIST per MB
        
        event::emit(SessionEnded {
            session_id,
            node_id: object::id(node),
            bytes_relayed,
            duration_ms,
            reward_earned: reward,
        });
    }

    /// Initiate challenge to claim accumulated rewards
    public entry fun initiate_challenge(
        node: &mut RelayNode,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == node.owner, ENotNodeOwner);
        assert!(node.is_active, ENodeNotActive);
        assert!(!node.pending_challenge, EChallengeAlreadyPending);
        
        let now = clock::timestamp_ms(clock);
        assert!(now >= node.last_claim_at + CLAIM_COOLDOWN, ECooldownNotPassed);
        
        let rewards_amount = balance::value(&node.unclaimed_rewards);
        
        node.pending_challenge = true;
        
        let challenge = Challenge {
            id: object::new(ctx),
            node_id: object::id(node),
            operator: sender,
            initiated_at: now,
            expires_at: now + CHALLENGE_DURATION,
            rewards_amount,
            client_reports_count: 0,
            avg_quality_score: 0,
            total_bytes_reported: 0,
            validators: vector::empty(),
            pass_votes: 0,
            fail_votes: 0,
            status: STATUS_PENDING,
        };
        
        event::emit(ChallengeInitiated {
            challenge_id: object::id(&challenge),
            node_id: object::id(node),
            operator: sender,
            rewards_at_stake: rewards_amount,
            expires_at: now + CHALLENGE_DURATION,
        });
        
        transfer::share_object(challenge);
    }

    /// Submit client report as evidence
    public entry fun submit_client_report(
        challenge: &mut Challenge,
        quality_score: u8,
        bytes_received: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(challenge.status == STATUS_PENDING, EChallengeNotPending);
        assert!(quality_score >= 1 && quality_score <= 5, EInvalidQualityScore);
        
        let now = clock::timestamp_ms(clock);
        assert!(now <= challenge.expires_at, EChallengeExpired);
        
        let reporter = tx_context::sender(ctx);
        
        // Update challenge with report data
        let old_total = challenge.avg_quality_score * challenge.client_reports_count;
        challenge.client_reports_count = challenge.client_reports_count + 1;
        challenge.avg_quality_score = (old_total + (quality_score as u64)) / challenge.client_reports_count;
        challenge.total_bytes_reported = challenge.total_bytes_reported + bytes_received;
        
        event::emit(ClientReportSubmitted {
            node_id: challenge.node_id,
            reporter,
            quality_score,
            bytes_received,
        });
    }

    /// Peer validator submits validation
    public entry fun submit_peer_validation(
        challenge: &mut Challenge,
        validator_node: &RelayNode,
        bandwidth_mbps: u64,
        latency_ms: u64,
        passed: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(challenge.status == STATUS_PENDING, EChallengeNotPending);
        
        let now = clock::timestamp_ms(clock);
        assert!(now <= challenge.expires_at, EChallengeExpired);
        
        let validator = tx_context::sender(ctx);
        assert!(validator == validator_node.owner, ENotNodeOwner);
        assert!(validator != challenge.operator, ECannotValidateSelf);
        assert!(validator_node.is_active, ENodeNotActive);
        
        // Check validator hasn't already validated
        let mut i = 0;
        let len = vector::length(&challenge.validators);
        while (i < len) {
            assert!(*vector::borrow(&challenge.validators, i) != validator, EAlreadyValidated);
            i = i + 1;
        };
        
        vector::push_back(&mut challenge.validators, validator);
        
        if (passed) {
            challenge.pass_votes = challenge.pass_votes + 1;
        } else {
            challenge.fail_votes = challenge.fail_votes + 1;
        };
        
        event::emit(PeerValidationSubmitted {
            challenge_id: object::id(challenge),
            validator,
            passed,
            bandwidth_mbps,
            latency_ms,
        });
    }

    /// Resolve challenge and distribute rewards or slash stake
    public entry fun resolve_challenge(
        registry: &mut NodeRegistry,
        node: &mut RelayNode,
        challenge: Challenge,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(challenge.status == STATUS_PENDING, EChallengeNotPending);
        
        let now = clock::timestamp_ms(clock);
        let total_validations = challenge.pass_votes + challenge.fail_votes;
        
        // Must have minimum validations OR challenge expired
        let can_resolve = total_validations >= MIN_VALIDATIONS || now > challenge.expires_at;
        assert!(can_resolve, ENotEnoughValidations);
        
        // Determine result: pass if majority votes pass AND has client reports
        let passed = challenge.pass_votes > challenge.fail_votes 
            && challenge.client_reports_count >= MIN_CLIENT_REPORTS
            && challenge.avg_quality_score >= 3; // Minimum 3/5 avg quality
        
        let mut rewards_paid = 0u64;
        let mut stake_slashed = 0u64;
        
        if (passed) {
            // Transfer rewards to operator
            let mut rewards = balance::withdraw_all(&mut node.unclaimed_rewards);
            rewards_paid = balance::value(&rewards);
            
            // Platform takes fee
            let fee_amount = rewards_paid * PLATFORM_FEE_PERCENT / 100;
            let fee = balance::split(&mut rewards, fee_amount);
            balance::join(&mut registry.platform_treasury, fee);
            
            // Operator gets the rest
            let payout = coin::from_balance(rewards, ctx);
            transfer::public_transfer(payout, node.owner);
        } else {
            // Slash stake
            let stake_amount = balance::value(&node.stake);
            stake_slashed = stake_amount * SLASH_PERCENT / 100;
            
            let slashed = balance::split(&mut node.stake, stake_slashed);
            balance::join(&mut registry.platform_treasury, slashed);
            
            // Clear unclaimed rewards (forfeited)
            let forfeited = balance::withdraw_all(&mut node.unclaimed_rewards);
            balance::join(&mut registry.platform_treasury, forfeited);
        };
        
        // Update node status
        node.pending_challenge = false;
        node.last_claim_at = now;
        
        // Check if node still has minimum stake
        if (balance::value(&node.stake) < MIN_STAKE) {
            node.is_active = false;
        };
        
        event::emit(ChallengeResolved {
            challenge_id: object::id(&challenge),
            node_id: object::id(node),
            passed,
            rewards_paid,
            stake_slashed,
        });
        
        // Delete challenge
        let Challenge { id, node_id: _, operator: _, initiated_at: _, expires_at: _, 
            rewards_amount: _, client_reports_count: _, avg_quality_score: _, 
            total_bytes_reported: _, validators: _, pass_votes: _, fail_votes: _, status: _ } = challenge;
        object::delete(id);
    }

    /// Unregister node and return stake (after cooldown)
    public entry fun unregister_node(
        registry: &mut NodeRegistry,
        node: RelayNode,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == node.owner, ENotNodeOwner);
        assert!(!node.pending_challenge, EChallengeAlreadyPending);
        
        let now = clock::timestamp_ms(clock);
        assert!(now >= node.last_claim_at + CLAIM_COOLDOWN, ECooldownNotPassed);
        
        // Capture node ID before destructuring
        let node_id = object::id(&node);
        
        // Remove from registry
        table::remove(&mut registry.nodes, node.owner);
        registry.total_nodes = registry.total_nodes - 1;
        
        let stake_amount = balance::value(&node.stake);
        registry.total_stake = registry.total_stake - stake_amount;
        
        // Return stake and any unclaimed rewards
        let RelayNode { 
            id, owner, stake, endpoint_url: _, region: _, uptime_score: _, 
            total_sessions: _, total_bytes_relayed: _, unclaimed_rewards, 
            is_active: _, registered_at: _, last_claim_at: _, pending_challenge: _ 
        } = node;
        
        object::delete(id);
        
        let stake_coin = coin::from_balance(stake, ctx);
        transfer::public_transfer(stake_coin, owner);
        
        if (balance::value(&unclaimed_rewards) > 0) {
            let rewards_coin = coin::from_balance(unclaimed_rewards, ctx);
            transfer::public_transfer(rewards_coin, owner);
        } else {
            balance::destroy_zero(unclaimed_rewards);
        };
        
        event::emit(NodeUnregistered {
            node_id,
            owner,
            stake_returned: stake_amount,
            timestamp: now,
        });
    }

    // ========== View Functions ==========

    public fun get_node_stats(node: &RelayNode): (u64, u64, u64, u64, bool) {
        (
            balance::value(&node.stake),
            node.total_sessions,
            node.total_bytes_relayed,
            balance::value(&node.unclaimed_rewards),
            node.is_active
        )
    }

    public fun get_registry_stats(registry: &NodeRegistry): (u64, u64, u64) {
        (
            registry.total_nodes,
            registry.total_stake,
            registry.total_bytes_relayed
        )
    }

    public fun get_challenge_status(challenge: &Challenge): (u8, u64, u64, u64) {
        (
            challenge.status,
            challenge.pass_votes,
            challenge.fail_votes,
            challenge.client_reports_count
        )
    }

    public fun is_node_registered(registry: &NodeRegistry, owner: address): bool {
        table::contains(&registry.nodes, owner)
    }

    // ========== Test Functions ==========
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
