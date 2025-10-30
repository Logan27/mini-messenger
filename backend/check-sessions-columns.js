import { sequelize } from './src/config/database.js';

async function checkSessionsColumns() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    
    const result = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY ordinal_position"
    );
    
    console.log('Sessions table columns:');
    result[0].forEach(row => {
      console.log(`  - ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkSessionsColumns();