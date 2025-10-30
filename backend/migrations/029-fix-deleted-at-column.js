/**
 * Migration to fix the deleted_at column issue
 * 
 * This migration:
 * 1. Drops the is_deleted BOOLEAN column
 * 2. Adds the deleted_at TIMESTAMP column
 * 3. Adds the deleteType ENUM column
 * 4. Updates the table structure to match the Message model
 */

import { sequelize } from '../src/config/database.js';

export const up = async () => {
  try {
    console.log('🔄 Running migration: Fix deleted_at column');
    
    // Check if is_deleted column exists and drop it
    const [isDeletedResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'is_deleted'
    `);
    
    if (isDeletedResults.length > 0) {
      console.log('🗑️  Dropping is_deleted column');
      await sequelize.query('ALTER TABLE messages DROP COLUMN IF EXISTS is_deleted');
    }
    
    // Check if deleted_at column exists
    const [deletedAtResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'deleted_at'
    `);
    
    // Add deleted_at column if it doesn't exist
    if (deletedAtResults.length === 0) {
      console.log('➕ Adding deleted_at column');
      await sequelize.query(`
        ALTER TABLE messages 
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE
      `);
    }
    
    // Check if delete_type column exists
    const [deleteTypeResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'delete_type'
    `);
    
    // Add delete_type column if it doesn't exist
    if (deleteTypeResults.length === 0) {
      console.log('➕ Adding delete_type column');
      await sequelize.query(`
        ALTER TABLE messages 
        ADD COLUMN delete_type VARCHAR(10)
      `);
    }
    
    // Check if status column exists and update it if needed
    const [statusResults] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'status'
    `);
    
    if (statusResults.length > 0 && statusResults[0].data_type !== 'character varying') {
      console.log('🔄 Updating status column to VARCHAR');
      // First drop the enum constraint if it exists, then convert to VARCHAR
      try {
        await sequelize.query(`
          ALTER TABLE messages
          DROP CONSTRAINT IF EXISTS messages_status_check
        `);
      } catch (error) {
        console.log('⚠️  No constraint to drop or error dropping constraint:', error.message);
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE messages
          ALTER COLUMN status TYPE VARCHAR(20) USING status::text
        `);
      } catch (error) {
        console.log('⚠️  Error converting column type, trying alternative approach:', error.message);
        // Alternative approach: add new column, copy data, drop old, rename
        await sequelize.query(`
          ALTER TABLE messages
          ADD COLUMN status_new VARCHAR(20)
        `);
        
        await sequelize.query(`
          UPDATE messages
          SET status_new = status::text
        `);
        
        await sequelize.query(`
          ALTER TABLE messages
          DROP COLUMN status
        `);
        
        await sequelize.query(`
          ALTER TABLE messages
          RENAME COLUMN status_new TO status
        `);
      }
    }
    
    // Add indexes for performance
    console.log('📊 Adding indexes');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_deleted_at 
      ON messages(deleted_at) 
      WHERE deleted_at IS NOT NULL
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_delete_type 
      ON messages(delete_type)
    `);
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    console.log('⏪ Rolling back migration: Fix deleted_at column');
    
    // Add back is_deleted column
    await sequelize.query(`
      ALTER TABLE messages 
      ADD COLUMN is_deleted BOOLEAN DEFAULT false
    `);
    
    // Drop deleted_at column
    await sequelize.query(`
      ALTER TABLE messages 
      DROP COLUMN IF EXISTS deleted_at
    `);
    
    // Drop delete_type column
    await sequelize.query(`
      ALTER TABLE messages 
      DROP COLUMN IF EXISTS delete_type
    `);
    
    console.log('✅ Rollback completed successfully');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('🎉 Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}