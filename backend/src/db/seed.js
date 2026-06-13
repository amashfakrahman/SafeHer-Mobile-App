const { getDb } = require('../config/database');
const helpCenters = [
  {
    name: 'Dhaka Metropolitan Police - Tejgaon Zone',
    type: 'police',
    phone: '+880255000111',
    latitude: 23.7641,
    longitude: 90.3895,
    address: 'Tejgaon Industrial Area, Dhaka',
    city: 'Dhaka',
  },
  {
    name: 'Dhaka Medical Emergency Unit',
    type: 'hospital',
    phone: '+880255000222',
    latitude: 23.7251,
    longitude: 90.3987,
    address: 'Bakshibazar, Dhaka',
    city: 'Dhaka',
  },
  {
    name: 'Women Support Desk - Gulshan',
    type: 'police',
    phone: '+880255000333',
    latitude: 23.7925,
    longitude: 90.4078,
    address: 'Gulshan 1 Circle, Dhaka',
    city: 'Dhaka',
  },
  {
    name: 'Square Hospital Emergency',
    type: 'hospital',
    phone: '+880255000444',
    latitude: 23.7511,
    longitude: 90.3841,
    address: 'Panthapath, Dhaka',
    city: 'Dhaka',
  },
  {
    name: 'Chattogram Kotwali Police Station',
    type: 'police',
    phone: '+880311234567',
    latitude: 22.3363,
    longitude: 91.8365,
    address: 'Kotwali, Chattogram',
    city: 'Chattogram',
  },
  {
    name: 'Chattogram Medical College Hospital',
    type: 'hospital',
    phone: '+880311234568',
    latitude: 22.3596,
    longitude: 91.8254,
    address: 'Anderkilla, Chattogram',
    city: 'Chattogram',
  },
];

async function seedDatabase() {
  const db = await getDb();

  const countRow = await db.get('SELECT COUNT(*) AS count FROM help_centers');
  if (!countRow || countRow.count === 0) {
    for (const center of helpCenters) {
      await db.run(
        `INSERT INTO help_centers (name, type, phone, latitude, longitude, address, city)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [center.name, center.type, center.phone, center.latitude, center.longitude, center.address, center.city]
      );
    }
  }
}
module.exports = { seedDatabase };
