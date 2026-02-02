import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { broadcastToDrivers } from '../realtime/broadcaster';

async function getTripById(tripId: string) {
    const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
    if (error || !data) throw new Error('Trip not found');
    return data;
}

async function assertTripParticipant(tripId: string, userId: string) {
    const { data, error } = await supabase
        .from('trips')
        .select('customer_id, driver_id')
        .eq('id', tripId)
        .single();
    if (error || !data) throw new Error('Trip not found');
    if (data.customer_id !== userId && data.driver_id !== userId) {
        throw new Error('Not authorized');
    }
    return data;
}

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
        const customerId = req.user?.id || customer_id;
        if (!customerId || !pickup_lat || !dest_lat || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('trips')
            .insert({
                customer_id: customerId,
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

        console.log(`[Trip Created] Trip ${data.id} created with status: ${data.status}`);
        console.log(`[Trip Created] Pickup: ${pickup_address}, Dest: ${dest_address}`);
        console.log(`[Trip Created] Car type: ${car_type}, Price: ${price}`);

        // Broadcast to all connected drivers
        broadcastToDrivers('INSERT', data);

        res.status(201).json({ trip: data });

    } catch (err) {
        console.error('Create Trip Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTripStatus = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.tripId as string;
        await assertTripParticipant(tripId, req.user!.id);

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

        const trip = await getTripById(tripId as string);
        if (trip.customer_id !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // 1. Update the Trip
        const { data: updatedTrip, error: tripError } = await supabase
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

        res.json({ success: true, trip: updatedTrip });

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

export const getTripDetail = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.tripId as string;
        await assertTripParticipant(tripId, req.user!.id);

        const { data, error } = await supabase
            .from('trips')
            .select('*, customer:customer_id(full_name, phone)')
            .eq('id', tripId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        res.json({ trip: data });
    } catch (err: any) {
        const status = err.message === 'Not authorized' ? 403 : 500;
        res.status(status).json({ error: err.message });
    }
};

export const cancelTrip = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.tripId as string;
        const trip = await getTripById(tripId);

        if (trip.customer_id !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (trip.status === 'completed') {
            return res.status(400).json({ error: 'Trip already completed' });
        }

        const { data, error } = await supabase
            .from('trips')
            .update({ status: 'cancelled' })
            .eq('id', tripId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, trip: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getTripParticipants = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.tripId as string;
        const participants = await assertTripParticipant(tripId, req.user!.id);
        res.json({ participants });
    } catch (err: any) {
        const status = err.message === 'Not authorized' ? 403 : 500;
        res.status(status).json({ error: err.message });
    }
};

export const getDriverTripHistory = async (req: Request, res: Response) => {
    try {
        const driverId = req.user!.id;
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driverId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ trips: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getActiveTrip = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .or(`customer_id.eq.${userId},driver_id.eq.${userId}`)
            .in('status', ['requested', 'accepted', 'arrived', 'started'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'No active trip found' });
        }

        res.json({ trip: data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
