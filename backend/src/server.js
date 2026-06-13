const { app } = require('./app');
const { env } = require('./config/env');
const { initializeDatabase } = require('./config/database');
const { seedDatabase } = require('./db/seed');

(async () => {
  try {
    await initializeDatabase();
    await seedDatabase();

    app.listen(env.PORT, () => {
      console.log(`SafeHer backend listening on port ${env.PORT}`);
      console.log(`Health check: ${env.APP_BASE_URL}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
})();
