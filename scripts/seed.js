require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { SocialLink } = require('../src/models/index');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create admin
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL_SEED });
  if (!existingAdmin) {
    await User.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL_SEED,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      status: 'active',
    });
    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL_SEED}`);
  } else {
    console.log('ℹ️  Admin already exists, skipping.');
  }

  // Seed social links
  const existingLinks = await SocialLink.countDocuments();
  if (existingLinks === 0) {
    await SocialLink.insertMany([
      { platform: 'LinkedIn', url: 'https://linkedin.com/company/cyrotics', icon: 'linkedin', order: 1 },
      { platform: 'Twitter', url: 'https://twitter.com/cyrotics', icon: 'twitter', order: 2 },
      { platform: 'Instagram', url: 'https://instagram.com/cyrotics', icon: 'instagram', order: 3 },
      { platform: 'YouTube', url: 'https://youtube.com/@cyrotics', icon: 'youtube', order: 4 },
    ]);
    console.log('✅ Social links seeded.');
  }

  console.log('🌱 Seed complete.');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
