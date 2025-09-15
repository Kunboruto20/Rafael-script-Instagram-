/**
 * Test file for Yowsup2 WhatsApp Client
 * Demonstrates basic usage and functionality
 */

const WhatsAppClient = require('../index');

async function testWhatsAppClient() {
    console.log('🚀 Starting Yowsup2 WhatsApp Client Test\n');
    
    // Create client instance
    const client = new WhatsAppClient({
        phoneNumber: '+1234567890',
        logLevel: 'debug'
    });
    
    // Set up event listeners
    client.on('ready', () => {
        console.log('✅ Client is ready!');
        runTests(client);
    });
    
    client.on('authenticated', (sessionData) => {
        console.log('✅ Authentication successful!');
        console.log('📱 Phone:', sessionData.phoneNumber);
        console.log('🔑 Device ID:', sessionData.deviceId);
    });
    
    client.on('message', (message) => {
        console.log('📨 Message received:', message);
    });
    
    client.on('error', (error) => {
        console.error('❌ Client error:', error);
    });
    
    client.on('connected', () => {
        console.log('🔗 Connected to WhatsApp servers');
    });
    
    client.on('disconnected', () => {
        console.log('🔌 Disconnected from WhatsApp servers');
    });
    
    // Start the client
    try {
        await client.start();
    } catch (error) {
        console.error('❌ Failed to start client:', error);
    }
}

async function runTests(client) {
    console.log('\n🧪 Running tests...\n');
    
    try {
        // Test 1: Send text message
        console.log('Test 1: Sending text message...');
        const textMessage = await client.sendMessage('+1234567891', 'Hello from Yowsup2!');
        console.log('✅ Text message sent:', textMessage.id);
        
        // Test 2: Send media message
        console.log('\nTest 2: Sending media message...');
        const imageData = Buffer.from('fake-image-data');
        const mediaMessage = await client.sendMedia('+1234567891', imageData, 'image');
        console.log('✅ Media message sent:', mediaMessage.id);
        
        // Test 3: Create group
        console.log('\nTest 3: Creating group...');
        const group = await client.createGroup('Test Group', ['+1234567891', '+1234567892']);
        console.log('✅ Group created:', group.id, group.name);
        
        // Test 4: Send group message
        console.log('\nTest 4: Sending group message...');
        const groupMessage = await client.sendMessage(group.id, 'Hello group!');
        console.log('✅ Group message sent:', groupMessage.id);
        
        // Test 5: Get group info
        console.log('\nTest 5: Getting group info...');
        const groupInfo = await client.getGroupInfo(group.id);
        console.log('✅ Group info retrieved:', groupInfo.name, groupInfo.participants.length, 'participants');
        
        // Test 6: Add group participants
        console.log('\nTest 6: Adding group participants...');
        const updatedGroup = await client.addGroupParticipants(group.id, ['+1234567893']);
        console.log('✅ Participants added:', updatedGroup.participants.length, 'total participants');
        
        // Test 7: Set online status
        console.log('\nTest 7: Setting online status...');
        await client.setOnlineStatus(true);
        console.log('✅ Online status set');
        
        // Test 8: Get client status
        console.log('\nTest 8: Getting client status...');
        const status = client.getStatus();
        console.log('✅ Client status:', status);
        
        // Test 9: Get crypto status
        console.log('\nTest 9: Getting crypto status...');
        const cryptoStatus = client.cryptoManager.getStatus();
        console.log('✅ Crypto status:', cryptoStatus);
        
        // Test 10: Get transport status
        console.log('\nTest 10: Getting transport status...');
        const transportStatus = client.transportManager.getStatus();
        console.log('✅ Transport status:', transportStatus);
        
        console.log('\n🎉 All tests completed successfully!');
        
        // Keep client running for a while to test events
        console.log('\n⏳ Keeping client running for 30 seconds to test events...');
        setTimeout(async () => {
            console.log('\n🛑 Stopping client...');
            await client.stop();
            console.log('✅ Client stopped');
            process.exit(0);
        }, 30000);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
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

// Run the test
testWhatsAppClient().catch(console.error);