import bcrypt from 'bcryptjs';
import db from './src/models/index.js';

const resetPassword = async () => {
  try {
    const username = process.argv[2] || 'testuser1';
    const newPassword = process.argv[3] || 'Test123456#';

    console.log(`Resetting password for user: ${username}`);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log('Password hashed successfully');

    // Update the user's password
    const [updatedCount] = await db.User.update(
      {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      {
        where: { username },
      }
    );

    if (updatedCount === 0) {
      console.error(`❌ User '${username}' not found`);
      process.exit(1);
    }

    console.log(`✅ Password reset successfully for user: ${username}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetPassword();
