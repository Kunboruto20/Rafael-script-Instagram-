/**
 * Multi-Device Synchronization Example
 * Demonstrates how to sync data across multiple devices
 */

const WhatsAppClient = require('../index');

async function multiDeviceSyncExample() {
    console.log('🔄 Yowsup2 Multi-Device Sync Example\n');
    
    // Create multiple client instances (simulating different devices)
    const device1 = new WhatsAppClient({
        phoneNumber: '+1234567890',
        deviceId: 'DEVICE-001',
        clientName: 'Yowsup2-Device1',
        logLevel: 'info'
    });
    
    const device2 = new WhatsAppClient({
        phoneNumber: '+1234567890',
        deviceId: 'DEVICE-002',
        clientName: 'Yowsup2-Device2',
        logLevel: 'info'
    });
    
    // Set up event listeners for both devices
    setupDeviceListeners(device1, 'Device 1');
    setupDeviceListeners(device2, 'Device 2');
    
    try {
        // Start both devices
        console.log('📱 Starting Device 1...');
        await device1.start();
        
        console.log('📱 Starting Device 2...');
        await device2.start();
        
        // Wait for both to be ready
        await waitForDevicesReady(device1, device2);
        
        // Demonstrate synchronization
        await demonstrateSync(device1, device2);
        
        // Keep running for demonstration
        console.log('\n⏳ Devices running... Press Ctrl+C to stop');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function setupDeviceListeners(client, deviceName) {
    // Connection events
    client.on('connected', () => {
        console.log(`✅ ${deviceName} connected to WhatsApp servers`);
    });
    
    client.on('disconnected', () => {
        console.log(`🔌 ${deviceName} disconnected from WhatsApp servers`);
    });
    
    client.on('ready', () => {
        console.log(`🎉 ${deviceName} is ready for use!`);
    });
    
    // Authentication events
    client.on('authenticated', (sessionData) => {
        console.log(`🔐 ${deviceName} authenticated successfully!`);
        console.log(`📱 Phone: ${sessionData.phoneNumber}`);
        console.log(`🔑 Device ID: ${sessionData.deviceId}`);
    });
    
    // Message events
    client.on('message', (message) => {
        console.log(`📨 ${deviceName} received message from ${message.from}: ${message.content}`);
    });
    
    client.on('message:sent', (message) => {
        console.log(`📤 ${deviceName} sent message to ${message.to}: ${message.content}`);
    });
    
    // Group events
    client.on('group:created', (group) => {
        console.log(`👥 ${deviceName} created group: ${group.name} (${group.id})`);
    });
    
    client.on('group:updated', (group) => {
        console.log(`👥 ${deviceName} updated group: ${group.name}`);
    });
    
    // Sync events
    client.on('sync:completed', (stats) => {
        console.log(`🔄 ${deviceName} sync completed: ${stats.localChanges} local, ${stats.remoteChanges} remote changes`);
    });
    
    client.on('device:added', (device) => {
        console.log(`📱 ${deviceName} detected new device: ${device.name} (${device.id})`);
    });
    
    client.on('device:removed', (deviceId) => {
        console.log(`📱 ${deviceName} detected device removed: ${deviceId}`);
    });
    
    // Error events
    client.on('error', (error) => {
        console.error(`❌ ${deviceName} error:`, error);
    });
}

async function waitForDevicesReady(device1, device2) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Devices ready timeout'));
        }, 120000); // 2 minutes timeout
        
        let device1Ready = false;
        let device2Ready = false;
        
        const checkReady = () => {
            if (device1Ready && device2Ready) {
                clearTimeout(timeout);
                resolve();
            }
        };
        
        device1.once('ready', () => {
            device1Ready = true;
            checkReady();
        });
        
        device2.once('ready', () => {
            device2Ready = true;
            checkReady();
        });
        
        device1.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        
        device2.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

async function demonstrateSync(device1, device2) {
    console.log('\n🧪 Demonstrating multi-device synchronization...\n');
    
    try {
        // Step 1: Device 1 creates a group
        console.log('1️⃣ Device 1 creating group...');
        const group = await device1.createGroup('Multi-Device Test Group', ['+1234567891']);
        console.log(`✅ Device 1 created group: ${group.name} (${group.id})`);
        
        // Wait a moment for sync
        await sleep(2000);
        
        // Step 2: Check if Device 2 sees the group
        console.log('\n2️⃣ Checking if Device 2 sees the group...');
        const device2Groups = device2.groupManager.getAllGroups();
        const foundGroup = device2Groups.find(g => g.id === group.id);
        
        if (foundGroup) {
            console.log(`✅ Device 2 found the group: ${foundGroup.name}`);
        } else {
            console.log('❌ Device 2 did not find the group (sync may be delayed)');
        }
        
        // Step 3: Device 2 sends a message to the group
        console.log('\n3️⃣ Device 2 sending message to group...');
        const groupMessage = await device2.sendMessage(group.id, 'Hello from Device 2! 👋');
        console.log(`✅ Device 2 sent group message with ID: ${groupMessage.id}`);
        
        // Wait a moment for sync
        await sleep(2000);
        
        // Step 4: Device 1 sends a message to the group
        console.log('\n4️⃣ Device 1 sending message to group...');
        const device1Message = await device1.sendMessage(group.id, 'Hello from Device 1! 👋');
        console.log(`✅ Device 1 sent group message with ID: ${device1Message.id}`);
        
        // Step 5: Device 2 adds a participant
        console.log('\n5️⃣ Device 2 adding participant to group...');
        const updatedGroup = await device2.addGroupParticipants(group.id, ['+1234567892']);
        console.log(`✅ Device 2 added participant. Total participants: ${updatedGroup.participants.length}`);
        
        // Wait a moment for sync
        await sleep(2000);
        
        // Step 6: Check sync status on both devices
        console.log('\n6️⃣ Checking sync status on both devices...');
        const device1Status = device1.getStatus();
        const device2Status = device2.getStatus();
        
        console.log(`✅ Device 1 sync status:`);
        console.log(`   Last sync: ${new Date(device1Status.syncStatus.lastSyncTimestamp).toLocaleString()}`);
        console.log(`   Devices: ${device1Status.syncStatus.deviceCount}`);
        console.log(`   Sync in progress: ${device1Status.syncStatus.syncInProgress}`);
        
        console.log(`✅ Device 2 sync status:`);
        console.log(`   Last sync: ${new Date(device2Status.syncStatus.lastSyncTimestamp).toLocaleString()}`);
        console.log(`   Devices: ${device2Status.syncStatus.deviceCount}`);
        console.log(`   Sync in progress: ${device2Status.syncStatus.syncInProgress}`);
        
        // Step 7: Force synchronization
        console.log('\n7️⃣ Forcing synchronization...');
        await device1.forceSync();
        await device2.forceSync();
        console.log('✅ Forced synchronization completed');
        
        // Step 8: Get connected devices from both devices
        console.log('\n8️⃣ Getting connected devices...');
        const device1Devices = device1.getConnectedDevices();
        const device2Devices = device2.getConnectedDevices();
        
        console.log(`✅ Device 1 sees ${device1Devices.length} devices:`);
        device1Devices.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.name} (${device.id}) - ${device.active ? 'Active' : 'Inactive'}`);
        });
        
        console.log(`✅ Device 2 sees ${device2Devices.length} devices:`);
        device2Devices.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.name} (${device.id}) - ${device.active ? 'Active' : 'Inactive'}`);
        });
        
        // Step 9: Demonstrate message synchronization
        console.log('\n9️⃣ Demonstrating message synchronization...');
        
        // Device 1 sends a message
        const syncMessage1 = await device1.sendMessage('+1234567891', 'This message should sync to Device 2');
        console.log(`✅ Device 1 sent sync message: ${syncMessage1.id}`);
        
        // Device 2 sends a message
        const syncMessage2 = await device2.sendMessage('+1234567891', 'This message should sync to Device 1');
        console.log(`✅ Device 2 sent sync message: ${syncMessage2.id}`);
        
        // Wait for sync
        await sleep(3000);
        
        // Check if messages were synced
        const device1Messages = device1.messageHandler.getAllMessages();
        const device2Messages = device2.messageHandler.getAllMessages();
        
        console.log(`✅ Device 1 has ${device1Messages.sent.length} sent and ${device1Messages.received.length} received messages`);
        console.log(`✅ Device 2 has ${device2Messages.sent.length} sent and ${device2Messages.received.length} received messages`);
        
        console.log('\n🎉 Multi-device synchronization demonstration completed!');
        
    } catch (error) {
        console.error('❌ Sync demonstration failed:', error);
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
multiDeviceSyncExample().catch(console.error);