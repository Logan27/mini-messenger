import { sequelize } from './src/config/database.js';
import './src/models/index.js'; // This loads all models

async function syncDatabase() {
  try {
    console.log('🔄 Syncing database schema...');

    // Sync all models to database
    // alter: true will add missing columns/tables without dropping existing data
    await sequelize.sync({ alter: true });

    console.log('✅ Database schema synced successfully');

    // Show all tables
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 Database tables:');
    tables.forEach(({ tablename }) => console.log(`  - ${tablename}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    process.exit(1);
  }
}

syncDatabase();
