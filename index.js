/**
 * Yowsup2 - Node.js WhatsApp Client
 * Mobile App Emulation Library
 */

const WhatsAppClient = require('./src/WhatsAppClient');
const AuthManager = require('./src/auth/AuthManager');
const MessageHandler = require('./src/messaging/MessageHandler');
const GroupManager = require('./src/groups/GroupManager');
const MediaHandler = require('./src/media/MediaHandler');
const MultiDeviceSync = require('./src/sync/MultiDeviceSync');
const Logger = require('./src/utils/Logger');

module.exports = {
    WhatsAppClient,
    AuthManager,
    MessageHandler,
    GroupManager,
    MediaHandler,
    MultiDeviceSync,
    Logger
};

// Example usage
if (require.main === module) {
    const client = new WhatsAppClient();
    
    client.on('ready', () => {
        console.log('WhatsApp client is ready!');
    });
    
    client.on('message', (message) => {
        console.log('Received message:', message);
    });
    
    client.on('error', (error) => {
        console.error('Client error:', error);
    });
    
    // Start the client
    client.start();
}