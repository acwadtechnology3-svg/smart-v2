import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Get driver's destination preferences
export const getDestinationPreferences = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;

    // Get or create preference record
    let { data: prefs, error: prefsError } = await supabase
      .from('driver_destination_preferences')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    // If no preferences exist, create default
    if (!prefs) {
      const { data: newPrefs, error: createError } = await supabase
        .from('driver_destination_preferences')
        .insert({ driver_id: driverId, enabled: false })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Failed to create preferences' });
      }
      prefs = newPrefs;
    }

    // Get destinations
    const { data: destinations, error: destError } = await supabase
      .from('driver_preferred_destinations')
      .select('*')
      .eq('preference_id', prefs.id)
      .order('priority', { ascending: true });

    if (destError) {
      return res.status(500).json({ error: 'Failed to fetch destinations' });
    }

    res.json({
      enabled: prefs.enabled,
      maxDeviationMeters: prefs.max_deviation_meters,
      destinations: destinations || []
    });
  } catch (err: any) {
    console.error('Get destination preferences error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update preference settings (enabled, maxDeviation)
export const updateDestinationPreferences = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { enabled, maxDeviationMeters } = req.body;

    // Get preference record
    let { data: prefs } = await supabase
      .from('driver_destination_preferences')
      .select('id')
      .eq('driver_id', driverId)
      .single();

    // Create if doesn't exist
    if (!prefs) {
      const { data: newPrefs, error: createError } = await supabase
        .from('driver_destination_preferences')
        .insert({ driver_id: driverId })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Failed to create preferences' });
      }
      prefs = newPrefs;
    }

    // Update
    const updates: any = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (maxDeviationMeters !== undefined) updates.max_deviation_meters = maxDeviationMeters;
    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('driver_destination_preferences')
      .update(updates)
      .eq('id', prefs!.id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Update destination preferences error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add a preferred destination (max 3)
export const addPreferredDestination = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { name, lat, lng, radiusMeters = 5000, priority = 1 } = req.body;

    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Name, lat, and lng are required' });
    }

    // Get preference record
    let { data: prefs } = await supabase
      .from('driver_destination_preferences')
      .select('id')
      .eq('driver_id', driverId)
      .single();

    if (!prefs) {
      const { data: newPrefs, error: createError } = await supabase
        .from('driver_destination_preferences')
        .insert({ driver_id: driverId })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Failed to create preferences' });
      }
      prefs = newPrefs;
    }

    // Check current count
    const { count, error: countError } = await supabase
      .from('driver_preferred_destinations')
      .select('*', { count: 'exact', head: true })
      .eq('preference_id', prefs!.id);

    if (countError) {
      return res.status(500).json({ error: 'Failed to check destination count' });
    }

    if (count && count >= 3) {
      return res.status(400).json({ error: 'Maximum 3 destinations allowed. Delete one first.' });
    }

    // Insert destination
    const { data: destination, error: insertError } = await supabase
      .from('driver_preferred_destinations')
      .insert({
        preference_id: prefs!.id,
        name,
        lat,
        lng,
        radius_meters: radiusMeters,
        priority: Math.min(Math.max(priority, 1), 3)
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to add destination' });
    }

    res.json({ success: true, destination });
  } catch (err: any) {
    console.error('Add preferred destination error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a preferred destination
export const deletePreferredDestination = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { destinationId } = req.params;

    // Get preference record
    const { data: prefs } = await supabase
      .from('driver_destination_preferences')
      .select('id')
      .eq('driver_id', driverId)
      .single();

    if (!prefs) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    // Delete destination (ensuring it belongs to this driver's preference)
    const { error: deleteError } = await supabase
      .from('driver_preferred_destinations')
      .delete()
      .eq('id', destinationId)
      .eq('preference_id', prefs!.id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete destination' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete preferred destination error:', err);
    res.status(500).json({ error: err.message });
  }
};
