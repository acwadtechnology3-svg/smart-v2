import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const createTripOffer = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { tripId, offerPrice } = req.body;

    if (!tripId || !offerPrice) {
      return res.status(400).json({ error: 'Missing tripId or offerPrice' });
    }

    const { data, error } = await supabase
      .from('trip_offers')
      .insert({
        trip_id: tripId,
        driver_id: driverId,
        offer_price: offerPrice,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ offer: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectTripOffer = async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;

    const { data: offer, error: offerError } = await supabase
      .from('trip_offers')
      .select('id, trip_id')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('customer_id')
      .eq('id', offer.trip_id)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.customer_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('trip_offers')
      .update({ status: 'rejected' })
      .eq('id', offerId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
