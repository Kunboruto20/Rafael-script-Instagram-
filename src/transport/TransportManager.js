/**
 * Transport Manager
 * Handles TCP/HTTPS binary protocol communication with WhatsApp servers
 */

const EventEmitter = require('events');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const Logger = require('../utils/Logger');

class TransportManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.logger = new Logger('TransportManager');
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.buffer = Buffer.alloc(0);
    }
    
    /**
     * Connect to WhatsApp servers
     */
    async connect() {
        try {
            this.logger.info('Connecting to WhatsApp servers...');
            
            // WhatsApp uses different endpoints for different regions
            const endpoints = this.getEndpoints();
            const endpoint = endpoints[0]; // Use primary endpoint
            
            this.logger.info(`Connecting to ${endpoint.host}:${endpoint.port}`);
            
            // Create TLS socket
            this.socket = tls.connect({
                host: endpoint.host,
                port: endpoint.port,
                rejectUnauthorized: false // WhatsApp uses self-signed certificates
            });
            
            this.setupSocketHandlers();
            
            // Wait for connection
            await new Promise((resolve, reject) => {
                this.socket.once('connect', resolve);
                this.socket.once('error', reject);
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 30000);
            });
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Start heartbeat
            this.startHeartbeat();
            
            this.emit('transport:connected');
            this.logger.info('Connected to WhatsApp servers');
            
        } catch (error) {
            this.logger.error('Connection failed:', error);
            this.emit('transport:error', error);
            throw error;
        }
    }
    
    /**
     * Disconnect from WhatsApp servers
     */
    async disconnect() {
        try {
            this.logger.info('Disconnecting from WhatsApp servers...');
            
            this.isConnected = false;
            
            // Stop heartbeat
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            // Close socket
            if (this.socket) {
                this.socket.destroy();
                this.socket = null;
            }
            
            this.emit('transport:disconnected');
            this.logger.info('Disconnected from WhatsApp servers');
            
        } catch (error) {
            this.logger.error('Disconnect error:', error);
            throw error;
        }
    }
    
    /**
     * Setup socket event handlers
     */
    setupSocketHandlers() {
        this.socket.on('connect', () => {
            this.logger.info('Socket connected');
        });
        
        this.socket.on('data', (data) => {
            this.handleIncomingData(data);
        });
        
        this.socket.on('error', (error) => {
            this.logger.error('Socket error:', error);
            this.handleConnectionError(error);
        });
        
        this.socket.on('close', () => {
            this.logger.warn('Socket closed');
            this.handleConnectionClose();
        });
        
        this.socket.on('end', () => {
            this.logger.warn('Socket ended');
            this.handleConnectionClose();
        });
    }
    
    /**
     * Handle incoming data from server
     */
    handleIncomingData(data) {
        try {
            // Append to buffer
            this.buffer = Buffer.concat([this.buffer, data]);
            
            // Process complete messages
            while (this.buffer.length > 0) {
                const message = this.parseMessage();
                if (!message) break;
                
                this.handleMessage(message);
            }
            
        } catch (error) {
            this.logger.error('Error handling incoming data:', error);
            this.emit('transport:error', error);
        }
    }
    
    /**
     * Parse message from buffer
     */
    parseMessage() {
        if (this.buffer.length < 3) return null;
        
        // WhatsApp uses a simple length-prefixed protocol
        const length = this.buffer.readUInt16BE(0);
        
        if (this.buffer.length < length + 2) return null;
        
        // Extract message
        const message = this.buffer.slice(2, length + 2);
        this.buffer = this.buffer.slice(length + 2);
        
        return this.decodeMessage(message);
    }
    
    /**
     * Decode binary message
     */
    decodeMessage(data) {
        try {
            // Simple binary protocol implementation
            // In reality, WhatsApp uses a more complex protobuf-based protocol
            
            const message = {
                type: data.readUInt8(0),
                id: data.readUInt32BE(1),
                timestamp: data.readUInt32BE(5),
                data: data.slice(9)
            };
            
            return message;
            
        } catch (error) {
            this.logger.error('Error decoding message:', error);
            return null;
        }
    }
    
    /**
     * Handle parsed message
     */
    handleMessage(message) {
        try {
            this.logger.debug('Received message:', message);
            
            // Route message to appropriate handler
            switch (message.type) {
                case 0x01: // Text message
                    this.emit('message:text', message);
                    break;
                case 0x02: // Media message
                    this.emit('message:media', message);
                    break;
                case 0x03: // Group message
                    this.emit('message:group', message);
                    break;
                case 0x04: // Presence update
                    this.emit('presence:update', message);
                    break;
                case 0x05: // Typing indicator
                    this.emit('typing:indicator', message);
                    break;
                case 0x06: // Read receipt
                    this.emit('receipt:read', message);
                    break;
                case 0x07: // Delivery receipt
                    this.emit('receipt:delivered', message);
                    break;
                case 0x08: // Heartbeat response
                    this.emit('heartbeat:response', message);
                    break;
                default:
                    this.logger.warn('Unknown message type:', message.type);
            }
            
        } catch (error) {
            this.logger.error('Error handling message:', error);
        }
    }
    
    /**
     * Send message to server
     */
    async sendMessage(type, data, id = null) {
        try {
            if (!this.isConnected || !this.socket) {
                throw new Error('Not connected to server');
            }
            
            const messageId = id || this.generateMessageId();
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Create message buffer
            const messageBuffer = Buffer.alloc(9 + data.length);
            messageBuffer.writeUInt8(type, 0);
            messageBuffer.writeUInt32BE(messageId, 1);
            messageBuffer.writeUInt32BE(timestamp, 5);
            data.copy(messageBuffer, 9);
            
            // Add length prefix
            const lengthBuffer = Buffer.alloc(2);
            lengthBuffer.writeUInt16BE(messageBuffer.length, 0);
            
            const fullMessage = Buffer.concat([lengthBuffer, messageBuffer]);
            
            this.socket.write(fullMessage);
            
            this.logger.debug('Sent message:', { type, id: messageId, length: data.length });
            
            return messageId;
            
        } catch (error) {
            this.logger.error('Error sending message:', error);
            throw error;
        }
    }
    
    /**
     * Send text message
     */
    async sendTextMessage(to, text) {
        const data = Buffer.from(JSON.stringify({
            to: to,
            text: text
        }));
        
        return await this.sendMessage(0x01, data);
    }
    
    /**
     * Send media message
     */
    async sendMediaMessage(to, mediaData, mediaType) {
        const data = Buffer.from(JSON.stringify({
            to: to,
            media: mediaData,
            type: mediaType
        }));
        
        return await this.sendMessage(0x02, data);
    }
    
    /**
     * Send group message
     */
    async sendGroupMessage(groupId, text) {
        const data = Buffer.from(JSON.stringify({
            groupId: groupId,
            text: text
        }));
        
        return await this.sendMessage(0x03, data);
    }
    
    /**
     * Send presence update
     */
    async sendPresenceUpdate(isOnline) {
        const data = Buffer.from(JSON.stringify({
            online: isOnline,
            lastSeen: Date.now()
        }));
        
        return await this.sendMessage(0x04, data);
    }
    
    /**
     * Send typing indicator
     */
    async sendTypingIndicator(to, isTyping) {
        const data = Buffer.from(JSON.stringify({
            to: to,
            typing: isTyping
        }));
        
        return await this.sendMessage(0x05, data);
    }
    
    /**
     * Send read receipt
     */
    async sendReadReceipt(messageId, from) {
        const data = Buffer.from(JSON.stringify({
            messageId: messageId,
            from: from
        }));
        
        return await this.sendMessage(0x06, data);
    }
    
    /**
     * Handle connection error
     */
    handleConnectionError(error) {
        this.isConnected = false;
        this.emit('transport:error', error);
        
        // Attempt reconnection
        this.attemptReconnect();
    }
    
    /**
     * Handle connection close
     */
    handleConnectionClose() {
        this.isConnected = false;
        this.emit('transport:disconnected');
        
        // Attempt reconnection
        this.attemptReconnect();
    }
    
    /**
     * Attempt to reconnect
     */
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached');
            this.emit('transport:max_reconnect_attempts');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        this.logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                this.logger.error('Reconnection failed:', error);
            }
        }, delay);
    }
    
    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.sendHeartbeat();
            } catch (error) {
                this.logger.error('Heartbeat failed:', error);
            }
        }, 30000); // Send heartbeat every 30 seconds
    }
    
    /**
     * Send heartbeat message
     */
    async sendHeartbeat() {
        const data = Buffer.from(JSON.stringify({
            timestamp: Date.now()
        }));
        
        return await this.sendMessage(0x08, data);
    }
    
    /**
     * Get WhatsApp server endpoints
     */
    getEndpoints() {
        return [
            { host: 'e1.whatsapp.net', port: 443 },
            { host: 'e2.whatsapp.net', port: 443 },
            { host: 'e3.whatsapp.net', port: 443 },
            { host: 'e4.whatsapp.net', port: 443 },
            { host: 'e5.whatsapp.net', port: 443 }
        ];
    }
    
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }
    
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

module.exports = TransportManager;