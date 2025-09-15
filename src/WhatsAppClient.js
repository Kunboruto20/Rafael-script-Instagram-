/**
 * Main WhatsApp Client Class
 * Orchestrates all modules and provides the main API
 */

const EventEmitter = require('events');
const AuthManager = require('./auth/AuthManager');
const MessageHandler = require('./messaging/MessageHandler');
const GroupManager = require('./groups/GroupManager');
const MediaHandler = require('./media/MediaHandler');
const TransportManager = require('./transport/TransportManager');
const CryptoManager = require('./crypto/CryptoManager');
const MultiDeviceSync = require('./sync/MultiDeviceSync');
const Logger = require('./utils/Logger');

class WhatsAppClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            phoneNumber: options.phoneNumber || null,
            deviceId: options.deviceId || this.generateDeviceId(),
            clientName: options.clientName || 'Yowsup2-Node',
            clientVersion: options.clientVersion || '2.23.24.84',
            logLevel: options.logLevel || 'info',
            ...options
        };
        
        this.logger = new Logger(this.options.logLevel);
        this.isConnected = false;
        this.isAuthenticated = false;
        this.sessionData = null;
        
        // Initialize modules
        this.authManager = new AuthManager(this);
        this.transportManager = new TransportManager(this);
        this.cryptoManager = new CryptoManager(this);
        this.messageHandler = new MessageHandler(this);
        this.groupManager = new GroupManager(this);
        this.mediaHandler = new MediaHandler(this);
        this.multiDeviceSync = new MultiDeviceSync(this);
        
        this.setupEventHandlers();
    }
    
    /**
     * Generate a unique device ID
     */
    generateDeviceId() {
        return 'YOWSUP2-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
    
    /**
     * Setup event handlers for all modules
     */
    setupEventHandlers() {
        // Auth events
        this.authManager.on('auth:success', (sessionData) => {
            this.isAuthenticated = true;
            this.sessionData = sessionData;
            this.emit('authenticated', sessionData);
            this.logger.info('Authentication successful');
        });
        
        this.authManager.on('auth:failed', (error) => {
            this.emit('auth:failed', error);
            this.logger.error('Authentication failed:', error);
        });
        
        // Transport events
        this.transportManager.on('transport:connected', () => {
            this.isConnected = true;
            this.emit('connected');
            this.logger.info('Connected to WhatsApp servers');
        });
        
        this.transportManager.on('transport:disconnected', () => {
            this.isConnected = false;
            this.emit('disconnected');
            this.logger.warn('Disconnected from WhatsApp servers');
        });
        
        this.transportManager.on('transport:error', (error) => {
            this.emit('error', error);
            this.logger.error('Transport error:', error);
        });
        
        // Message events
        this.messageHandler.on('message:received', (message) => {
            this.emit('message', message);
        });
        
        this.messageHandler.on('message:sent', (message) => {
            this.emit('message:sent', message);
        });
        
        // Group events
        this.groupManager.on('group:created', (group) => {
            this.emit('group:created', group);
        });
        
        this.groupManager.on('group:updated', (group) => {
            this.emit('group:updated', group);
        });
        
        // Multi-device sync events
        this.multiDeviceSync.on('sync:completed', (stats) => {
            this.emit('sync:completed', stats);
        });
        
        this.multiDeviceSync.on('device:added', (device) => {
            this.emit('device:added', device);
        });
        
        this.multiDeviceSync.on('device:removed', (deviceId) => {
            this.emit('device:removed', deviceId);
        });
    }
    
    /**
     * Start the WhatsApp client
     */
    async start() {
        try {
            this.logger.info('Starting WhatsApp client...');
            
            // Initialize crypto
            await this.cryptoManager.initialize();
            
            // Start transport
            await this.transportManager.connect();
            
            // Attempt authentication
            await this.authManager.authenticate();
            
            // Initialize multi-device sync
            await this.multiDeviceSync.initialize();
            
            this.emit('ready');
            this.logger.info('WhatsApp client started successfully');
            
        } catch (error) {
            this.emit('error', error);
            this.logger.error('Failed to start client:', error);
            throw error;
        }
    }
    
    /**
     * Stop the WhatsApp client
     */
    async stop() {
        try {
            this.logger.info('Stopping WhatsApp client...');
            
            await this.transportManager.disconnect();
            await this.multiDeviceSync.cleanup();
            this.isConnected = false;
            this.isAuthenticated = false;
            
            this.emit('stopped');
            this.logger.info('WhatsApp client stopped');
            
        } catch (error) {
            this.emit('error', error);
            this.logger.error('Error stopping client:', error);
            throw error;
        }
    }
    
    /**
     * Send a text message
     */
    async sendMessage(to, text) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.messageHandler.sendTextMessage(to, text);
    }
    
    /**
     * Send media message
     */
    async sendMedia(to, mediaData, type = 'image') {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.mediaHandler.sendMedia(to, mediaData, type);
    }
    
    /**
     * Create a group
     */
    async createGroup(name, participants = []) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.groupManager.createGroup(name, participants);
    }
    
    /**
     * Get group information
     */
    async getGroupInfo(groupId) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.groupManager.getGroupInfo(groupId);
    }
    
    /**
     * Add participants to group
     */
    async addGroupParticipants(groupId, participants) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.groupManager.addParticipants(groupId, participants);
    }
    
    /**
     * Remove participants from group
     */
    async removeGroupParticipants(groupId, participants) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.groupManager.removeParticipants(groupId, participants);
    }
    
    /**
     * Get contact information
     */
    async getContactInfo(contactId) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.messageHandler.getContactInfo(contactId);
    }
    
    /**
     * Set online status
     */
    async setOnlineStatus(isOnline) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.messageHandler.setPresence(isOnline);
    }
    
    /**
     * Mark message as read
     */
    async markAsRead(messageId, from) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.messageHandler.markAsRead(messageId, from);
    }
    
    /**
     * Get client status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            phoneNumber: this.options.phoneNumber,
            deviceId: this.options.deviceId,
            syncStatus: this.multiDeviceSync.getSyncStatus()
        };
    }
    
    /**
     * Force synchronization with other devices
     */
    async forceSync() {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.multiDeviceSync.forceSync();
    }
    
    /**
     * Get connected devices
     */
    getConnectedDevices() {
        return this.multiDeviceSync.getSyncStatus().devices;
    }
    
    /**
     * Add new device
     */
    async addDevice(deviceInfo) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.multiDeviceSync.addDevice(deviceInfo);
    }
    
    /**
     * Remove device
     */
    async removeDevice(deviceId) {
        if (!this.isAuthenticated) {
            throw new Error('Client not authenticated');
        }
        
        return await this.multiDeviceSync.removeDevice(deviceId);
    }
}

module.exports = WhatsAppClient;