# Yowsup2 - Node.js WhatsApp Client

A comprehensive Node.js library that emulates the official WhatsApp mobile application, providing complete functionality for messaging, media sharing, group management, and multi-device synchronization.

## 🚀 Features

### Core Functionality
- **SMS Authentication** - Complete phone number verification with SMS codes
- **End-to-End Encryption** - Signal Protocol implementation with Curve25519 and AES-256-CBC
- **Text & Media Messaging** - Send/receive text, images, videos, audio, documents, and stickers
- **Group Management** - Create, manage, and participate in group conversations
- **Multi-Device Sync** - Synchronize conversations across multiple devices
- **Presence Management** - Online status, last seen, and typing indicators
- **Automatic Reconnection** - Robust connection handling with automatic reconnection

### Technical Features
- **Pure JavaScript** - No TypeScript dependencies, works with any Node.js version
- **Modular Architecture** - Clean, maintainable code with separate modules
- **Binary Protocol** - Direct TCP/HTTPS communication with WhatsApp servers
- **Comprehensive Logging** - Detailed logging system for debugging and monitoring
- **Cross-Platform** - Works on Linux, Windows, macOS, and Termux

## 📦 Installation

```bash
npm install yowsup-2
```

## 🚀 Quick Start

```javascript
const WhatsAppClient = require('yowsup-2');

// Create client instance
const client = new WhatsAppClient({
    phoneNumber: '+1234567890',
    logLevel: 'info'
});

// Set up event listeners
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
```

## 📚 API Reference

### WhatsAppClient

The main client class that orchestrates all functionality.

#### Constructor Options

```javascript
const client = new WhatsAppClient({
    phoneNumber: '+1234567890',    // Required: Phone number with country code
    deviceId: 'YOWSUP2-ABC123',    // Optional: Custom device ID
    clientName: 'Yowsup2-Node',    // Optional: Client name
    clientVersion: '2.23.24.84',   // Optional: Client version
    logLevel: 'info'               // Optional: Log level (error, warn, info, debug)
});
```

#### Methods

##### Authentication
```javascript
// Start authentication process
await client.start();

// Get authentication status
const authState = client.authManager.getAuthState();
```

##### Messaging
```javascript
// Send text message
const message = await client.sendMessage('+1234567891', 'Hello World!');

// Send media message
const mediaMessage = await client.sendMedia('+1234567891', imageBuffer, 'image');

// Mark message as read
await client.markAsRead(messageId, senderId);

// Set online status
await client.setOnlineStatus(true);
```

##### Group Management
```javascript
// Create group
const group = await client.createGroup('My Group', ['+1234567891', '+1234567892']);

// Get group info
const groupInfo = await client.getGroupInfo(groupId);

// Add participants
await client.addGroupParticipants(groupId, ['+1234567893']);

// Remove participants
await client.removeGroupParticipants(groupId, ['+1234567893']);

// Leave group
await client.leaveGroup(groupId);
```

##### Status and Information
```javascript
// Get client status
const status = client.getStatus();

// Get contact info
const contactInfo = await client.getContactInfo('+1234567891');
```

#### Events

```javascript
// Connection events
client.on('connected', () => {});
client.on('disconnected', () => {});
client.on('ready', () => {});

// Authentication events
client.on('authenticated', (sessionData) => {});
client.on('auth:failed', (error) => {});

// Message events
client.on('message', (message) => {});
client.on('message:sent', (message) => {});

// Group events
client.on('group:created', (group) => {});
client.on('group:updated', (group) => {});
client.on('group:left', (group) => {});

// Error events
client.on('error', (error) => {});
```

## 🔧 Advanced Usage

### Custom Authentication

```javascript
const client = new WhatsAppClient({
    phoneNumber: '+1234567890'
});

// Request SMS code
client.authManager.requestSMSCode();

// Verify SMS code
client.authManager.verifySMSCode('123456');
```

### Media Handling

```javascript
// Send different types of media
await client.sendMedia(recipient, imageBuffer, 'image');
await client.sendMedia(recipient, videoBuffer, 'video');
await client.sendMedia(recipient, audioBuffer, 'audio');
await client.sendMedia(recipient, documentBuffer, 'document');
await client.sendMedia(recipient, stickerBuffer, 'sticker');
```

### Group Management

```javascript
// Create group with custom settings
const group = await client.createGroup('My Group', participants);

// Update group info
await client.groupManager.updateGroupInfo(groupId, {
    name: 'Updated Group Name',
    description: 'New description'
});

// Promote to admin
await client.groupManager.promoteToAdmin(groupId, participantId);

// Demote from admin
await client.groupManager.demoteFromAdmin(groupId, participantId);
```

### Encryption and Security

```javascript
// Get crypto status
const cryptoStatus = client.cryptoManager.getStatus();

// Manual message encryption
const encryptedMessage = await client.cryptoManager.encryptMessage(recipientId, messageData);

// Manual message decryption
const decryptedMessage = await client.cryptoManager.decryptMessage(senderId, encryptedMessage);
```

## 🏗️ Architecture

### Module Structure

```
src/
├── WhatsAppClient.js          # Main client class
├── auth/
│   └── AuthManager.js         # SMS authentication
├── transport/
│   └── TransportManager.js    # TCP/HTTPS communication
├── crypto/
│   └── CryptoManager.js       # Signal Protocol encryption
├── messaging/
│   └── MessageHandler.js      # Message handling
├── groups/
│   └── GroupManager.js        # Group management
├── media/
│   └── MediaHandler.js        # Media processing
└── utils/
    └── Logger.js              # Logging system
```

### Key Components

1. **AuthManager** - Handles SMS authentication and session management
2. **TransportManager** - Manages binary protocol communication
3. **CryptoManager** - Implements Signal Protocol E2E encryption
4. **MessageHandler** - Processes text and media messages
5. **GroupManager** - Manages group operations and participants
6. **MediaHandler** - Handles media upload/download and processing

## 🔒 Security

- **Signal Protocol** - Industry-standard end-to-end encryption
- **Curve25519** - Elliptic curve cryptography for key exchange
- **AES-256-CBC** - Advanced encryption standard for message content
- **HMAC-SHA256** - Message authentication and integrity
- **HKDF** - Key derivation function for secure key generation

## 📝 Logging

The library includes a comprehensive logging system:

```javascript
// Set log level
client.logger.setLevel('debug');

// Create child logger
const authLogger = client.logger.child('AuthManager');

// Log messages
client.logger.info('Client started');
client.logger.error('Connection failed', error);
client.logger.debug('Message received', message);
```

Log files are automatically created in the `logs/` directory with daily rotation.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The test suite includes:
- Authentication flow testing
- Message sending/receiving
- Group management operations
- Media handling
- Error handling and reconnection

## 📋 Requirements

- Node.js 16.0.0 or higher
- Internet connection for WhatsApp server communication
- Valid phone number for SMS authentication

## ⚠️ Important Notes

1. **Terms of Service** - This library is for educational purposes. Ensure compliance with WhatsApp's Terms of Service.

2. **Rate Limiting** - Be mindful of WhatsApp's rate limits to avoid account restrictions.

3. **Phone Number** - Use a valid phone number that can receive SMS messages.

4. **Legal Compliance** - Ensure compliance with local laws and regulations regarding messaging and data privacy.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- WhatsApp for the messaging platform
- Signal Protocol for encryption standards
- The open-source community for inspiration and tools

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Disclaimer**: This library is not affiliated with or endorsed by WhatsApp Inc. Use at your own risk and ensure compliance with all applicable terms of service and laws.