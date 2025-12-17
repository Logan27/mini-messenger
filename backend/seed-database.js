import bcrypt from 'bcryptjs';
import db from './src/models/index.js';

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Hash password for test users
    const password = await bcrypt.hash('Test123456#', 12);

    // Create or get admin user
    let admin = await db.User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      admin = await db.User.create({
        username: 'admin',
        email: 'admin@messenger.local',
        passwordHash: password,
        role: 'admin',
        status: 'active',
        firstName: 'Admin',
        lastName: 'User',
        bio: 'System administrator',
        onlineStatus: 'offline',
        twoFactorEnabled: false,
        emailVerified: true
      });
      console.log('✓ Created admin user');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Create test users
    const users = [];
    for (let i = 1; i <= 5; i++) {
      let user = await db.User.findOne({ where: { username: `testuser${i}` } });
      if (!user) {
        user = await db.User.create({
          username: `testuser${i}`,
          email: `testuser${i}@test.com`,
          passwordHash: password,
          role: 'user',
          status: 'active',
          firstName: `Test`,
          lastName: `User${i}`,
          bio: `Test user ${i} bio`,
          onlineStatus: 'offline',
          twoFactorEnabled: false,
          emailVerified: true
        });
        console.log(`✓ Created testuser${i}`);
      } else {
        console.log(`✓ testuser${i} already exists`);
      }
      users.push(user);
    }
    console.log(`✓ Total ${users.length} test users available`);

    // Create some messages between users
    const messages = [];
    for (let i = 0; i < users.length - 1; i++) {
      const message = await db.Message.create({
        senderId: users[i].id,
        recipientId: users[i + 1].id,
        content: `Hello from ${users[i].username} to ${users[i + 1].username}`,
        messageType: 'text',
        isRead: false,
        isDelivered: true,
        isEdited: false
      });
      messages.push(message);
    }
    console.log(`✓ Created ${messages.length} test messages`);

    // Create contacts between users
    for (let i = 0; i < users.length - 1; i++) {
      const existing = await db.Contact.findOne({
        where: {
          userId: users[i].id,
          contactUserId: users[i + 1].id
        }
      });
      if (!existing) {
        await db.Contact.create({
          userId: users[i].id,
          contactUserId: users[i + 1].id,
          status: 'accepted'
        });
      }
    }
    console.log('✓ Created test contacts');

    // Create a test group
    let group = await db.Group.findOne({ where: { name: 'Test Group' } });
    if (!group) {
      group = await db.Group.create({
        name: 'Test Group',
        description: 'A test group for development',
        creatorId: admin.id,
        groupType: 'private',
        isActive: true
      });
      console.log('✓ Created test group');
    } else {
      console.log('✓ Test group already exists');
    }

    // Add users to the group
    for (let i = 0; i < 3; i++) {
      const existing = await db.GroupMember.findOne({
        where: {
          groupId: group.id,
          userId: users[i].id
        }
      });
      if (!existing) {
        try {
          await db.GroupMember.create({
            groupId: group.id,
            userId: users[i].id,
            role: i === 0 ? 'admin' : 'moderator'
          });
        } catch (err) {
          console.log(`  ⚠️  Could not add user ${i+1} to group:`, err.message);
        }
      }
    }
    console.log('✓ Added members to test group');

    // Create notification settings for users
    for (const user of users) {
      const existing = await db.NotificationSettings.findOne({
        where: { userId: user.id }
      });
      if (!existing) {
        await db.NotificationSettings.create({
          userId: user.id,
          messageNotifications: true,
          callNotifications: true,
          groupNotifications: true,
          emailNotifications: true,
          pushNotifications: true,
          muteAll: false
        });
      }
    }
    console.log('✓ Created notification settings');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@messenger.local / Test123456#');
    console.log('Users: testuser1@test.com to testuser5@test.com / Test123456#');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
