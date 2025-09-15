/**
 * Multi-Device Synchronization Manager
 * Handles synchronization of conversations and data across multiple devices
 */

const EventEmitter = require('events');
const Logger = require('../utils/Logger');

class MultiDeviceSync extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.logger = new Logger('MultiDeviceSync');
        this.syncState = {
            lastSyncTimestamp: 0,
            deviceList: [],
            activeDevices: new Map(),
            syncInProgress: false
        };
        this.syncInterval = null;
        this.syncTimeout = 30000; // 30 seconds
    }
    
    /**
     * Initialize multi-device synchronization
     */
    async initialize() {
        try {
            this.logger.info('Initializing multi-device synchronization...');
            
            // Get device list from server
            await this.fetchDeviceList();
            
            // Start periodic sync
            this.startPeriodicSync();
            
            this.logger.info('Multi-device synchronization initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize multi-device sync:', error);
            throw error;
        }
    }
    
    /**
     * Start periodic synchronization
     */
    startPeriodicSync() {
        // Sync every 30 seconds
        this.syncInterval = setInterval(async () => {
            try {
                await this.performSync();
            } catch (error) {
                this.logger.error('Periodic sync failed:', error);
            }
        }, 30000);
        
        this.logger.info('Periodic synchronization started');
    }
    
    /**
     * Stop periodic synchronization
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.logger.info('Periodic synchronization stopped');
        }
    }
    
    /**
     * Perform synchronization with other devices
     */
    async performSync() {
        try {
            if (this.syncState.syncInProgress) {
                this.logger.debug('Sync already in progress, skipping');
                return;
            }
            
            this.syncState.syncInProgress = true;
            this.logger.debug('Starting device synchronization...');
            
            // Get local changes since last sync
            const localChanges = await this.getLocalChanges();
            
            // Send local changes to other devices
            if (localChanges.length > 0) {
                await this.pushChangesToDevices(localChanges);
            }
            
            // Get changes from other devices
            const remoteChanges = await this.pullChangesFromDevices();
            
            // Apply remote changes locally
            if (remoteChanges.length > 0) {
                await this.applyRemoteChanges(remoteChanges);
            }
            
            // Update sync timestamp
            this.syncState.lastSyncTimestamp = Date.now();
            
            this.emit('sync:completed', {
                localChanges: localChanges.length,
                remoteChanges: remoteChanges.length
            });
            
            this.logger.debug('Device synchronization completed');
            
        } catch (error) {
            this.logger.error('Device synchronization failed:', error);
            this.emit('sync:error', error);
        } finally {
            this.syncState.syncInProgress = false;
        }
    }
    
    /**
     * Get local changes since last sync
     */
    async getLocalChanges() {
        try {
            const changes = [];
            const lastSync = this.syncState.lastSyncTimestamp;
            
            // Get message changes
            const messages = this.client.messageHandler.getAllMessages();
            for (const message of [...messages.sent, ...messages.received]) {
                if (message.timestamp > lastSync) {
                    changes.push({
                        type: 'message',
                        action: 'create',
                        data: message,
                        timestamp: message.timestamp
                    });
                }
            }
            
            // Get group changes
            const groups = this.client.groupManager.getAllGroups();
            for (const group of groups) {
                if (group.updated && group.updated > lastSync) {
                    changes.push({
                        type: 'group',
                        action: 'update',
                        data: group,
                        timestamp: group.updated
                    });
                } else if (group.created > lastSync) {
                    changes.push({
                        type: 'group',
                        action: 'create',
                        data: group,
                        timestamp: group.created
                    });
                }
            }
            
            return changes;
            
        } catch (error) {
            this.logger.error('Failed to get local changes:', error);
            return [];
        }
    }
    
    /**
     * Push changes to other devices
     */
    async pushChangesToDevices(changes) {
        try {
            this.logger.debug(`Pushing ${changes.length} changes to other devices`);
            
            for (const device of this.syncState.deviceList) {
                if (device.id === this.client.options.deviceId) {
                    continue; // Skip self
                }
                
                try {
                    await this.sendChangesToDevice(device, changes);
                } catch (error) {
                    this.logger.error(`Failed to push changes to device ${device.id}:`, error);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to push changes to devices:', error);
        }
    }
    
    /**
     * Send changes to specific device
     */
    async sendChangesToDevice(device, changes) {
        try {
            // Create sync message
            const syncMessage = {
                type: 'sync',
                from: this.client.options.deviceId,
                to: device.id,
                changes: changes,
                timestamp: Date.now()
            };
            
            // Encrypt sync message
            const encryptedMessage = await this.client.cryptoManager.encryptMessage(
                device.id,
                syncMessage
            );
            
            // Send via transport
            await this.client.transportManager.sendMessage(0x09, // Sync message type
                Buffer.from(JSON.stringify(encryptedMessage))
            );
            
        } catch (error) {
            this.logger.error(`Failed to send changes to device ${device.id}:`, error);
            throw error;
        }
    }
    
    /**
     * Pull changes from other devices
     */
    async pullChangesFromDevices() {
        try {
            this.logger.debug('Pulling changes from other devices');
            
            const allChanges = [];
            
            for (const device of this.syncState.deviceList) {
                if (device.id === this.client.options.deviceId) {
                    continue; // Skip self
                }
                
                try {
                    const deviceChanges = await this.getChangesFromDevice(device);
                    allChanges.push(...deviceChanges);
                } catch (error) {
                    this.logger.error(`Failed to pull changes from device ${device.id}:`, error);
                }
            }
            
            return allChanges;
            
        } catch (error) {
            this.logger.error('Failed to pull changes from devices:', error);
            return [];
        }
    }
    
    /**
     * Get changes from specific device
     */
    async getChangesFromDevice(device) {
        try {
            // In a real implementation, this would query the device directly
            // For now, return empty array
            return [];
            
        } catch (error) {
            this.logger.error(`Failed to get changes from device ${device.id}:`, error);
            return [];
        }
    }
    
    /**
     * Apply remote changes locally
     */
    async applyRemoteChanges(changes) {
        try {
            this.logger.debug(`Applying ${changes.length} remote changes`);
            
            for (const change of changes) {
                try {
                    await this.applyChange(change);
                } catch (error) {
                    this.logger.error('Failed to apply change:', error);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to apply remote changes:', error);
        }
    }
    
    /**
     * Apply a single change
     */
    async applyChange(change) {
        try {
            switch (change.type) {
                case 'message':
                    await this.applyMessageChange(change);
                    break;
                case 'group':
                    await this.applyGroupChange(change);
                    break;
                default:
                    this.logger.warn(`Unknown change type: ${change.type}`);
            }
        } catch (error) {
            this.logger.error('Failed to apply change:', error);
        }
    }
    
    /**
     * Apply message change
     */
    async applyMessageChange(change) {
        try {
            const message = change.data;
            
            switch (change.action) {
                case 'create':
                    // Add message to local storage
                    this.client.messageHandler.receivedMessages.set(message.id, message);
                    this.emit('message:synced', message);
                    break;
                case 'update':
                    // Update existing message
                    this.client.messageHandler.receivedMessages.set(message.id, message);
                    this.emit('message:updated', message);
                    break;
                case 'delete':
                    // Remove message
                    this.client.messageHandler.receivedMessages.delete(message.id);
                    this.emit('message:deleted', message.id);
                    break;
            }
        } catch (error) {
            this.logger.error('Failed to apply message change:', error);
        }
    }
    
    /**
     * Apply group change
     */
    async applyGroupChange(change) {
        try {
            const group = change.data;
            
            switch (change.action) {
                case 'create':
                    // Add group to local storage
                    this.client.groupManager.groups.set(group.id, group);
                    this.client.groupManager.groupParticipants.set(group.id, group.participants);
                    this.emit('group:synced', group);
                    break;
                case 'update':
                    // Update existing group
                    this.client.groupManager.groups.set(group.id, group);
                    this.client.groupManager.groupParticipants.set(group.id, group.participants);
                    this.emit('group:updated', group);
                    break;
                case 'delete':
                    // Remove group
                    this.client.groupManager.groups.delete(group.id);
                    this.client.groupManager.groupParticipants.delete(group.id);
                    this.emit('group:deleted', group.id);
                    break;
            }
        } catch (error) {
            this.logger.error('Failed to apply group change:', error);
        }
    }
    
    /**
     * Fetch device list from server
     */
    async fetchDeviceList() {
        try {
            this.logger.info('Fetching device list...');
            
            // In a real implementation, this would query WhatsApp servers
            // For now, simulate device list
            this.syncState.deviceList = [
                {
                    id: this.client.options.deviceId,
                    name: 'Current Device',
                    type: 'mobile',
                    lastSeen: Date.now(),
                    active: true
                }
            ];
            
            this.logger.info(`Found ${this.syncState.deviceList.length} devices`);
            
        } catch (error) {
            this.logger.error('Failed to fetch device list:', error);
            throw error;
        }
    }
    
    /**
     * Add new device
     */
    async addDevice(deviceInfo) {
        try {
            this.logger.info(`Adding new device: ${deviceInfo.id}`);
            
            // Add to device list
            this.syncState.deviceList.push(deviceInfo);
            
            // Notify other devices
            await this.notifyDeviceAdded(deviceInfo);
            
            this.emit('device:added', deviceInfo);
            this.logger.info(`Device added: ${deviceInfo.id}`);
            
        } catch (error) {
            this.logger.error('Failed to add device:', error);
            throw error;
        }
    }
    
    /**
     * Remove device
     */
    async removeDevice(deviceId) {
        try {
            this.logger.info(`Removing device: ${deviceId}`);
            
            // Remove from device list
            this.syncState.deviceList = this.syncState.deviceList.filter(d => d.id !== deviceId);
            
            // Notify other devices
            await this.notifyDeviceRemoved(deviceId);
            
            this.emit('device:removed', deviceId);
            this.logger.info(`Device removed: ${deviceId}`);
            
        } catch (error) {
            this.logger.error('Failed to remove device:', error);
            throw error;
        }
    }
    
    /**
     * Notify other devices about new device
     */
    async notifyDeviceAdded(deviceInfo) {
        try {
            const notification = {
                type: 'device_added',
                device: deviceInfo,
                timestamp: Date.now()
            };
            
            // Send to all other devices
            for (const device of this.syncState.deviceList) {
                if (device.id !== this.client.options.deviceId && device.id !== deviceInfo.id) {
                    await this.sendNotificationToDevice(device, notification);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to notify device added:', error);
        }
    }
    
    /**
     * Notify other devices about removed device
     */
    async notifyDeviceRemoved(deviceId) {
        try {
            const notification = {
                type: 'device_removed',
                deviceId: deviceId,
                timestamp: Date.now()
            };
            
            // Send to all other devices
            for (const device of this.syncState.deviceList) {
                if (device.id !== this.client.options.deviceId) {
                    await this.sendNotificationToDevice(device, notification);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to notify device removed:', error);
        }
    }
    
    /**
     * Send notification to specific device
     */
    async sendNotificationToDevice(device, notification) {
        try {
            const encryptedNotification = await this.client.cryptoManager.encryptMessage(
                device.id,
                notification
            );
            
            await this.client.transportManager.sendMessage(0x0A, // Notification message type
                Buffer.from(JSON.stringify(encryptedNotification))
            );
            
        } catch (error) {
            this.logger.error(`Failed to send notification to device ${device.id}:`, error);
        }
    }
    
    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            lastSyncTimestamp: this.syncState.lastSyncTimestamp,
            deviceCount: this.syncState.deviceList.length,
            syncInProgress: this.syncState.syncInProgress,
            devices: this.syncState.deviceList
        };
    }
    
    /**
     * Force immediate sync
     */
    async forceSync() {
        try {
            this.logger.info('Forcing immediate synchronization...');
            await this.performSync();
            this.logger.info('Force sync completed');
        } catch (error) {
            this.logger.error('Force sync failed:', error);
            throw error;
        }
    }
    
    /**
     * Cleanup and stop synchronization
     */
    async cleanup() {
        try {
            this.logger.info('Cleaning up multi-device synchronization...');
            
            this.stopPeriodicSync();
            this.syncState.syncInProgress = false;
            
            this.logger.info('Multi-device synchronization cleaned up');
            
        } catch (error) {
            this.logger.error('Failed to cleanup multi-device sync:', error);
        }
    }
}

module.exports = MultiDeviceSync;