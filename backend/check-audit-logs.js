import { sequelize } from './src/config/database.js';
import { AuditLog } from './src/models/index.js';
import { User } from './src/models/index.js';

async function checkAuditLogs() {
  try {
    console.log('🔍 Checking audit logs...\n');

    // Get total count
    const total = await AuditLog.count();
    console.log(`📊 Total audit logs: ${total}\n`);

    // Get sample logs with user info
    const logs = await AuditLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'role'],
          required: false,
        },
      ],
    });

    console.log('📋 Recent audit logs:');
    console.log('─'.repeat(80));

    logs.forEach((log, index) => {
      console.log(`${index + 1}. Action: ${log.action}`);
      console.log(`   User: ${log.user?.username || 'N/A'} (${log.user?.role || 'N/A'})`);
      console.log(`   Resource: ${log.resourceType || 'N/A'}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Date: ${log.createdAt}`);
      console.log('─'.repeat(80));
    });

    // Count by action type
    console.log('\n📊 Actions breakdown:');
    const actionCounts = await sequelize.query(
      `SELECT action, COUNT(*) as count
       FROM "auditLogs"
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`,
      { type: sequelize.QueryTypes.SELECT }
    );

    actionCounts.forEach(({ action, count }) => {
      console.log(`   ${action}: ${count}`);
    });

    // Count by user role
    console.log('\n👥 Logs by user role:');
    const roleCounts = await sequelize.query(
      `SELECT u.role, COUNT(*) as count
       FROM "auditLogs" a
       LEFT JOIN users u ON a."userId" = u.id
       GROUP BY u.role
       ORDER BY count DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    roleCounts.forEach(({ role, count }) => {
      console.log(`   ${role || 'NULL'}: ${count}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAuditLogs();
