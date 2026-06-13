const { initializeDatabase } = require('../config/database');
const { seedDatabase } = require('../db/seed');

(async () => {
  try {
    await initializeDatabase();
    await seedDatabase();
    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
})();
