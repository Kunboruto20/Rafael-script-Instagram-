/**
 * Basic Usage Example for Yowsup2 WhatsApp Client
 * Demonstrates common operations and event handling
 */

const WhatsAppClient = require('../index');

async function basicUsageExample() {
    console.log('🚀 Yowsup2 Basic Usage Example\n');
    
    // Create client instance
    const client = new WhatsAppClient({
        phoneNumber: '+1234567890',
        logLevel: 'info'
    });
    
    // Set up comprehensive event listeners
    setupEventListeners(client);
    
    try {
        // Start the client
        console.log('📱 Starting WhatsApp client...');
        await client.start();
        
        // Wait for authentication
        await waitForAuthentication(client);
        
        // Run example operations
        await runExampleOperations(client);
        
        // Keep running for demonstration
        console.log('\n⏳ Client running... Press Ctrl+C to stop');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function setupEventListeners(client) {
    // Connection events
    client.on('connected', () => {
        console.log('✅ Connected to WhatsApp servers');
    });
    
    client.on('disconnected', () => {
        console.log('🔌 Disconnected from WhatsApp servers');
    });
    
    client.on('ready', () => {
        console.log('🎉 Client is ready for use!');
    });
    
    // Authentication events
    client.on('authenticated', (sessionData) => {
        console.log('🔐 Authentication successful!');
        console.log(`📱 Phone: ${sessionData.phoneNumber}`);
        console.log(`🔑 Device ID: ${sessionData.deviceId}`);
    });
    
    client.on('auth:failed', (error) => {
        console.error('❌ Authentication failed:', error.message);
    });
    
    // Message events
    client.on('message', (message) => {
        console.log(`📨 Message from ${message.from}: ${message.content}`);
    });
    
    client.on('message:sent', (message) => {
        console.log(`📤 Message sent to ${message.to}: ${message.content}`);
    });
    
    // Group events
    client.on('group:created', (group) => {
        console.log(`👥 Group created: ${group.name} (${group.id})`);
    });
    
    client.on('group:updated', (group) => {
        console.log(`👥 Group updated: ${group.name}`);
    });
    
    // Multi-device sync events
    client.on('sync:completed', (stats) => {
        console.log(`🔄 Sync completed: ${stats.localChanges} local, ${stats.remoteChanges} remote changes`);
    });
    
    client.on('device:added', (device) => {
        console.log(`📱 New device added: ${device.name} (${device.id})`);
    });
    
    client.on('device:removed', (deviceId) => {
        console.log(`📱 Device removed: ${deviceId}`);
    });
    
    // Error events
    client.on('error', (error) => {
        console.error('❌ Client error:', error);
    });
}

async function waitForAuthentication(client) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Authentication timeout'));
        }, 60000); // 60 seconds timeout
        
        client.once('authenticated', () => {
            clearTimeout(timeout);
            resolve();
        });
        
        client.once('auth:failed', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

async function runExampleOperations(client) {
    console.log('\n🧪 Running example operations...\n');
    
    try {
        // Example 1: Send a text message
        console.log('1️⃣ Sending text message...');
        const textMessage = await client.sendMessage('+1234567891', 'Hello from Yowsup2! 👋');
        console.log(`✅ Text message sent with ID: ${textMessage.id}`);
        
        // Example 2: Send a media message
        console.log('\n2️⃣ Sending media message...');
        const imageData = Buffer.from('fake-image-data-for-demo');
        const mediaMessage = await client.sendMedia('+1234567891', imageData, 'image');
        console.log(`✅ Media message sent with ID: ${mediaMessage.id}`);
        
        // Example 3: Create a group
        console.log('\n3️⃣ Creating group...');
        const group = await client.createGroup('Yowsup2 Test Group', ['+1234567891', '+1234567892']);
        console.log(`✅ Group created: ${group.name} (${group.id})`);
        console.log(`   Participants: ${group.participants.length}`);
        
        // Example 4: Send group message
        console.log('\n4️⃣ Sending group message...');
        const groupMessage = await client.sendMessage(group.id, 'Hello group! This is a test message from Yowsup2.');
        console.log(`✅ Group message sent with ID: ${groupMessage.id}`);
        
        // Example 5: Add group participants
        console.log('\n5️⃣ Adding group participants...');
        const updatedGroup = await client.addGroupParticipants(group.id, ['+1234567893', '+1234567894']);
        console.log(`✅ Participants added. Total participants: ${updatedGroup.participants.length}`);
        
        // Example 6: Get group information
        console.log('\n6️⃣ Getting group information...');
        const groupInfo = await client.getGroupInfo(group.id);
        console.log(`✅ Group info retrieved:`);
        console.log(`   Name: ${groupInfo.name}`);
        console.log(`   Participants: ${groupInfo.participants.length}`);
        console.log(`   Admins: ${groupInfo.admins.length}`);
        console.log(`   Created: ${new Date(groupInfo.created).toLocaleString()}`);
        
        // Example 7: Set online status
        console.log('\n7️⃣ Setting online status...');
        await client.setOnlineStatus(true);
        console.log('✅ Online status set');
        
        // Example 8: Get client status
        console.log('\n8️⃣ Getting client status...');
        const status = client.getStatus();
        console.log('✅ Client status:');
        console.log(`   Connected: ${status.connected}`);
        console.log(`   Authenticated: ${status.authenticated}`);
        console.log(`   Phone: ${status.phoneNumber}`);
        console.log(`   Device ID: ${status.deviceId}`);
        console.log(`   Sync devices: ${status.syncStatus.deviceCount}`);
        
        // Example 9: Force synchronization
        console.log('\n9️⃣ Forcing synchronization...');
        await client.forceSync();
        console.log('✅ Synchronization completed');
        
        // Example 10: Get connected devices
        console.log('\n🔟 Getting connected devices...');
        const devices = client.getConnectedDevices();
        console.log(`✅ Connected devices: ${devices.length}`);
        devices.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.name} (${device.id}) - ${device.active ? 'Active' : 'Inactive'}`);
        });
        
        console.log('\n🎉 All example operations completed successfully!');
        
    } catch (error) {
        console.error('❌ Example operation failed:', error);
        throw error;
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Run the example
basicUsageExample().catch(console.error);