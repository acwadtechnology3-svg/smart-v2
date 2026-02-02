import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Fetch user details
    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, full_name, email, role, balance, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user is a driver or just to be safe, try to fetch driver profile photo
    let profile_photo_url = null;
    if (user.role === 'driver') {
      const { data: driver } = await supabase
        .from('drivers')
        .select('profile_photo_url')
        .eq('id', userId)
        .single();

      if (driver) {
        profile_photo_url = driver.profile_photo_url;
      }
    }

    // Combine data
    const responseData = {
      ...user,
      profile_photo_url
    };

    res.json({ user: responseData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { full_name, email, preferences, profile_photo_url } = req.body;

    const updates: any = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;
    if (preferences) updates.preferences = preferences;

    // Update 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    // Update 'drivers' table if profile_photo_url is present
    if (profile_photo_url) {
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ profile_photo_url })
        .eq('id', userId); // Assuming drivers table uses same ID as users (from auth.users/public.users)

      if (driverError) {
        console.error('Failed to update driver photo:', driverError);
        // We don't fail the whole request, but logging it is important
      }
    }

    res.json({ success: true, user: userData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
