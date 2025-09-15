/**
 * Authentication Manager
 * Handles SMS authentication and session management
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const axios = require('axios');
const Logger = require('../utils/Logger');

class AuthManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.logger = new Logger('AuthManager');
        this.sessionData = null;
        this.authState = 'disconnected'; // disconnected, requesting_code, code_sent, authenticating, authenticated
    }
    
    /**
     * Start authentication process
     */
    async authenticate() {
        try {
            this.logger.info('Starting authentication process...');
            
            if (!this.client.options.phoneNumber) {
                throw new Error('Phone number is required for authentication');
            }
            
            // Check if we have existing session
            if (this.hasValidSession()) {
                this.logger.info('Using existing session');
                await this.restoreSession();
                return;
            }
            
            // Request SMS code
            await this.requestSMSCode();
            
        } catch (error) {
            this.emit('auth:failed', error);
            throw error;
        }
    }
    
    /**
     * Request SMS verification code
     */
    async requestSMSCode() {
        try {
            this.authState = 'requesting_code';
            this.logger.info(`Requesting SMS code for ${this.client.options.phoneNumber}`);
            
            const phoneNumber = this.normalizePhoneNumber(this.client.options.phoneNumber);
            
            // Generate registration request
            const registrationData = await this.generateRegistrationRequest(phoneNumber);
            
            // Send registration request to WhatsApp servers
            const response = await this.sendRegistrationRequest(registrationData);
            
            if (response.status === 'sent') {
                this.authState = 'code_sent';
                this.emit('auth:code_sent', {
                    phoneNumber: phoneNumber,
                    method: response.method || 'sms'
                });
                this.logger.info('SMS code sent successfully');
            } else {
                throw new Error('Failed to send SMS code');
            }
            
        } catch (error) {
            this.authState = 'disconnected';
            this.emit('auth:failed', error);
            throw error;
        }
    }
    
    /**
     * Verify SMS code and complete authentication
     */
    async verifySMSCode(code) {
        try {
            this.authState = 'authenticating';
            this.logger.info('Verifying SMS code...');
            
            const phoneNumber = this.normalizePhoneNumber(this.client.options.phoneNumber);
            
            // Generate verification request
            const verificationData = await this.generateVerificationRequest(phoneNumber, code);
            
            // Send verification request
            const response = await this.sendVerificationRequest(verificationData);
            
            if (response.status === 'success') {
                // Store session data
                this.sessionData = {
                    phoneNumber: phoneNumber,
                    deviceId: this.client.options.deviceId,
                    clientToken: response.clientToken,
                    serverToken: response.serverToken,
                    keyPair: response.keyPair,
                    registrationId: response.registrationId,
                    identityKey: response.identityKey,
                    signedPreKey: response.signedPreKey,
                    preKeys: response.preKeys,
                    timestamp: Date.now()
                };
                
                this.authState = 'authenticated';
                this.emit('auth:success', this.sessionData);
                this.logger.info('Authentication successful');
                
                // Save session for future use
                await this.saveSession();
                
            } else {
                throw new Error('Invalid SMS code or verification failed');
            }
            
        } catch (error) {
            this.authState = 'disconnected';
            this.emit('auth:failed', error);
            throw error;
        }
    }
    
    /**
     * Generate registration request
     */
    async generateRegistrationRequest(phoneNumber) {
        const deviceId = this.client.options.deviceId;
        const clientName = this.client.options.clientName;
        const clientVersion = this.client.options.clientVersion;
        
        // Generate key pair for this session
        const keyPair = await this.client.cryptoManager.generateKeyPair();
        
        return {
            phoneNumber: phoneNumber,
            deviceId: deviceId,
            clientName: clientName,
            clientVersion: clientVersion,
            publicKey: keyPair.publicKey,
            timestamp: Date.now()
        };
    }
    
    /**
     * Generate verification request
     */
    async generateVerificationRequest(phoneNumber, code) {
        return {
            phoneNumber: phoneNumber,
            code: code,
            deviceId: this.client.options.deviceId,
            timestamp: Date.now()
        };
    }
    
    /**
     * Send registration request to WhatsApp servers
     */
    async sendRegistrationRequest(data) {
        try {
            // This would normally connect to WhatsApp's registration endpoint
            // For now, we'll simulate the response
            this.logger.info('Sending registration request...');
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate successful response
            return {
                status: 'sent',
                method: 'sms',
                retryAfter: 30
            };
            
        } catch (error) {
            this.logger.error('Registration request failed:', error);
            throw error;
        }
    }
    
    /**
     * Send verification request to WhatsApp servers
     */
    async sendVerificationRequest(data) {
        try {
            this.logger.info('Sending verification request...');
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate successful verification
            return {
                status: 'success',
                clientToken: this.generateToken(),
                serverToken: this.generateToken(),
                keyPair: await this.client.cryptoManager.generateKeyPair(),
                registrationId: this.generateRegistrationId(),
                identityKey: await this.client.cryptoManager.generateIdentityKey(),
                signedPreKey: await this.client.cryptoManager.generateSignedPreKey(),
                preKeys: await this.client.cryptoManager.generatePreKeys(100)
            };
            
        } catch (error) {
            this.logger.error('Verification request failed:', error);
            throw error;
        }
    }
    
    /**
     * Check if we have a valid session
     */
    hasValidSession() {
        if (!this.sessionData) return false;
        
        // Check if session is not expired (24 hours)
        const sessionAge = Date.now() - this.sessionData.timestamp;
        return sessionAge < (24 * 60 * 60 * 1000);
    }
    
    /**
     * Restore existing session
     */
    async restoreSession() {
        try {
            this.logger.info('Restoring existing session...');
            
            // Initialize crypto with existing keys
            await this.client.cryptoManager.initializeWithKeys(this.sessionData);
            
            this.authState = 'authenticated';
            this.emit('auth:success', this.sessionData);
            this.logger.info('Session restored successfully');
            
        } catch (error) {
            this.logger.error('Failed to restore session:', error);
            throw error;
        }
    }
    
    /**
     * Save session data
     */
    async saveSession() {
        try {
            // In a real implementation, this would save to persistent storage
            this.logger.info('Session data saved');
        } catch (error) {
            this.logger.error('Failed to save session:', error);
        }
    }
    
    /**
     * Normalize phone number to international format
     */
    normalizePhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Add country code if not present
        if (!cleaned.startsWith('1') && cleaned.length === 10) {
            cleaned = '1' + cleaned; // Default to US
        }
        
        return cleaned;
    }
    
    /**
     * Generate a random token
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    /**
     * Generate registration ID
     */
    generateRegistrationId() {
        return Math.floor(Math.random() * 16380) + 1;
    }
    
    /**
     * Get current authentication state
     */
    getAuthState() {
        return {
            state: this.authState,
            authenticated: this.authState === 'authenticated',
            phoneNumber: this.sessionData?.phoneNumber || null
        };
    }
    
    /**
     * Logout and clear session
     */
    async logout() {
        try {
            this.logger.info('Logging out...');
            
            this.sessionData = null;
            this.authState = 'disconnected';
            
            this.emit('auth:logged_out');
            this.logger.info('Logged out successfully');
            
        } catch (error) {
            this.logger.error('Logout failed:', error);
            throw error;
        }
    }
}

module.exports = AuthManager;