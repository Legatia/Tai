#[test_only]
#[allow(unused_const)]
module tai_node::node_operator_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use tai_node::node_operator::{Self, NodeRegistry, RelayNode, Challenge, RelaySession};

    // Test addresses
    const ADMIN: address = @0xAD;
    const OPERATOR1: address = @0x1;
    const OPERATOR2: address = @0x2;
    const OPERATOR3: address = @0x3;
    const OPERATOR4: address = @0x4;
    const CLIENT1: address = @0xC1;
    const CLIENT2: address = @0xC2;

    // Test constants
    const MIN_STAKE: u64 = 100_000_000_000; // 100 SUI
    const CHALLENGE_DURATION: u64 = 86400000; // 24 hours
    const CLAIM_COOLDOWN: u64 = 604800000; // 7 days

    // ========== Helper Functions ==========

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            node_operator::init_for_testing(ts::ctx(&mut scenario));
        };
        scenario
    }

    fun mint_sui(amount: u64, ctx: &mut TxContext): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ctx)
    }

    fun create_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    // ========== Registration Tests ==========

    #[test]
    fun test_register_node_success() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        // Register operator 1
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify registry updated
            let (total_nodes, total_stake, _) = node_operator::get_registry_stats(&registry);
            assert!(total_nodes == 1, 0);
            assert!(total_stake == MIN_STAKE, 1);
            assert!(node_operator::is_node_registered(&registry, OPERATOR1), 2);
            
            ts::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = node_operator::EInsufficientStake)]
    fun test_register_node_insufficient_stake() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE - 1, ts::ctx(&mut scenario)); // Less than minimum
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_register_multiple_nodes() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        // Register operator 1
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // Register operator 2
        ts::next_tx(&mut scenario, OPERATOR2);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE * 2, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay2.example.com:8080",
                b"eu-west",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify registry has 2 nodes
            let (total_nodes, total_stake, _) = node_operator::get_registry_stats(&registry);
            assert!(total_nodes == 2, 0);
            assert!(total_stake == MIN_STAKE * 3, 1);
            
            ts::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== Session Tests ==========

    #[test]
    fun test_start_session() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        // Register node first
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // Start a session
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            let room_id = object::id_from_address(@0x100);
            
            node_operator::start_session(
                &mut node,
                room_id,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify session count increased
            let (_, total_sessions, _, _, _) = node_operator::get_node_stats(&node);
            assert!(total_sessions == 1, 0);
            
            ts::return_to_sender(&scenario, node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_end_session() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        // Register node
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // Start session
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            let room_id = object::id_from_address(@0x100);
            
            node_operator::start_session(
                &mut node,
                room_id,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, node);
        };
        
        // End session
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            let session = ts::take_shared<RelaySession>(&scenario);
            
            let bytes_relayed = 100_000_000; // 100 MB
            let duration_ms = 3600000; // 1 hour
            
            node_operator::end_session(
                &mut registry,
                &mut node,
                session,
                bytes_relayed,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify bytes relayed updated
            let (_, _, total_bytes, _, _) = node_operator::get_node_stats(&node);
            assert!(total_bytes == bytes_relayed, 0);
            
            ts::return_shared(registry);
            ts::return_to_sender(&scenario, node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== Challenge Tests ==========

    #[test]
    fun test_initiate_challenge() {
        let mut scenario = setup_test();
        let mut clock = create_clock(&mut scenario);
        
        // Register node
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // Fast forward past cooldown
        clock::increment_for_testing(&mut clock, CLAIM_COOLDOWN);
        
        // Initiate challenge
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            
            node_operator::initiate_challenge(
                &mut node,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, node);
        };
        
        // Verify challenge was created
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let challenge = ts::take_shared<Challenge>(&scenario);
            let (status, pass_votes, fail_votes, reports) = node_operator::get_challenge_status(&challenge);
            
            assert!(status == 0, 0); // STATUS_PENDING
            assert!(pass_votes == 0, 1);
            assert!(fail_votes == 0, 2);
            assert!(reports == 0, 3);
            
            ts::return_shared(challenge);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = node_operator::ECooldownNotPassed)]
    fun test_initiate_challenge_before_cooldown() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        // Register node
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // Try to initiate challenge immediately (should fail)
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            
            node_operator::initiate_challenge(
                &mut node,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== Client Report Tests ==========

    #[test]
    fun test_submit_client_report() {
        let mut scenario = setup_test();
        let mut clock = create_clock(&mut scenario);
        
        // Register node
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            
            node_operator::register_node(
                &mut registry,
                stake,
                b"http://relay1.example.com:8080",
                b"us-east",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // Fast forward and initiate challenge
        clock::increment_for_testing(&mut clock, CLAIM_COOLDOWN);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::initiate_challenge(&mut node, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, node);
        };
        
        // Submit client report
        ts::next_tx(&mut scenario, CLIENT1);
        {
            let mut challenge = ts::take_shared<Challenge>(&scenario);
            
            node_operator::submit_client_report(
                &mut challenge,
                4, // quality score 4/5
                50_000_000, // 50 MB received
                &clock,
                ts::ctx(&mut scenario)
            );
            
            let (_, _, _, reports) = node_operator::get_challenge_status(&challenge);
            assert!(reports == 1, 0);
            
            ts::return_shared(challenge);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = node_operator::EInvalidQualityScore)]
    fun test_submit_invalid_quality_score() {
        let mut scenario = setup_test();
        let mut clock = create_clock(&mut scenario);
        
        // Register and initiate challenge
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            node_operator::register_node(&mut registry, stake, b"http://relay1.example.com", b"us-east", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        clock::increment_for_testing(&mut clock, CLAIM_COOLDOWN);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::initiate_challenge(&mut node, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, node);
        };
        
        // Submit invalid report (score 0)
        ts::next_tx(&mut scenario, CLIENT1);
        {
            let mut challenge = ts::take_shared<Challenge>(&scenario);
            node_operator::submit_client_report(&mut challenge, 0, 50_000_000, &clock, ts::ctx(&mut scenario));
            ts::return_shared(challenge);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== Peer Validation Tests ==========

    #[test]
    fun test_submit_peer_validation() {
        let mut scenario = setup_test();
        let mut clock = create_clock(&mut scenario);
        
        // Register operator 1
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            node_operator::register_node(&mut registry, stake, b"http://relay1.example.com", b"us-east", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        // Register operator 2 (the validator)
        ts::next_tx(&mut scenario, OPERATOR2);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            node_operator::register_node(&mut registry, stake, b"http://relay2.example.com", b"eu-west", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        // Operator 1 initiates challenge
        clock::increment_for_testing(&mut clock, CLAIM_COOLDOWN);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::initiate_challenge(&mut node, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, node);
        };
        
        // Operator 2 submits validation
        ts::next_tx(&mut scenario, OPERATOR2);
        {
            let mut challenge = ts::take_shared<Challenge>(&scenario);
            let validator_node = ts::take_from_sender<RelayNode>(&scenario);
            
            node_operator::submit_peer_validation(
                &mut challenge,
                &validator_node,
                100, // 100 Mbps bandwidth
                25,  // 25ms latency
                true, // passed
                &clock,
                ts::ctx(&mut scenario)
            );
            
            let (_, pass_votes, fail_votes, _) = node_operator::get_challenge_status(&challenge);
            assert!(pass_votes == 1, 0);
            assert!(fail_votes == 0, 1);
            
            ts::return_shared(challenge);
            ts::return_to_sender(&scenario, validator_node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = node_operator::ECannotValidateSelf)]
    fun test_cannot_validate_self() {
        let mut scenario = setup_test();
        let mut clock = create_clock(&mut scenario);
        
        // Register operator 1
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            node_operator::register_node(&mut registry, stake, b"http://relay1.example.com", b"us-east", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        clock::increment_for_testing(&mut clock, CLAIM_COOLDOWN);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::initiate_challenge(&mut node, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, node);
        };
        
        // Try to validate own challenge (should fail)
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut challenge = ts::take_shared<Challenge>(&scenario);
            let validator_node = ts::take_from_sender<RelayNode>(&scenario);
            
            node_operator::submit_peer_validation(
                &mut challenge,
                &validator_node,
                100,
                25,
                true,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(challenge);
            ts::return_to_sender(&scenario, validator_node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = node_operator::EAlreadyValidated)]
    fun test_cannot_validate_twice() {
        let mut scenario = setup_test();
        let mut clock = create_clock(&mut scenario);
        
        // Register both operators
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            node_operator::register_node(&mut registry, stake, b"http://relay1.example.com", b"us-east", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, OPERATOR2);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            node_operator::register_node(&mut registry, stake, b"http://relay2.example.com", b"eu-west", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        clock::increment_for_testing(&mut clock, CLAIM_COOLDOWN);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::initiate_challenge(&mut node, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, node);
        };
        
        // First validation
        ts::next_tx(&mut scenario, OPERATOR2);
        {
            let mut challenge = ts::take_shared<Challenge>(&scenario);
            let validator_node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::submit_peer_validation(&mut challenge, &validator_node, 100, 25, true, &clock, ts::ctx(&mut scenario));
            ts::return_shared(challenge);
            ts::return_to_sender(&scenario, validator_node);
        };
        
        // Second validation (should fail)
        ts::next_tx(&mut scenario, OPERATOR2);
        {
            let mut challenge = ts::take_shared<Challenge>(&scenario);
            let validator_node = ts::take_from_sender<RelayNode>(&scenario);
            node_operator::submit_peer_validation(&mut challenge, &validator_node, 100, 25, true, &clock, ts::ctx(&mut scenario));
            ts::return_shared(challenge);
            ts::return_to_sender(&scenario, validator_node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== Node Stats Tests ==========

    #[test]
    fun test_get_node_stats() {
        let mut scenario = setup_test();
        let clock = create_clock(&mut scenario);
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let mut registry = ts::take_shared<NodeRegistry>(&scenario);
            let stake = mint_sui(MIN_STAKE * 2, ts::ctx(&mut scenario)); // 200 SUI
            node_operator::register_node(&mut registry, stake, b"http://relay1.example.com", b"us-east", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, OPERATOR1);
        {
            let node = ts::take_from_sender<RelayNode>(&scenario);
            
            let (stake, sessions, bytes, rewards, is_active) = node_operator::get_node_stats(&node);
            
            assert!(stake == MIN_STAKE * 2, 0);
            assert!(sessions == 0, 1);
            assert!(bytes == 0, 2);
            assert!(rewards == 0, 3);
            assert!(is_active == true, 4);
            
            ts::return_to_sender(&scenario, node);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
