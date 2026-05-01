/**
 * Seed script — creates demo admin and student accounts
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const users = [
    {
      name: 'System Admin',
      email: 'admin@college.edu',
      password: 'admin123',
      role: 'admin',
    },
    {
      name: 'Priya Sharma',
      email: 'student@college.edu',
      password: 'student123',
      role: 'student',
    },
    {
      name: 'Rahul Verma',
      email: 'rahul@college.edu',
      password: 'student123',
      role: 'student',
    },
  ];

  for (const userData of users) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`⏭  Skipped ${userData.email} (already exists)`);
      continue;
    }
    const user = await User.create(userData);
    console.log(`✅ Created ${user.role}: ${user.email}`);
  }

  console.log('\n📋 Demo credentials:');
  console.log('   Admin:   admin@college.edu   / admin123');
  console.log('   Student: student@college.edu / student123');
  console.log('\n🏁 Seeding complete!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
