import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

/**
 * Create SOS Alert
 * POST /api/sos/create
 */
export const createSOSAlert = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { latitude, longitude, trip_id, notes } = req.body;

    // Create SOS alert
    const { data: alert, error } = await supabase
      .from('sos_alerts')
      .insert({
        driver_id: driverId,
        reporter_id: driverId, // Driver is the reporter
        trip_id: trip_id || null,
        latitude,
        longitude,
        notes,
        status: 'pending' // Dashboard expects 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: alert,
      message: 'SOS alert created successfully'
    });
  } catch (error: any) {
    console.error('Create SOS alert error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOS_CREATE_FAILED',
        message: error.message || 'Failed to create SOS alert'
      }
    });
  }
};

/**
 * Get driver's SOS alerts
 * GET /api/sos/my-alerts
 */
export const getMySOSAlerts = async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;

    const { data: alerts, error } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: alerts
    });
  } catch (error: any) {
    console.error('Get my SOS alerts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOS_FETCH_FAILED',
        message: error.message || 'Failed to fetch SOS alerts'
      }
    });
  }
};

/**
 * Get all SOS alerts (Admin only)
 * GET /api/sos/all
 */
export const getAllSOSAlerts = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('sos_alerts')
      .select(`
        *,
        driver:users!driver_id(id, name, phone, profile_photo_url),
        resolved_by_user:dashboard_users!resolved_by(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: alerts, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error: any) {
    console.error('Get all SOS alerts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOS_FETCH_FAILED',
        message: error.message || 'Failed to fetch SOS alerts'
      }
    });
  }
};

/**
 * Resolve SOS alert (Admin only)
 * POST /api/sos/resolve/:id
 */
export const resolveSOSAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { notes } = req.body;

    const { data: alert, error } = await supabase
      .from('sos_alerts')
      .update({
        status: 'resolved',
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: alert,
      message: 'SOS alert resolved successfully'
    });
  } catch (error: any) {
    console.error('Resolve SOS alert error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOS_RESOLVE_FAILED',
        message: error.message || 'Failed to resolve SOS alert'
      }
    });
  }
};

/**
 * Cancel SOS alert (Driver only)
 */
export const cancelSOSAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driverId = req.user!.id;

    const { data: alert, error } = await supabase
      .from('sos_alerts')
      .update({
        status: 'cancelled'
      })
      .eq('id', id)
      .eq('driver_id', driverId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: alert,
      message: 'SOS alert cancelled successfully'
    });
  } catch (error: any) {
    console.error('Cancel SOS alert error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOS_CANCEL_FAILED',
        message: error.message || 'Failed to cancel SOS alert'
      }
    });
  }
};
