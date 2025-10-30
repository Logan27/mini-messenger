const { Sequelize } = require('sequelize');

// Simple database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/messenger_dev', {
  dialect: 'postgres',
  logging: false
});

async function checkDatabase() {
  try {
    console.log('Connected to database');
    
    // Check messages table columns
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position
    `);
    
    console.log('Messages table columns:');
    results.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name}`);
    });
    
    // Check if deletedAt column exists
    const deletedAtColumn = results.find(row => row.column_name === 'deletedAt');
    const deletedAtSnakeColumn = results.find(row => row.column_name === 'deleted_at');
    
    console.log('\nDeleted column analysis:');
    console.log(`deletedAt column exists: ${!!deletedAtColumn}`);
    console.log(`deleted_at column exists: ${!!deletedAtSnakeColumn}`);
    
    // Check message_edit_history table
    const [historyTable] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'message_edit_history'
    `);
    
    console.log(`\nmessage_edit_history table exists: ${historyTable.length > 0}`);
    
    if (historyTable.length > 0) {
      const [historyColumns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'message_edit_history' 
        ORDER BY ordinal_position
      `);
      
      console.log('message_edit_history columns:');
      historyColumns.forEach((row, index) => {
        console.log(`${index + 1}. ${row.column_name}`);
      });
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();