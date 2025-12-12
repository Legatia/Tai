import { ShelbyClient } from '../src/shelby';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function testUpload() {
    const privateKey = process.env.SHELBY_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001'; // Mock key for test
    const client = new ShelbyClient(privateKey);

    // Create a dummy file
    const testFile = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFile, 'Hello Shelby! This is a test upload from Tai Node Operator.');

    try {
        console.log('Starting Shelby upload test...');
        await client.createBucket('tai-test');
        const url = await client.uploadFile(testFile);
        console.log('Test passed! File available at:', url);
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }
}

testUpload();
