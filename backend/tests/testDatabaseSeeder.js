import { User, Group, GroupMember, Message, File } from '../src/models/index.js';
import { messagingTestHelpers } from './messagingTestHelpers.js';

/**
 * Database seeder for comprehensive integration testing
 * Creates realistic test data for all messaging scenarios
 */
export class TestDatabaseSeeder {
  constructor() {
    this.createdData = {
      users: [],
      groups: [],
      messages: [],
      files: [],
    };
  }

  /**
   * Seed users for testing
   */
  async seedUsers(count = 5) {
    const users = [];

    // Create regular users
    for (let i = 0; i < count - 1; i++) {
      const user = await messagingTestHelpers.createTestUser({
        username: `testuser${i + 1}`,
        email: `testuser${i + 1}@example.com`,
        firstName: `Test`,
        lastName: `User${i + 1}`,
        approvalStatus: 'approved',
        emailVerified: true,
      });
      users.push(user);
    }

    // Create one admin user
    const adminUser = await messagingTestHelpers.createTestUser({
      username: 'testadmin',
      email: 'testadmin@example.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      approvalStatus: 'approved',
      emailVerified: true,
    });
    users.push(adminUser);

    this.createdData.users.push(...users);
    return users;
  }

  /**
   * Seed groups with members for testing
   */
  async seedGroups(userCount = 3, groupCount = 2) {
    const users = await this.seedUsers(userCount);
    const groups = [];

    for (let i = 0; i < groupCount; i++) {
      const group = await messagingTestHelpers.createTestGroup({
        name: `Test Group ${i + 1}`,
        description: `This is test group number ${i + 1} for integration testing`,
        createdBy: users[0].id,
        groupType: i === 0 ? 'public' : 'private',
      });

      // Add all users as members
      for (let j = 0; j < users.length; j++) {
        await messagingTestHelpers.addUserToGroup(
          group.id,
          users[j].id,
          j === 0 ? 'admin' : 'member'
        );
      }

      groups.push(group);
    }

    this.createdData.groups.push(...groups);
    return { users, groups };
  }

  /**
   * Seed 1-to-1 messages between users
   */
  async seedDirectMessages(users, messageCount = 10) {
    const messages = [];

    // Create conversations between pairs of users
    for (let i = 0; i < users.length - 1; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const conversationMessages = [];

        for (let k = 0; k < Math.floor(messageCount / 2); k++) {
          // Alternate between users for realistic conversation
          const senderIndex = k % 2 === 0 ? i : j;
          const message = await messagingTestHelpers.createTestMessage({
            senderId: users[senderIndex].id,
            recipientId: users[senderIndex === i ? j : i].id,
            content: `Direct message ${k + 1} from ${users[senderIndex].username} to ${users[senderIndex === i ? j : i].username}`,
            status: k === Math.floor(messageCount / 2) - 1 ? 'read' : 'delivered',
          });
          conversationMessages.push(message);
        }

        messages.push(...conversationMessages);
      }
    }

    this.createdData.messages.push(...messages);
    return messages;
  }

  /**
   * Seed group messages
   */
  async seedGroupMessages(users, groups, messageCount = 15) {
    const messages = [];

    for (const group of groups) {
      for (let i = 0; i < messageCount; i++) {
        // Rotate through users as senders
        const senderIndex = i % users.length;
        const message = await messagingTestHelpers.createTestMessage({
          senderId: users[senderIndex].id,
          groupId: group.id,
          content: `Group message ${i + 1} from ${users[senderIndex].username} in ${group.name}`,
          status: i === messageCount - 1 ? 'read' : 'delivered',
        });
        messages.push(message);
      }
    }

    this.createdData.messages.push(...messages);
    return messages;
  }

  /**
   * Seed files for upload/download testing
   */
  async seedFiles(users, messageCount = 5) {
    const files = [];

    for (let i = 0; i < messageCount; i++) {
      const uploader = users[i % users.length];

      // Create different types of test files
      const fileTypes = ['text', 'image', 'pdf', 'video'];
      const fileType = fileTypes[i % fileTypes.length];

      try {
        const { record, path: filePath } = await messagingTestHelpers.createTestFileByType(fileType);

        // Update file record with uploader info
        record.uploaderId = uploader.id;
        record.virusScanStatus = 'clean';
        await record.save();

        // Create a message with the file
        const message = await messagingTestHelpers.createTestMessage({
          senderId: uploader.id,
          recipientId: users[(i + 1) % users.length].id,
          content: `File message with ${fileType} file`,
          messageType: fileType === 'image' ? 'image' : 'file',
          fileName: record.originalName,
          fileSize: record.fileSize,
          mimeType: record.mimeType,
        });

        // Link file to message
        record.messageId = message.id;
        await record.save();

        files.push({ file: record, message, filePath });
      } catch (error) {
        console.error(`Error creating test file ${i}:`, error);
      }
    }

    this.createdData.files.push(...files);
    return files;
  }

  /**
   * Seed comprehensive test data for all scenarios
   */
  async seedComprehensiveData() {
    console.log('🌱 Seeding comprehensive test data...');

    // Seed users
    const users = await this.seedUsers(5);
    console.log(`✅ Created ${users.length} test users`);

    // Seed groups
    const { groups } = await this.seedGroups(5, 3);
    console.log(`✅ Created ${groups.length} test groups`);

    // Seed direct messages
    const directMessages = await this.seedDirectMessages(users, 20);
    console.log(`✅ Created ${directMessages.length} direct messages`);

    // Seed group messages
    const groupMessages = await this.seedGroupMessages(users, groups, 25);
    console.log(`✅ Created ${groupMessages.length} group messages`);

    // Seed files
    const files = await this.seedFiles(users, 8);
    console.log(`✅ Created ${files.length} test files`);

    console.log('🎉 Comprehensive test data seeding completed!');
    return {
      users,
      groups,
      directMessages,
      groupMessages,
      files,
      totalMessages: directMessages.length + groupMessages.length,
    };
  }

  /**
   * Seed minimal data for quick tests
   */
  async seedMinimalData() {
    console.log('🌱 Seeding minimal test data...');

    const users = await this.seedUsers(3);
    console.log(`✅ Created ${users.length} test users`);

    const { groups } = await this.seedGroups(3, 1);
    console.log(`✅ Created ${groups.length} test group`);

    const directMessages = await this.seedDirectMessages(users, 5);
    console.log(`✅ Created ${directMessages.length} direct messages`);

    const groupMessages = await this.seedGroupMessages(users, groups, 5);
    console.log(`✅ Created ${groupMessages.length} group messages`);

    console.log('🎉 Minimal test data seeding completed!');
    return {
      users,
      groups,
      directMessages,
      groupMessages,
      totalMessages: directMessages.length + groupMessages.length,
    };
  }

  /**
   * Clean up all seeded data
   */
  async cleanup() {
    console.log('🧹 Cleaning up test data...');

    try {
      // Clean up files first (they depend on messages)
      for (const { file, filePath } of this.createdData.files) {
        try {
          await file.destroy({ force: true });
          if (filePath) {
            const fs = await import('fs/promises');
            await fs.unlink(filePath).catch(() => {});
          }
        } catch (error) {
          console.error('Error deleting test file:', error);
        }
      }

      // Clean up messages
      for (const message of this.createdData.messages) {
        try {
          await message.destroy({ force: true });
        } catch (error) {
          console.error('Error deleting test message:', error);
        }
      }

      // Clean up group memberships
      for (const group of this.createdData.groups) {
        try {
          await GroupMember.destroy({ where: { groupId: group.id } });
          await group.destroy({ force: true });
        } catch (error) {
          console.error('Error deleting test group:', error);
        }
      }

      // Clean up users (including sessions)
      for (const user of this.createdData.users) {
        try {
          await user.destroy({ force: true });
        } catch (error) {
          console.error('Error deleting test user:', error);
        }
      }

      this.createdData = {
        users: [],
        groups: [],
        messages: [],
        files: [],
      };

      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get seeded data for use in tests
   */
  getSeededData() {
    return this.createdData;
  }

  /**
   * Get random user from seeded data
   */
  getRandomUser() {
    return this.createdData.users[
      Math.floor(Math.random() * this.createdData.users.length)
    ];
  }

  /**
   * Get random group from seeded data
   */
  getRandomGroup() {
    return this.createdData.groups[
      Math.floor(Math.random() * this.createdData.groups.length)
    ];
  }

  /**
   * Get users in a specific group
   */
  async getGroupMembers(groupId) {
    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: GroupMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
            }
          ]
        }
      ]
    });

    return group?.members?.map(m => m.user) || [];
  }
}

// Export singleton instance
export const testDatabaseSeeder = new TestDatabaseSeeder();