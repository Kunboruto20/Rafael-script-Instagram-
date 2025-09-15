/**
 * Group Manager
 * Handles group creation, management, and member operations
 */

const EventEmitter = require('events');
const Logger = require('../utils/Logger');

class GroupManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.logger = new Logger('GroupManager');
        this.groups = new Map();
        this.groupParticipants = new Map();
    }
    
    /**
     * Create a new group
     */
    async createGroup(name, participants = []) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Creating group: ${name}`);
            
            // Generate group ID
            const groupId = this.generateGroupId();
            
            // Create group object
            const group = {
                id: groupId,
                name: name,
                description: '',
                owner: this.client.options.phoneNumber,
                participants: [this.client.options.phoneNumber, ...participants],
                admins: [this.client.options.phoneNumber],
                created: Date.now(),
                settings: {
                    onlyAdminsCanSendMessages: false,
                    onlyAdminsCanEditInfo: false,
                    onlyAdminsCanAddParticipants: false
                }
            };
            
            // Store group
            this.groups.set(groupId, group);
            this.groupParticipants.set(groupId, group.participants);
            
            // Send group creation message to participants
            await this.notifyGroupCreation(group);
            
            this.emit('group:created', group);
            this.logger.info(`Group created: ${name} (${groupId})`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to create group:', error);
            throw error;
        }
    }
    
    /**
     * Get group information
     */
    async getGroupInfo(groupId) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Getting group info for ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to get group info:', error);
            throw error;
        }
    }
    
    /**
     * Update group information
     */
    async updateGroupInfo(groupId, updates) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Updating group info for ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Check if user is admin
            if (!group.admins.includes(this.client.options.phoneNumber)) {
                throw new Error('Only admins can update group info');
            }
            
            // Update group
            Object.assign(group, updates);
            group.updated = Date.now();
            
            this.groups.set(groupId, group);
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'info_updated');
            
            this.emit('group:updated', group);
            this.logger.info(`Group info updated for ${groupId}`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to update group info:', error);
            throw error;
        }
    }
    
    /**
     * Add participants to group
     */
    async addParticipants(groupId, participants) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Adding participants to group ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Check if user is admin or has permission
            if (!group.admins.includes(this.client.options.phoneNumber) && 
                group.settings.onlyAdminsCanAddParticipants) {
                throw new Error('Only admins can add participants');
            }
            
            // Add participants
            const newParticipants = participants.filter(p => !group.participants.includes(p));
            group.participants.push(...newParticipants);
            
            // Update stored data
            this.groups.set(groupId, group);
            this.groupParticipants.set(groupId, group.participants);
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'participants_added', newParticipants);
            
            this.emit('group:updated', group);
            this.logger.info(`Added ${newParticipants.length} participants to group ${groupId}`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to add participants:', error);
            throw error;
        }
    }
    
    /**
     * Remove participants from group
     */
    async removeParticipants(groupId, participants) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Removing participants from group ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Check if user is admin
            if (!group.admins.includes(this.client.options.phoneNumber)) {
                throw new Error('Only admins can remove participants');
            }
            
            // Remove participants
            group.participants = group.participants.filter(p => !participants.includes(p));
            
            // Remove from admins if they were admins
            group.admins = group.admins.filter(a => !participants.includes(a));
            
            // Update stored data
            this.groups.set(groupId, group);
            this.groupParticipants.set(groupId, group.participants);
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'participants_removed', participants);
            
            this.emit('group:updated', group);
            this.logger.info(`Removed ${participants.length} participants from group ${groupId}`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to remove participants:', error);
            throw error;
        }
    }
    
    /**
     * Promote participant to admin
     */
    async promoteToAdmin(groupId, participant) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Promoting ${participant} to admin in group ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Check if user is admin
            if (!group.admins.includes(this.client.options.phoneNumber)) {
                throw new Error('Only admins can promote participants');
            }
            
            // Check if participant is in group
            if (!group.participants.includes(participant)) {
                throw new Error('Participant not in group');
            }
            
            // Add to admins
            if (!group.admins.includes(participant)) {
                group.admins.push(participant);
            }
            
            // Update stored data
            this.groups.set(groupId, group);
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'admin_promoted', [participant]);
            
            this.emit('group:updated', group);
            this.logger.info(`Promoted ${participant} to admin in group ${groupId}`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to promote to admin:', error);
            throw error;
        }
    }
    
    /**
     * Demote admin to participant
     */
    async demoteFromAdmin(groupId, participant) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Demoting ${participant} from admin in group ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Check if user is admin
            if (!group.admins.includes(this.client.options.phoneNumber)) {
                throw new Error('Only admins can demote participants');
            }
            
            // Check if participant is admin
            if (!group.admins.includes(participant)) {
                throw new Error('Participant is not an admin');
            }
            
            // Check if trying to demote owner
            if (group.owner === participant) {
                throw new Error('Cannot demote group owner');
            }
            
            // Remove from admins
            group.admins = group.admins.filter(a => a !== participant);
            
            // Update stored data
            this.groups.set(groupId, group);
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'admin_demoted', [participant]);
            
            this.emit('group:updated', group);
            this.logger.info(`Demoted ${participant} from admin in group ${groupId}`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to demote from admin:', error);
            throw error;
        }
    }
    
    /**
     * Leave group
     */
    async leaveGroup(groupId) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Leaving group ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Remove from participants
            group.participants = group.participants.filter(p => p !== this.client.options.phoneNumber);
            
            // Remove from admins
            group.admins = group.admins.filter(a => a !== this.client.options.phoneNumber);
            
            // If owner is leaving, transfer ownership
            if (group.owner === this.client.options.phoneNumber) {
                if (group.admins.length > 0) {
                    group.owner = group.admins[0];
                } else if (group.participants.length > 0) {
                    group.owner = group.participants[0];
                    group.admins.push(group.participants[0]);
                } else {
                    // Delete group if no participants left
                    this.groups.delete(groupId);
                    this.groupParticipants.delete(groupId);
                    this.emit('group:deleted', groupId);
                    return;
                }
            }
            
            // Update stored data
            this.groups.set(groupId, group);
            this.groupParticipants.set(groupId, group.participants);
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'participant_left', [this.client.options.phoneNumber]);
            
            this.emit('group:left', group);
            this.logger.info(`Left group ${groupId}`);
            
            return group;
            
        } catch (error) {
            this.logger.error('Failed to leave group:', error);
            throw error;
        }
    }
    
    /**
     * Delete group
     */
    async deleteGroup(groupId) {
        try {
            if (!this.client.isAuthenticated) {
                throw new Error('Client not authenticated');
            }
            
            this.logger.info(`Deleting group ${groupId}`);
            
            const group = this.groups.get(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Check if user is owner
            if (group.owner !== this.client.options.phoneNumber) {
                throw new Error('Only group owner can delete group');
            }
            
            // Notify participants
            await this.notifyGroupUpdate(group, 'group_deleted');
            
            // Delete group
            this.groups.delete(groupId);
            this.groupParticipants.delete(groupId);
            
            this.emit('group:deleted', groupId);
            this.logger.info(`Deleted group ${groupId}`);
            
        } catch (error) {
            this.logger.error('Failed to delete group:', error);
            throw error;
        }
    }
    
    /**
     * Get all groups
     */
    getAllGroups() {
        return Array.from(this.groups.values());
    }
    
    /**
     * Get group participants
     */
    getGroupParticipants(groupId) {
        return this.groupParticipants.get(groupId) || [];
    }
    
    /**
     * Check if user is in group
     */
    isInGroup(groupId, participant) {
        const participants = this.groupParticipants.get(groupId);
        return participants ? participants.includes(participant) : false;
    }
    
    /**
     * Check if user is admin
     */
    isAdmin(groupId, participant) {
        const group = this.groups.get(groupId);
        return group ? group.admins.includes(participant) : false;
    }
    
    /**
     * Notify group creation
     */
    async notifyGroupCreation(group) {
        try {
            // Send notification to all participants
            for (const participant of group.participants) {
                if (participant !== this.client.options.phoneNumber) {
                    await this.client.messageHandler.sendTextMessage(
                        participant,
                        `You have been added to group "${group.name}"`
                    );
                }
            }
        } catch (error) {
            this.logger.error('Failed to notify group creation:', error);
        }
    }
    
    /**
     * Notify group update
     */
    async notifyGroupUpdate(group, updateType, participants = []) {
        try {
            let message = '';
            
            switch (updateType) {
                case 'info_updated':
                    message = `Group "${group.name}" info has been updated`;
                    break;
                case 'participants_added':
                    message = `${participants.join(', ')} ${participants.length === 1 ? 'was' : 'were'} added to the group`;
                    break;
                case 'participants_removed':
                    message = `${participants.join(', ')} ${participants.length === 1 ? 'was' : 'were'} removed from the group`;
                    break;
                case 'admin_promoted':
                    message = `${participants.join(', ')} ${participants.length === 1 ? 'was' : 'were'} promoted to admin`;
                    break;
                case 'admin_demoted':
                    message = `${participants.join(', ')} ${participants.length === 1 ? 'was' : 'were'} demoted from admin`;
                    break;
                case 'participant_left':
                    message = `${participants.join(', ')} ${participants.length === 1 ? 'left' : 'left'} the group`;
                    break;
                case 'group_deleted':
                    message = 'This group has been deleted';
                    break;
            }
            
            // Send notification to all participants
            for (const participant of group.participants) {
                if (participant !== this.client.options.phoneNumber) {
                    await this.client.messageHandler.sendTextMessage(participant, message);
                }
            }
        } catch (error) {
            this.logger.error('Failed to notify group update:', error);
        }
    }
    
    /**
     * Generate unique group ID
     */
    generateGroupId() {
        return 'GROUP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
}

module.exports = GroupManager;