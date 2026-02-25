import fs from 'fs/promises';
import path from 'path';

export class StorageService {
    private storagePath: string;

    constructor() {
        this.storagePath = process.env.STORAGE_PATH || './storage';
    }

    async saveFile(key: string, content: Buffer): Promise<string> {
        const filePath = path.join(this.storagePath, key);
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content);
        return key;
    }

    async getFile(key: string): Promise<Buffer> {
        const filePath = path.join(this.storagePath, key);
        return await fs.readFile(filePath);
    }

    async deleteFile(key: string): Promise<void> {
        const filePath = path.join(this.storagePath, key);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.error(`Failed to delete file ${key}:`, err);
        }
    }

    getPublicUrl(key: string): string {
        return `/assets/download/${key}`;
    }
}

export const storageService = new StorageService();
