const User = require('../models/User');

async function ensureAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) return;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      console.warn(`Admin bootstrap skipped: ${email} already exists with role "${existingUser.role}".`);
    }
    return;
  }

  const admin = await User.create({
    name: process.env.ADMIN_NAME?.trim() || 'Vastra Admin',
    email,
    password,
    phone: process.env.ADMIN_PHONE?.trim() || '',
    role: 'admin',
  });

  console.log(`Admin bootstrap complete: ${admin.email}`);
}

module.exports = { ensureAdminFromEnv };
