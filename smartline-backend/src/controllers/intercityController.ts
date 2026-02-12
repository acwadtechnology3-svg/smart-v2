import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { locationCache } from '../services/locationCache';
import { notifyDrivers } from '../realtime/broadcaster';

export const createRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const {
            pickup_location,
            pickup_lat,
            pickup_lng,
            destination_location,
            destination_lat,
            destination_lng,
            scheduled_time,
            seats_requested,
            is_entire_car,
            offer_price
        } = req.body;

        const { data, error } = await supabase
            .from('intercity_requests')
            .insert({
                user_id: userId,
                pickup_location,
                pickup_lat,
                pickup_lng,
                destination_location,
                destination_lat,
                destination_lng,
                scheduled_time,
                seats_requested,
                is_entire_car,
                offer_price,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Broadcast to Drivers
        try {
            // Normalize payload to match Trip structure for Driver App compatibility
            const broadcastPayload = {
                id: data.id,
                customer_id: userId,
                pickup_lat: data.pickup_lat,
                pickup_lng: data.pickup_lng,
                dest_lat: data.destination_lat,
                dest_lng: data.destination_lng,
                pickup_address: data.pickup_location,
                dest_address: data.destination_location,
                status: 'requested',
                price: data.offer_price,
                is_travel_request: true,
                seats_required: data.seats_requested,
                is_entire_car: data.is_entire_car,
                created_at: data.created_at,
                // Defaults
                distance: 0,
                duration: 0,
                payment_method: 'cash',
                car_type: 'intercity',
            };

            // 1. Find nearby online drivers (Radius: 50km for intercity)
            const nearby = await locationCache.getNearbyDrivers(data.pickup_lat, data.pickup_lng, 50);
            const nearIds = nearby.map(d => d.driverId);

            if (nearIds.length > 0) {
                // 2. Filter for Approved Travel Captains
                const { data: captains } = await supabase
                    .from('drivers')
                    .select('id')
                    .in('id', nearIds)
                    .eq('is_travel_captain', true)
                    .eq('travel_captain_status', 'approved');

                if (captains && captains.length > 0) {
                    const targetIds = captains.map(c => c.id);
                    notifyDrivers(targetIds, 'INSERT', broadcastPayload);
                    console.log(`[Intercity] Broadcasted request ${data.id} to ${targetIds.length} Travel Captains.`);
                } else {
                    console.log('[Intercity] No approved Travel Captains nearby.');
                }
            } else {
                console.log('[Intercity] No online drivers nearby (50km).');
            }
        } catch (broadcastErr) {
            console.error('[Intercity] Broadcast failed:', broadcastErr);
            // Don't fail the request if broadcast fails
        }

        res.status(201).json({ success: true, trip: data });
    } catch (err: any) {
        console.error('Create Intercity Request Error:', err);
        res.status(500).json({ error: err.message });
    }
};
