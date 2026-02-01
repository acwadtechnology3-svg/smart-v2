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
