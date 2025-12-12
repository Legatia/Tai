import { ShelbyNodeClient } from '@shelby-protocol/sdk';
import fs from 'fs';
import path from 'path';

export class ShelbyClient {
    private client: ShelbyNodeClient;
    private bucket: string;

    constructor(privateKey: string, bucket: string = 'tai-streams') {
        this.client = new ShelbyNodeClient({
            privateKey,
            network: 'testnet' // or 'mainnet' depending on config
        });
        this.bucket = bucket;
    }

    async uploadFile(filePath: string, fileName?: string): Promise<string> {
        const name = fileName || path.basename(filePath);
        const fileBuffer = fs.readFileSync(filePath);

        console.log(`[Shelby] Uploading ${name} to bucket ${this.bucket}...`);

        try {
            const result = await this.client.upload({
                bucket: this.bucket,
                name: name,
                data: fileBuffer,
                options: {
                    encrypt: false, // Public stream segments
                    redundancy: 'high'
                }
            });

            console.log(`[Shelby] Upload success! URL: ${result.url}`);
            return result.url;
        } catch (error) {
            console.error(`[Shelby] Upload failed:`, error);
            throw error;
        }
    }

    async createBucket(bucketName: string): Promise<void> {
        try {
            await this.client.createBucket(bucketName);
            console.log(`[Shelby] Bucket '${bucketName}' created.`);
        } catch (error) {
            // Ignore if already exists
            console.log(`[Shelby] Bucket creation check: ${error.message}`);
        }
    }
}
