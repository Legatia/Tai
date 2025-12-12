#[test_only]
module tai::user_profile_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use tai::user_profile::{Self, UserProfile};

    const ALICE: address = @0xA11CE;

    fun setup_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ALICE);
        clock::create_for_testing(ts::ctx(scenario))
    }

    #[test]
    fun test_create_profile() {
        let mut scenario = ts::begin(ALICE);
        let clock = setup_clock(&mut scenario);

        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = user_profile::create_profile(&clock, ts::ctx(&mut scenario));
            assert!(user_profile::tier(&profile) == 0, 0); // FREE tier
            assert!(user_profile::staked_amount(&profile) == 0, 1);
            assert!(user_profile::total_points(&profile) == 0, 2);
            sui::transfer::public_transfer(profile, ALICE);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_stake_for_audio_tier() {
        let mut scenario = ts::begin(ALICE);
        let clock = setup_clock(&mut scenario);

        // Create profile
        ts::next_tx(&mut scenario, ALICE);
        {
            user_profile::create_and_transfer(&clock, ts::ctx(&mut scenario));
        };

        // Stake 1 SUI for AUDIO tier
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(&mut scenario)); // 1 SUI

            user_profile::stake_for_tier(&mut profile, payment, ts::ctx(&mut scenario));

            assert!(user_profile::tier(&profile) == 1, 0); // AUDIO tier
            assert!(user_profile::staked_amount(&profile) == 1_000_000_000, 1);

            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_stake_for_video_tier() {
        let mut scenario = ts::begin(ALICE);
        let clock = setup_clock(&mut scenario);

        // Create profile
        ts::next_tx(&mut scenario, ALICE);
        {
            user_profile::create_and_transfer(&clock, ts::ctx(&mut scenario));
        };

        // Stake 50 SUI for VIDEO tier
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let payment = coin::mint_for_testing<SUI>(50_000_000_000, ts::ctx(&mut scenario)); // 50 SUI

            user_profile::stake_for_tier(&mut profile, payment, ts::ctx(&mut scenario));

            assert!(user_profile::tier(&profile) == 3, 0); // VIDEO tier
            assert!(user_profile::staked_amount(&profile) == 50_000_000_000, 1);

            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_unstake() {
        let mut scenario = ts::begin(ALICE);
        let clock = setup_clock(&mut scenario);

        // Create and stake
        ts::next_tx(&mut scenario, ALICE);
        {
            user_profile::create_and_transfer(&clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let payment = coin::mint_for_testing<SUI>(10_000_000_000, ts::ctx(&mut scenario));
            user_profile::stake_for_tier(&mut profile, payment, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };

        // Unstake
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            user_profile::unstake(&mut profile, ts::ctx(&mut scenario));

            assert!(user_profile::tier(&profile) == 0, 0); // Back to FREE
            assert!(user_profile::staked_amount(&profile) == 0, 1);

            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_can_stream_audio() {
        let mut scenario = ts::begin(ALICE);
        let clock = setup_clock(&mut scenario);

        ts::next_tx(&mut scenario, ALICE);
        {
            user_profile::create_and_transfer(&clock, ts::ctx(&mut scenario));
        };

        // FREE tier cannot stream
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            assert!(!user_profile::can_stream_audio(&profile), 0);
            ts::return_to_sender(&scenario, profile);
        };

        // Stake for AUDIO tier
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(&mut scenario));
            user_profile::stake_for_tier(&mut profile, payment, ts::ctx(&mut scenario));
            assert!(user_profile::can_stream_audio(&profile), 1);
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
