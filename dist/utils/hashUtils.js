"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateETag = generateETag;
exports.generateETagFromBuffer = generateETagFromBuffer;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates a strong ETag based on SHA-256 hash of the content.
 */
function generateETag(content) {
    const hash = crypto_1.default.createHash("sha256");
    hash.update(content);
    return `"${hash.digest("hex")}"`; // ETags must be quoted
}
/**
 * Generates an ETag from a file stream. (Placeholder for larger files)
 */
async function generateETagFromBuffer(buffer) {
    return generateETag(buffer);
}
