const { sequelize } = require('./src/models');

(async () => {
  try {
    const tables = ['users', 'messages', 'contacts', 'password_history', 'calls', 'notifications', 'audit_logs', 'reports', 'announcements'];
    
    for (const table of tables) {
      const [results] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '${table}' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log(`${table} table columns:`);
      results.forEach(r => console.log('  -', r.column_name));
      console.log('');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
  }
})();