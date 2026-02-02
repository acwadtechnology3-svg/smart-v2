import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const createTrip = async (req: Request, res: Response) => {
    try {
        const {
            customer_id,
            pickup_lat, pickup_lng,
            dest_lat, dest_lng,
            pickup_address, dest_address,
            price,
            distance,
            duration,
            car_type,
            payment_method
        } = req.body;

        // Validation
        if (!customer_id || !pickup_lat || !dest_lat || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('trips')
            .insert({
                customer_id,
                pickup_lat,
                pickup_lng,
                dest_lat,
                dest_lng,
                pickup_address,
                dest_address,
                price,
                distance,
                duration,
                car_type,
                payment_method,
                status: 'requested'
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ trip: data });

    } catch (err) {
        console.error('Create Trip Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTripStatus = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;

        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        res.json({ trip: data });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const acceptTripOffer = async (req: Request, res: Response) => {
    try {
        const { tripId, offerId, driverId, finalPrice } = req.body;

        // 1. Update the Trip
        const { data: trip, error: tripError } = await supabase
            .from('trips')
            .update({
                driver_id: driverId,
                price: finalPrice,
                status: 'accepted'
            })
            .eq('id', tripId)
            .select()
            .single();

        if (tripError) throw tripError;

        // 2. Update the accepted offer
        await supabase
            .from('trip_offers')
            .update({ status: 'accepted' })
            .eq('id', offerId);

        // 3. Mark all other offers as 'rejected'
        await supabase
            .from('trip_offers')
            .update({ status: 'rejected' })
            .eq('trip_id', tripId)
            .neq('id', offerId);

        res.json({ success: true, trip });

    } catch (err: any) {
        console.error('Accept Offer Error:', err);
        res.status(500).json({ error: err.message });
    }
};
export const updateTripStatus = async (req: Request, res: Response) => {
    try {
        const { tripId, status } = req.body;

        console.log('=== UPDATE TRIP STATUS CALLED ===');
        console.log('Trip ID:', tripId);
        console.log('New Status:', status);

        const { data: tripData, error: fetchError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();

        if (fetchError) {
            console.error('Error fetching trip:', fetchError);
            throw fetchError;
        }

        console.log('Current trip status:', tripData.status);
        console.log('Payment method:', tripData.payment_method);
        console.log('Price:', tripData.price);
        console.log('Final price:', tripData.final_price);

        // If completing the trip, handle financial logic
        if (status === 'completed' && tripData.status !== 'completed') {
            console.log('>>> ENTERING WALLET LOGIC <<<');
            // 1. Get Driver Info & Wallet
            const driverId = tripData.driver_id;

            // Get Category Pricing to find Fee %
            // Assuming trip has car_type or similar. If not, use default 15%?
            // The trip table has 'car_type' (we added it implicitly in createTrip but schema implies it might be there or need join). 
            // In createTrip we insert car_type.

            let commissionRate = 0.15; // default 15%

            // Try fetch pricing
            if (tripData.car_type) {
                console.log('Fetching pricing for car_type:', tripData.car_type);
                const { data: pricing } = await supabase.from('pricing_settings').select('platform_fee_percent').eq('service_tier', tripData.car_type).single();
                if (pricing) {
                    commissionRate = pricing.platform_fee_percent / 100;
                    console.log('Found pricing:', pricing.platform_fee_percent, '% -> rate:', commissionRate);
                }
            }

            const finalPrice = tripData.final_price || tripData.price; // Fallback
            const platformFee = finalPrice * commissionRate;
            const driverEarnings = finalPrice - platformFee;

            console.log('Financial Calculation:');
            console.log('  Final Price:', finalPrice);
            console.log('  Commission Rate:', commissionRate * 100, '%');
            console.log('  Platform Fee:', platformFee);
            console.log('  Driver Earnings:', driverEarnings);

            // 2. Update Driver Balance
            console.log(`Processing Balance Update for Driver: ${driverId}`);

            // Get current driver balance
            const { data: driver, error: driverError } = await supabase
                .from('users')
                .select('balance')
                .eq('id', driverId)
                .single();

            if (driverError) {
                console.error('Error fetching driver:', driverError);
            } else {
                const currentBalance = driver.balance || 0;
                let amountChange = 0;
                let transactionType = 'payment';

                if (tripData.payment_method === 'cash') {
                    // Cash: Driver collected money, we deduct platform fee
                    amountChange = -platformFee;
                    transactionType = 'payment';
                } else {
                    // Wallet/Card: We collected money, we give driver their earnings
                    amountChange = driverEarnings;
                    transactionType = 'trip_earnings';
                }

                const newBalance = currentBalance + amountChange;
                console.log(`Updating Driver ${driverId}: Balance ${currentBalance} -> ${newBalance}`);

                // Update user balance
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ balance: newBalance })
                    .eq('id', driverId);

                if (updateError) {
                    console.error('Balance Update Failed:', updateError);
                } else {
                    console.log('✅ Balance updated successfully!');

                    // Log transaction
                    const { error: txError } = await supabase
                        .from('wallet_transactions')
                        .insert({
                            user_id: driverId,
                            amount: amountChange,
                            type: transactionType,
                            trip_id: tripId
                        });

                    if (txError) {
                        console.error('Transaction Log Failed:', txError);
                    } else {
                        console.log('✅ Transaction logged successfully!');
                    }
                }
            }
        }

        const { data, error } = await supabase
            .from('trips')
            .update({ status })
            .eq('id', tripId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, trip: data });
    } catch (err: any) {
        console.error('Update Trip Status Error:', err);
        res.status(500).json({ error: err.message });
    }
};
