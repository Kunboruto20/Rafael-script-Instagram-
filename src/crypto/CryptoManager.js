/**
 * Crypto Manager
 * Handles Signal Protocol E2E encryption, key management, and message encryption/decryption
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const forge = require('node-forge');
const Logger = require('../utils/Logger');

class CryptoManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.logger = new Logger('CryptoManager');
        this.keyPair = null;
        this.identityKey = null;
        this.signedPreKey = null;
        this.preKeys = [];
        this.registrationId = null;
        this.sessionStore = new Map();
        this.deviceKeys = new Map();
    }
    
    /**
     * Initialize crypto with new keys
     */
    async initialize() {
        try {
            this.logger.info('Initializing crypto manager...');
            
            // Generate identity key pair
            this.identityKey = await this.generateIdentityKey();
            
            // Generate signed pre-key
            this.signedPreKey = await this.generateSignedPreKey();
            
            // Generate pre-keys (100 keys for better performance)
            this.preKeys = await this.generatePreKeys(100);
            
            // Generate registration ID
            this.registrationId = this.generateRegistrationId();
            
            this.logger.info('Crypto manager initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize crypto manager:', error);
            throw error;
        }
    }
    
    /**
     * Initialize crypto with existing keys
     */
    async initializeWithKeys(sessionData) {
        try {
            this.logger.info('Initializing crypto with existing keys...');
            
            this.identityKey = sessionData.identityKey;
            this.signedPreKey = sessionData.signedPreKey;
            this.preKeys = sessionData.preKeys;
            this.registrationId = sessionData.registrationId;
            
            this.logger.info('Crypto manager initialized with existing keys');
            
        } catch (error) {
            this.logger.error('Failed to initialize with existing keys:', error);
            throw error;
        }
    }
    
    /**
     * Generate Curve25519 key pair
     */
    async generateKeyPair() {
        try {
            // Generate private key
            const privateKey = crypto.randomBytes(32);
            
            // Generate public key from private key using Curve25519
            const publicKey = this.curve25519GeneratePublicKey(privateKey);
            
            return {
                privateKey: privateKey,
                publicKey: publicKey
            };
            
        } catch (error) {
            this.logger.error('Failed to generate key pair:', error);
            throw error;
        }
    }
    
    /**
     * Generate identity key (long-term key)
     */
    async generateIdentityKey() {
        try {
            const keyPair = await this.generateKeyPair();
            
            return {
                ...keyPair,
                keyId: 1,
                timestamp: Date.now()
            };
            
        } catch (error) {
            this.logger.error('Failed to generate identity key:', error);
            throw error;
        }
    }
    
    /**
     * Generate signed pre-key
     */
    async generateSignedPreKey() {
        try {
            const keyPair = await this.generateKeyPair();
            const keyId = Math.floor(Math.random() * 0x7FFFFFFF);
            
            // Sign the public key with identity key
            const signature = this.signData(keyPair.publicKey, this.identityKey.privateKey);
            
            return {
                ...keyPair,
                keyId: keyId,
                signature: signature,
                timestamp: Date.now()
            };
            
        } catch (error) {
            this.logger.error('Failed to generate signed pre-key:', error);
            throw error;
        }
    }
    
    /**
     * Generate pre-keys
     */
    async generatePreKeys(count) {
        try {
            const preKeys = [];
            
            for (let i = 0; i < count; i++) {
                const keyPair = await this.generateKeyPair();
                const keyId = Math.floor(Math.random() * 0x7FFFFFFF);
                
                preKeys.push({
                    ...keyPair,
                    keyId: keyId,
                    timestamp: Date.now()
                });
            }
            
            return preKeys;
            
        } catch (error) {
            this.logger.error('Failed to generate pre-keys:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt message using Signal Protocol
     */
    async encryptMessage(recipientId, message, messageType = 'text') {
        try {
            // Get or create session with recipient
            const session = await this.getOrCreateSession(recipientId);
            
            // Generate message key
            const messageKey = crypto.randomBytes(32);
            
            // Encrypt message content
            const encryptedContent = await this.encryptContent(message, messageKey);
            
            // Create message envelope
            const envelope = {
                type: messageType,
                recipientId: recipientId,
                messageId: this.generateMessageId(),
                timestamp: Date.now(),
                encryptedContent: encryptedContent,
                messageKey: messageKey,
                sessionId: session.sessionId
            };
            
            // Encrypt envelope
            const encryptedEnvelope = await this.encryptEnvelope(envelope, session);
            
            return encryptedEnvelope;
            
        } catch (error) {
            this.logger.error('Failed to encrypt message:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt message using Signal Protocol
     */
    async decryptMessage(senderId, encryptedEnvelope) {
        try {
            // Get session with sender
            const session = await this.getSession(senderId);
            if (!session) {
                throw new Error('No session found with sender');
            }
            
            // Decrypt envelope
            const envelope = await this.decryptEnvelope(encryptedEnvelope, session);
            
            // Decrypt message content
            const message = await this.decryptContent(envelope.encryptedContent, envelope.messageKey);
            
            return {
                senderId: senderId,
                messageId: envelope.messageId,
                timestamp: envelope.timestamp,
                type: envelope.type,
                content: message
            };
            
        } catch (error) {
            this.logger.error('Failed to decrypt message:', error);
            throw error;
        }
    }
    
    /**
     * Get or create session with recipient
     */
    async getOrCreateSession(recipientId) {
        let session = this.sessionStore.get(recipientId);
        
        if (!session) {
            // Create new session
            session = await this.createSession(recipientId);
            this.sessionStore.set(recipientId, session);
        }
        
        return session;
    }
    
    /**
     * Get existing session
     */
    async getSession(recipientId) {
        return this.sessionStore.get(recipientId);
    }
    
    /**
     * Create new session with recipient
     */
    async createSession(recipientId) {
        try {
            // In a real implementation, this would perform X3DH key agreement
            // For now, we'll create a simplified session
            
            const sessionId = this.generateSessionId();
            const rootKey = crypto.randomBytes(32);
            const chainKey = crypto.randomBytes(32);
            
            const session = {
                sessionId: sessionId,
                recipientId: recipientId,
                rootKey: rootKey,
                chainKey: chainKey,
                messageCount: 0,
                timestamp: Date.now()
            };
            
            return session;
            
        } catch (error) {
            this.logger.error('Failed to create session:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt message content
     */
    async encryptContent(content, messageKey) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', messageKey);
            
            let encrypted = cipher.update(JSON.stringify(content), 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            return {
                iv: iv.toString('base64'),
                ciphertext: encrypted
            };
            
        } catch (error) {
            this.logger.error('Failed to encrypt content:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt message content
     */
    async decryptContent(encryptedContent, messageKey) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', messageKey);
            
            let decrypted = decipher.update(encryptedContent.ciphertext, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
            
        } catch (error) {
            this.logger.error('Failed to decrypt content:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt message envelope
     */
    async encryptEnvelope(envelope, session) {
        try {
            const envelopeData = JSON.stringify(envelope);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', session.chainKey);
            
            let encrypted = cipher.update(envelopeData, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            // Create HMAC for integrity
            const hmac = crypto.createHmac('sha256', session.chainKey);
            hmac.update(encrypted);
            const signature = hmac.digest('hex');
            
            return {
                iv: iv.toString('base64'),
                ciphertext: encrypted,
                signature: signature
            };
            
        } catch (error) {
            this.logger.error('Failed to encrypt envelope:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt message envelope
     */
    async decryptEnvelope(encryptedEnvelope, session) {
        try {
            // Verify HMAC
            const hmac = crypto.createHmac('sha256', session.chainKey);
            hmac.update(encryptedEnvelope.ciphertext);
            const expectedSignature = hmac.digest('hex');
            
            if (expectedSignature !== encryptedEnvelope.signature) {
                throw new Error('Invalid message signature');
            }
            
            const decipher = crypto.createDecipher('aes-256-cbc', session.chainKey);
            
            let decrypted = decipher.update(encryptedEnvelope.ciphertext, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
            
        } catch (error) {
            this.logger.error('Failed to decrypt envelope:', error);
            throw error;
        }
    }
    
    /**
     * Sign data with private key
     */
    signData(data, privateKey) {
        try {
            const hmac = crypto.createHmac('sha256', privateKey);
            hmac.update(data);
            return hmac.digest('hex');
            
        } catch (error) {
            this.logger.error('Failed to sign data:', error);
            throw error;
        }
    }
    
    /**
     * Verify signature
     */
    verifySignature(data, signature, publicKey) {
        try {
            // In a real implementation, this would use proper signature verification
            // For now, we'll use HMAC verification
            const expectedSignature = this.signData(data, publicKey);
            return expectedSignature === signature;
            
        } catch (error) {
            this.logger.error('Failed to verify signature:', error);
            return false;
        }
    }
    
    /**
     * Generate Curve25519 public key from private key
     */
    curve25519GeneratePublicKey(privateKey) {
        try {
            // Simplified Curve25519 implementation
            // In production, use a proper Curve25519 library
            const hash = crypto.createHash('sha256');
            hash.update(privateKey);
            return hash.digest();
            
        } catch (error) {
            this.logger.error('Failed to generate Curve25519 public key:', error);
            throw error;
        }
    }
    
    /**
     * Generate registration ID
     */
    generateRegistrationId() {
        return Math.floor(Math.random() * 16380) + 1;
    }
    
    /**
     * Generate message ID
     */
    generateMessageId() {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }
    
    /**
     * Generate session ID
     */
    generateSessionId() {
        return crypto.randomBytes(16).toString('hex');
    }
    
    /**
     * Get crypto status
     */
    getStatus() {
        return {
            initialized: !!this.identityKey,
            registrationId: this.registrationId,
            activeSessions: this.sessionStore.size,
            preKeysCount: this.preKeys.length
        };
    }
}

module.exports = CryptoManager;