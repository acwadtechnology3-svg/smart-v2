import { supabase } from '../lib/supabase';

/**
 * Test Realtime Connection
 * Run this to verify Supabase Realtime is working
 */
export const testRealtimeConnection = async () => {
    console.log("========================================");
    console.log("🧪 TESTING REALTIME CONNECTION");
    console.log("========================================");

    // Test 1: Check if we can connect to Supabase
    try {
        const { data, error } = await supabase.from('trips').select('count').limit(1);
        if (error) {
            console.error("❌ Database connection failed:", error.message);
            return false;
        }
        console.log("✅ Database connection successful");
    } catch (err) {
        console.error("❌ Database connection error:", err);
        return false;
    }

    // Test 2: Subscribe to trips table
    console.log("\n🔌 Testing Realtime subscription to 'trips' table...");

    const channel = supabase
        .channel('test-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'trips' },
            (payload) => {
                console.log("✅ REALTIME WORKING! Received trip:", payload.new.id);
            }
        )
        .subscribe((status, err) => {
            console.log(`📡 Subscription status: ${status}`);
            if (err) {
                console.error("❌ Subscription error:", err);
            }
            if (status === 'SUBSCRIBED') {
                console.log("✅ Successfully subscribed to Realtime!");
                console.log("\n📝 Now create a trip from the customer app to test...");
            }
            if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                console.error("❌ Realtime connection failed!");
                console.log("\n🔧 Troubleshooting:");
                console.log("1. Check if Realtime is enabled in Supabase Dashboard");
                console.log("2. Verify the table is added to the publication");
                console.log("3. Check your internet connection");
            }
        });

    // Keep the test running for 30 seconds
    setTimeout(() => {
        console.log("\n⏱️ Test timeout - cleaning up...");
        supabase.removeChannel(channel);
        console.log("========================================");
    }, 30000);

    return true;
};

// Auto-run test if this file is imported
console.log("💡 Realtime test module loaded. Call testRealtimeConnection() to run test.");
