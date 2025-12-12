#!/usr/bin/env node
import { Command } from 'commander';
import { startTurnServer } from './turn';
import { startSignalingServer } from './signaling';

const program = new Command();

program
    .name('tai-node')
    .description('Tai Node Operator CLI')
    .version('0.1.0');

program.command('start')
    .description('Start the Tai Node services (TURN + Signaling)')
    .option('-p, --port <number>', 'Port for signaling server', '8080')
    .option('--turn-port <number>', 'Port for TURN server', '3478')
    .option('--realm <string>', 'Realm for TURN server', 'tai.io')
    .action(async (options) => {
        console.log('Starting Tai Node...');

        // Load environment variables
        require('dotenv').config();

        // Initialize Enoki Client
        const enokiPrivateKey = process.env.ENOKI_PRIVATE_KEY;
        if (enokiPrivateKey) {
            try {
                const { EnokiClient } = require('@mysten/enoki');
                const enokiClient = new EnokiClient({
                    apiKey: enokiPrivateKey
                });
                console.log('✅ Enoki Client initialized with private key');
            } catch (error) {
                console.error('❌ Failed to initialize Enoki Client:', error);
            }
        } else {
            console.warn('⚠️ ENOKI_PRIVATE_KEY not found in .env file');
        }

        // Start TURN Server
        const turnServer = startTurnServer(parseInt(options.turnPort), options.realm);
        console.log(`TURN Server running on port ${options.turnPort}`);

        // Start Signaling Server
        const signalServer = startSignalingServer(parseInt(options.port));
        console.log(`Signaling Server running on port ${options.port}`);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('Shutting down...');
            turnServer.close();
            signalServer.close();
            process.exit(0);
        });
    });

program.parse();
