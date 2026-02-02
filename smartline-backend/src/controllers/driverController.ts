import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getDriverSummary = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, profile_photo_url, status, rating, users!inner(full_name)')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', driverId)
      .single();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: trips } = await supabase
      .from('trips')
      .select('final_price')
      .eq('driver_id', driverId)
      .eq('status', 'completed')
      .gte('created_at', todayStart.toISOString());

    const dailyEarnings = (trips || []).reduce(
      (sum, t: any) => sum + (t.final_price || 0),
      0
    );

    res.json({
      driver,
      balance: user?.balance || 0,
      dailyEarnings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getDriverMe = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json({ driver: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getDriverStatus = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { data, error } = await supabase
      .from('drivers')
      .select('status')
      .eq('id', driverId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json({ status: data.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const registerDriver = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const {
      national_id,
      city,
      vehicle_type,
      vehicle_model,
      vehicle_plate,
      profile_photo_url,
      id_front_url,
      id_back_url,
      license_front_url,
      license_back_url,
      vehicle_front_url,
      vehicle_back_url,
      vehicle_right_url,
      vehicle_left_url,
    } = req.body;

    const { error } = await supabase
      .from('drivers')
      .upsert(
        {
          id: driverId,
          national_id,
          city,
          vehicle_type,
          vehicle_model,
          vehicle_plate,
          status: 'pending',
          profile_photo_url,
          id_front_url,
          id_back_url,
          license_front_url,
          license_back_url,
          vehicle_front_url,
          vehicle_back_url,
          vehicle_right_url,
          vehicle_left_url,
        },
        { onConflict: 'id' }
      );

    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getDriverPublic = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { tripId } = req.query as { tripId?: string };

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('customer_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.customer_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, vehicle_model, vehicle_plate, rating, profile_photo_url, users!inner(full_name)')
      .eq('id', driverId)
      .single();

    if (error || !driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ driver });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
