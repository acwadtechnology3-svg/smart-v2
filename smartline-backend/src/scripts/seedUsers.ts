import { supabase } from '../config/supabase';
import bcrypt from 'bcrypt';

async function seedUsers() {
  const users = [
    {
      phone: '+201234567890',
      password: 'Customer123',
      role: 'customer',
      full_name: 'Test Customer',
      email: 'customer@test.com',
    },
    {
      phone: '+201111111111',
      password: 'Driver123',
      role: 'driver',
      full_name: 'Ahmed Driver',
      email: 'driver1@test.com',
    },
    {
      phone: '+201222222222',
      password: 'Driver123',
      role: 'driver',
      full_name: 'Mohamed Driver',
      email: 'driver2@test.com',
    },
    {
      phone: '+201333333333',
      password: 'Driver123',
      role: 'driver',
      full_name: 'Ali Driver',
      email: 'driver3@test.com',
    },
    {
      phone: '+201999999999',
      password: 'Admin123',
      role: 'admin',
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  ];

  console.log('🌱 Seeding users...\n');

  for (const user of users) {
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', user.phone)
        .single();

      if (existing) {
        console.log(`⏭️  User ${user.phone} already exists`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      // Insert user
      const { data, error } = await supabase
        .from('users')
        .insert({
          phone: user.phone,
          password_hash: hashedPassword,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to create ${user.phone}:`, error.message);
      } else {
        console.log(`✅ Created ${user.role}: ${user.phone} (${user.full_name})`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating ${user.phone}:`, error.message);
    }
  }

  console.log('\n✨ Seeding complete!\n');
  console.log('Test Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Customer: +201234567890 / Customer123');
  console.log('Driver 1: +201111111111 / Driver123');
  console.log('Driver 2: +201222222222 / Driver123');
  console.log('Driver 3: +201333333333 / Driver123');
  console.log('Admin:    +201999999999 / Admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seedUsers().catch((error) => {
  console.error('Failed to seed users:', error);
  process.exit(1);
});
