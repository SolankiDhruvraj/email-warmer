import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_development_secret_key32"; // Must be strictly 32 bytes
const INITIALIZATION_VECTOR_LENGTH = 16;

export function encrypt(text: string): string {
    if (!text || typeof text !== "string") return text;
    
    // Graceful check if text is already encrypted (contains IV separator ':')
    if (text.includes(':')) {
        const parts = text.split(':');
        if (parts.length === 2 && parts[0].length === 32) return text; 
    }
    
    try {
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const iv = crypto.randomBytes(INITIALIZATION_VECTOR_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', key as any, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (e) {
        console.error("Encryption error", e);
        return text; // fallback to plain if encryption fails severely
    }
}

export function decrypt(text: string): string {
    if (!text || typeof text !== "string") return text;
    if (!text.includes(':')) return text; // Not encrypted, return plain text
    
    try {
        const textParts = text.split(':');
        const ivHex = textParts.shift() || "";
        const encryptedTextHex = textParts.join(':');
        
        if (ivHex.length !== 32) return text; // Not a valid IV hex string length
        
        const iv = Buffer.from(ivHex, 'hex');
        
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key as any, iv);
        let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch(err) {
        console.error("Decryption error", err);
        return text; // Fallback to raw text if decryption fails (e.g. wrong key)
    }
}
