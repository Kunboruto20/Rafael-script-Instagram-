/**
 * Message Handler
 * Handles sending and receiving text messages, media, and control messages
 */

const EventEmitter = require('events');
const Logger = require('../utils/Logger');

class MessageHandler extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.logger = new Logger('MessageHandler');
        this.messageQueue = [];
        this.sentMessages = new Map();
        this.receivedMessages = new Map();
    }
    
    /**
     * Send text message
     */
    async sendTextMessage(to, text) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Sending text message to ${to}`);
            
            // Create message object
            const message = {
                id: this.generateMessageId(),
                to: to,
                type: 'text',
                content: text,
                timestamp: Date.now(),
                status: 'sending'
            };
            
            // Encrypt message
            const encryptedMessage = await this.client.cryptoManager.encryptMessage(to, {
                type: 'text',
                content: text
            });
            
            // Send via transport
            const transportId = await this.client.transportManager.sendTextMessage(to, text);
            
            // Update message with transport ID
            message.transportId = transportId;
            message.status = 'sent';
            
            // Store sent message
            this.sentMessages.set(message.id, message);
            
            this.emit('message:sent', message);
            this.logger.info(`Text message sent to ${to}`);
            
            return message;
            
        } catch (error) {
            this.logger.error('Failed to send text message:', error);
            throw error;
        }
    }
    
    /**
     * Send media message
     */
    async sendMediaMessage(to, mediaData, mediaType) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Sending ${mediaType} message to ${to}`);
            
            // Process media data
            const processedMedia = await this.processMediaData(mediaData, mediaType);
            
            // Create message object
            const message = {
                id: this.generateMessageId(),
                to: to,
                type: 'media',
                mediaType: mediaType,
                content: processedMedia,
                timestamp: Date.now(),
                status: 'sending'
            };
            
            // Encrypt message
            const encryptedMessage = await this.client.cryptoManager.encryptMessage(to, {
                type: 'media',
                mediaType: mediaType,
                content: processedMedia
            });
            
            // Send via transport
            const transportId = await this.client.transportManager.sendMediaMessage(to, processedMedia, mediaType);
            
            // Update message with transport ID
            message.transportId = transportId;
            message.status = 'sent';
            
            // Store sent message
            this.sentMessages.set(message.id, message);
            
            this.emit('message:sent', message);
            this.logger.info(`${mediaType} message sent to ${to}`);
            
            return message;
            
        } catch (error) {
            this.logger.error('Failed to send media message:', error);
            throw error;
        }
    }
    
    /**
     * Send group message
     */
    async sendGroupMessage(groupId, text) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Sending group message to ${groupId}`);
            
            // Create message object
            const message = {
                id: this.generateMessageId(),
                groupId: groupId,
                type: 'text',
                content: text,
                timestamp: Date.now(),
                status: 'sending'
            };
            
            // Encrypt message
            const encryptedMessage = await this.client.cryptoManager.encryptMessage(groupId, {
                type: 'text',
                content: text
            });
            
            // Send via transport
            const transportId = await this.client.transportManager.sendGroupMessage(groupId, text);
            
            // Update message with transport ID
            message.transportId = transportId;
            message.status = 'sent';
            
            // Store sent message
            this.sentMessages.set(message.id, message);
            
            this.emit('message:sent', message);
            this.logger.info(`Group message sent to ${groupId}`);
            
            return message;
            
        } catch (error) {
            this.logger.error('Failed to send group message:', error);
            throw error;
        }
    }
    
    /**
     * Handle incoming message
     */
    async handleIncomingMessage(messageData) {
        try {
            this.logger.debug('Handling incoming message:', messageData);
            
            // Decrypt message
            const decryptedMessage = await this.client.cryptoManager.decryptMessage(
                messageData.from,
                messageData.encryptedContent
            );
            
            // Create message object
            const message = {
                id: messageData.id,
                from: messageData.from,
                type: decryptedMessage.type,
                content: decryptedMessage.content,
                timestamp: decryptedMessage.timestamp,
                status: 'received'
            };
            
            // Store received message
            this.receivedMessages.set(message.id, message);
            
            // Emit message event
            this.emit('message:received', message);
            
            // Send read receipt
            await this.sendReadReceipt(message.id, message.from);
            
            this.logger.info(`Message received from ${message.from}`);
            
            return message;
            
        } catch (error) {
            this.logger.error('Failed to handle incoming message:', error);
            throw error;
        }
    }
    
    /**
     * Send read receipt
     */
    async sendReadReceipt(messageId, from) {
        try {
            this.logger.debug(`Sending read receipt for message ${messageId}`);
            
            await this.client.transportManager.sendReadReceipt(messageId, from);
            
        } catch (error) {
            this.logger.error('Failed to send read receipt:', error);
        }
    }
    
    /**
     * Mark message as read
     */
    async markAsRead(messageId, from) {
        try {
            this.logger.info(`Marking message ${messageId} as read`);
            
            await this.client.transportManager.sendReadReceipt(messageId, from);
            
            // Update local message status
            const message = this.receivedMessages.get(messageId);
            if (message) {
                message.status = 'read';
            }
            
        } catch (error) {
            this.logger.error('Failed to mark message as read:', error);
            throw error;
        }
    }
    
    /**
     * Send typing indicator
     */
    async sendTypingIndicator(to, isTyping) {
        try {
            this.logger.debug(`Sending typing indicator to ${to}: ${isTyping}`);
            
            await this.client.transportManager.sendTypingIndicator(to, isTyping);
            
        } catch (error) {
            this.logger.error('Failed to send typing indicator:', error);
        }
    }
    
    /**
     * Set presence status
     */
    async setPresence(isOnline) {
        try {
            this.logger.info(`Setting presence: ${isOnline ? 'online' : 'offline'}`);
            
            await this.client.transportManager.sendPresenceUpdate(isOnline);
            
        } catch (error) {
            this.logger.error('Failed to set presence:', error);
            throw error;
        }
    }
    
    /**
     * Get contact information
     */
    async getContactInfo(contactId) {
        try {
            this.logger.info(`Getting contact info for ${contactId}`);
            
            // In a real implementation, this would query WhatsApp servers
            // For now, return basic info
            return {
                id: contactId,
                name: contactId,
                status: 'unknown',
                lastSeen: null,
                isOnline: false
            };
            
        } catch (error) {
            this.logger.error('Failed to get contact info:', error);
            throw error;
        }
    }
    
    /**
     * Process media data
     */
    async processMediaData(mediaData, mediaType) {
        try {
            switch (mediaType) {
                case 'image':
                    return await this.processImage(mediaData);
                case 'video':
                    return await this.processVideo(mediaData);
                case 'audio':
                    return await this.processAudio(mediaData);
                case 'document':
                    return await this.processDocument(mediaData);
                default:
                    throw new Error(`Unsupported media type: ${mediaType}`);
            }
        } catch (error) {
            this.logger.error('Failed to process media data:', error);
            throw error;
        }
    }
    
    /**
     * Process image data
     */
    async processImage(imageData) {
        try {
            // In a real implementation, this would:
            // 1. Validate image format
            // 2. Resize if necessary
            // 3. Compress image
            // 4. Generate thumbnail
            
            return {
                type: 'image',
                data: imageData,
                mimeType: 'image/jpeg',
                size: imageData.length,
                thumbnail: null // Would generate thumbnail
            };
            
        } catch (error) {
            this.logger.error('Failed to process image:', error);
            throw error;
        }
    }
    
    /**
     * Process video data
     */
    async processVideo(videoData) {
        try {
            return {
                type: 'video',
                data: videoData,
                mimeType: 'video/mp4',
                size: videoData.length,
                duration: 0, // Would extract from video
                thumbnail: null // Would generate thumbnail
            };
            
        } catch (error) {
            this.logger.error('Failed to process video:', error);
            throw error;
        }
    }
    
    /**
     * Process audio data
     */
    async processAudio(audioData) {
        try {
            return {
                type: 'audio',
                data: audioData,
                mimeType: 'audio/ogg',
                size: audioData.length,
                duration: 0 // Would extract from audio
            };
            
        } catch (error) {
            this.logger.error('Failed to process audio:', error);
            throw error;
        }
    }
    
    /**
     * Process document data
     */
    async processDocument(documentData) {
        try {
            return {
                type: 'document',
                data: documentData,
                mimeType: 'application/octet-stream',
                size: documentData.length,
                filename: 'document'
            };
            
        } catch (error) {
            this.logger.error('Failed to process document:', error);
            throw error;
        }
    }
    
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }
    
    /**
     * Get message by ID
     */
    getMessage(messageId) {
        return this.sentMessages.get(messageId) || this.receivedMessages.get(messageId);
    }
    
    /**
     * Get all messages
     */
    getAllMessages() {
        return {
            sent: Array.from(this.sentMessages.values()),
            received: Array.from(this.receivedMessages.values())
        };
    }
    
    /**
     * Clear message history
     */
    clearHistory() {
        this.sentMessages.clear();
        this.receivedMessages.clear();
        this.logger.info('Message history cleared');
    }
}

module.exports = MessageHandler;