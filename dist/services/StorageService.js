"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class StorageService {
    constructor() {
        this.storagePath = process.env.STORAGE_PATH || './storage';
    }
    async saveFile(key, content) {
        const filePath = path_1.default.join(this.storagePath, key);
        const dir = path_1.default.dirname(filePath);
        // Ensure directory exists
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(filePath, content);
        return key;
    }
    async getFile(key) {
        const filePath = path_1.default.join(this.storagePath, key);
        return await promises_1.default.readFile(filePath);
    }
    async deleteFile(key) {
        const filePath = path_1.default.join(this.storagePath, key);
        try {
            await promises_1.default.unlink(filePath);
        }
        catch (err) {
            // Log error or ignore if file doesn't exist
            console.error(`Failed to delete file ${key}:`, err);
        }
    }
    getPublicUrl(key) {
        // In a real scenario, this would be the S3/CDN URL
        return `/assets/download/${key}`;
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
