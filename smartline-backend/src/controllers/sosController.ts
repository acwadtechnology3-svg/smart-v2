import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const createSosAlert = async (req: Request, res: Response) => {
  try {
    const { tripId, latitude, longitude, metadata } = req.body;

    if (!tripId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'tripId, latitude, and longitude are required' });
    }

    const { data, error } = await supabase
      .from('sos_alerts')
      .insert({
        trip_id: tripId,
        reporter_id: req.user!.id,
        latitude,
        longitude,
        status: 'pending',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ alert: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
