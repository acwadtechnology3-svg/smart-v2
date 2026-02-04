import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { broadcastToDrivers, notifyDriver } from '../realtime/broadcaster';

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

// ... imports

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
            payment_method,
            promo_code // New field
        } = req.body;

        // Validation
        const customerId = req.user?.id || customer_id;
        if (!customerId || !pickup_lat || !dest_lat || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let promoId = null;
        let discountAmount = 0;

        // Promo Code Logic
        if (promo_code) {
            const { data: promo, error: promoError } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', promo_code)
                .single();

            if (promo && promo.is_active) {
                // Check validity
                const now = new Date();
                const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;
                const limitReached = promo.max_uses && promo.current_uses >= promo.max_uses;

                if (!limitReached && (!validUntil || validUntil > now)) {
                    promoId = promo.id;

                    // Increment usage
                    await supabase
                        .from('promo_codes')
                        .update({ current_uses: (promo.current_uses || 0) + 1 })
                        .eq('id', promo.id);

                    console.log(`[Trip] Applied promo ${promo_code} (ID: ${promoId})`);
                } else {
                    console.warn(`[Trip] Promo ${promo_code} is invalid or expired.`);
                }
            } else {
                console.warn(`[Trip] Promo ${promo_code} not found or inactive.`);
            }
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
                price, // This is the discounted price passed from frontend
                distance,
                duration,
                car_type,
                payment_method,
                status: 'requested',
                promo_code: promoId ? promo_code : null, // Store if valid
                promo_id: promoId
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log(`[Trip Created] Trip ${data.id} created with status: ${data.status}`);
        console.log(`[Trip Created] Price: ${price} (Promo: ${promo_code || 'None'})`);

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

        // CRITICAL: Check if trip is already accepted (prevent race condition)
        if (trip.status !== 'requested') {
            return res.status(409).json({ error: 'Trip already has a driver' });
        }
        if (trip.driver_id) {
            return res.status(409).json({ error: 'Trip already assigned to another driver' });
        }

        // 1. Update the Trip with optimistic locking
        const { data: updatedTrip, error: tripError } = await supabase
            .from('trips')
            .update({
                driver_id: driverId,
                price: finalPrice,
                status: 'accepted'
            })
            .eq('id', tripId)
            .eq('status', 'requested') // Optimistic locking - only update if still requested
            .select()
            .single();

        if (tripError) {
            console.error('Trip update error:', tripError);
            throw new Error('Failed to accept offer');
        }

        if (!updatedTrip) {
            // Another request already updated this trip
            return res.status(409).json({ error: 'Trip already accepted by another driver' });
        }

        // 2. Update the accepted offer
        const { data: acceptedOffer, error: offerError } = await supabase
            .from('trip_offers')
            .update({ status: 'accepted' })
            .eq('id', offerId)
            .select() // Select return data to send in notification
            .single();

        if (offerError) {
            console.error('Failed to update offer status:', offerError);
            // We continue anyway as trip is updated, but notification might fail via distinct path
        }

        // 3. Mark all other offers as 'rejected'
        await supabase
            .from('trip_offers')
            .update({ status: 'rejected' })
            .eq('trip_id', tripId)
            .neq('id', offerId);

        // MANUAL BROADCAST TO DRIVER
        // This ensures they get the 'accepted' event even if Postgres Realtime lags or fails
        if (updatedTrip) {
            console.log(`[TripAccepted] Notifying driver ${driverId} with full trip details`);
            // Send full trip object so frontend can start immediately without fetch
            notifyDriver(driverId, 'TRIP_ACCEPTED', updatedTrip);
        }

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

        const updates: any = { status };
        const now = new Date().toISOString();

        if (status === 'arrived') updates.arrived_at = now;
        if (status === 'started') updates.started_at = now;

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
            let waitingRate = 0;

            // Try fetch pricing
            if (tripData.car_type) {
                console.log('Fetching pricing for car_type:', tripData.car_type);
                const { data: pricing } = await supabase.from('pricing_settings')
                    .select('platform_fee_percent, waiting_price_per_min')
                    .eq('service_tier', tripData.car_type)
                    .single();

                if (pricing) {
                    commissionRate = pricing.platform_fee_percent / 100;
                    waitingRate = Number(pricing.waiting_price_per_min) || 0;
                    console.log('Found pricing:', pricing.platform_fee_percent, '% -> rate:', commissionRate, 'Waiting Rate:', waitingRate);
                }
            }

            // Calculate Waiting Fee
            let waitingFee = 0;
            if (tripData.arrived_at && tripData.started_at) {
                const arrive = new Date(tripData.arrived_at);
                const start = new Date(tripData.started_at);
                const diffMins = (start.getTime() - arrive.getTime()) / 60000;

                if (diffMins > 5) {
                    waitingFee = (diffMins - 5) * waitingRate;
                    console.log(`[Billing] Waiting time: ${diffMins.toFixed(1)}m. Billable: ${(diffMins - 5).toFixed(1)}m. Fee: ${waitingFee}`);
                }
            }

            updates.waiting_cost = waitingFee;

            const finalPrice = (tripData.final_price || tripData.price) + waitingFee;
            updates.final_price = finalPrice;

            const platformFee = finalPrice * commissionRate;
            const driverEarnings = finalPrice - platformFee;

            console.log('\n==========================================');
            console.log('🏁 TRIP COMPLETED: FINANCIAL SUMMARY');
            console.log('==========================================');
            console.log(`🆔 Trip ID:        ${tripId}`);
            console.log(`🚗 Car Type:       ${tripData.car_type || 'N/A'}`);
            console.log(`💳 Payment:        ${tripData.payment_method}`);
            console.log('------------------------------------------');
            console.log(`💰 Base/Offer Price: ${Number(tripData.price).toFixed(2)} EGP`);
            console.log(`⏳ Waiting Fee:      ${waitingFee.toFixed(2)} EGP`);
            console.log(`💵 FINAL TOTAL:      ${finalPrice.toFixed(2)} EGP`);
            console.log('------------------------------------------');
            console.log(`📉 Comm. Rate:       ${(commissionRate * 100).toFixed(0)}%`);
            console.log(`🏦 App Revenue:      ${platformFee.toFixed(2)} EGP`);
            console.log(`👨‍✈️ Driver Net:       ${driverEarnings.toFixed(2)} EGP`);
            console.log('==========================================\n');

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
            .update(updates)
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

export const getRequestedTrips = async (req: Request, res: Response) => {
    try {
        // Simple fetch for all requested trips.
        // In production, add geospatial filtering (PostGIS) or simple lat/lng box query.
        // For now, fetch latest 10 requested trips.
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('status', 'requested')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ trips: data || [] });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
