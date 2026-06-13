const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { env } = require('./env');

let database;

async function connectDatabase() {
  if (database) {
    return database;
  }

  const databaseDir = path.dirname(env.DB_PATH);
  fs.mkdirSync(databaseDir, { recursive: true });

  database = await open({
    filename: env.DB_PATH,
    driver: sqlite3.Database,
  });

  await database.exec('PRAGMA foreign_keys = ON;');
  await database.exec('PRAGMA journal_mode = WAL;');
  await database.exec('PRAGMA synchronous = NORMAL;');
  await database.exec('PRAGMA busy_timeout = 5000;');
  await database.exec('PRAGMA temp_store = MEMORY;');

  return database;
}

async function getDb() {
  if (!database) {
    await connectDatabase();
  }

  return database;
}

async function ensureColumn(db, tableName, columnName, definition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function runLightweightMigrations(db) {
  await ensureColumn(db, 'location_shares', 'expires_at', 'TEXT');
  await ensureColumn(db, 'location_shares', 'revoked_at', 'TEXT');
  await ensureColumn(db, 'location_shares', 'last_viewed_at', 'TEXT');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shares_active_expiry ON location_shares(user_id, is_active, expires_at);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shares_revoked ON location_shares(revoked_at);');
}

async function initializeDatabase() {
  const db = await getDb();
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);
  await runLightweightMigrations(db);
  return db;
}

module.exports = {
  connectDatabase,
  getDb,
  initializeDatabase,
};
