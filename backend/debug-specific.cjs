const { sequelize } = require('./src/models');

(async () => {
  try {
    console.log('✅ Sequelize instance created for development environment');
    
    // Check messages table for deleted columns
    const [messagesColumns] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'messages' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Messages table columns:');
    messagesColumns.forEach(col => console.log(`  - ${col.column_name}`));
    
    const deletedColumns = messagesColumns.filter(col => 
      col.column_name.toLowerCase().includes('deleted')
    );
    
    console.log('\nDeleted-related columns in messages:');
    deletedColumns.forEach(col => console.log(`  - ${col.column_name}`));
    
    // Check if message_edit_history table exists
    try {
      const historyTableResult = await sequelize.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'message_edit_history'
      `);
      
      const historyTableCheck = historyTableResult[0];
      console.log(`\nmessage_edit_history table exists: ${historyTableCheck && historyTableCheck.length > 0}`);
      
      if (historyTableCheck && historyTableCheck.length > 0) {
        const historyColumnsResult = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'message_edit_history' AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        const historyColumns = historyColumnsResult[0];
        console.log('\nmessage_edit_history table columns:');
        historyColumns.forEach(col => console.log(`  - ${col.column_name}`));
      }
    } catch (error) {
      console.log('\nmessage_edit_history table check failed:', error.message);
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
  }
})();