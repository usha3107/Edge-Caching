import crypto from 'crypto';

export function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function getExpiryDate(minutes: number): Date {
    const now = new Date();
    return new Date(now.getTime() + minutes * 60000);
}
