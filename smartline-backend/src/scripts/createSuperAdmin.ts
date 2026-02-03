import { supabase } from '../config/supabase';
import bcrypt from 'bcrypt';

const EMAIL = 'super@smartline.com';
const PASSWORD = 'SuperPassword123!';
const PHONE = '+201000000000';
const FULL_NAME = 'Super Administrator';

async function createSuperAdmin() {
    console.log('👑 Creating Super Admin...');
    console.log(`Email: ${EMAIL}`);
    console.log(`Password: ${PASSWORD}`);

    try {
        // 1. Check if exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', EMAIL)
            .single();

        if (existing) {
            console.log('⚠️  Super Admin already exists with this email.');
            // Optional: Update password if needed
            return;
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(PASSWORD, salt);

        // 3. Insert into public.users
        const { data, error } = await supabase
            .from('users')
            .insert({
                email: EMAIL,
                password_hash: hashedPassword,
                phone: PHONE,
                role: 'super_admin',
                full_name: FULL_NAME,
                // Add other required fields if any, defaulting to null/empty is safest if unknown
                is_active: true, // Assuming this might exist
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Failed to insert Super Admin:', error.message);
            // Check if role "super_admin" is valid constraint
            if (error.message.includes('role')) {
                console.error('Hint: Check if "super_admin" is a valid role in the database constraints.');
            }
        } else {
            console.log('✅ Super Admin created successfully!');
            console.log(data);
        }

    } catch (err: any) {
        console.error('❌ Unexpected error:', err.message);
    }
}

createSuperAdmin();
