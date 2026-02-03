// createSuperAdmin.js
// Run this with: node src/scripts/createSuperAdmin.js

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperAdmin() {
  const email = 'salahezzat120@gmail.com';
  const password = '12345678';
  const fullName = 'Salah Ezzat';

  try {
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert or update user
    const { data, error } = await supabase
      .from('dashboard_users')
      .upsert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: fullName,
        role: 'super_admin',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select();

    if (error) {
      console.error('Error creating super admin:', error);
      process.exit(1);
    }

    console.log('✅ Super admin created/updated successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: super_admin');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createSuperAdmin();
