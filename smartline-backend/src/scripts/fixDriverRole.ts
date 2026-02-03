import { supabase } from '../config/supabase';

const PHONE = process.argv[2]; // Get phone from command line argument

if (!PHONE) {
    console.error('Please provide a phone number: npm run script src/scripts/fixDriverRole.ts +201xxxxxxxxx');
    process.exit(1);
}

async function fixDriverRole() {
    console.log(`Checking user: ${PHONE}...`);

    // 1. Get User
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', PHONE)
        .single();

    if (error || !user) {
        console.error('❌ User not found!');
        return;
    }

    console.log(`Found User: ${user.full_name} | Current Role: ${user.role}`);

    // 2. Update Role to Driver
    if (user.role !== 'driver') {
        const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'driver' })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Failed to update role:', updateError.message);
            return;
        }
        console.log('✅ Role updated to: driver');
    }

    // 3. Ensure Driver Schema Record Exists
    const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('id', user.id)
        .single();

    if (!driver) {
        console.log('⚠️ Driver profile missing. Creating empty profile...');
        const { error: insertError } = await supabase
            .from('drivers')
            .insert({
                id: user.id,
                status: 'approved', // Auto-approve for testing
                is_online: false,
                rating: 5.0
            });

        if (insertError) {
            console.error('❌ Failed to create driver profile:', insertError.message);
        } else {
            console.log('✅ Driver profile created & approved.');
        }
    } else {
        console.log('✅ Driver profile exists.');

        // Ensure approved
        await supabase.from('drivers').update({ status: 'approved' }).eq('id', user.id);
        console.log('✅ Driver status ensured as: approved');
    }
}

fixDriverRole();
