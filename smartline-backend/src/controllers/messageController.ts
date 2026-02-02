import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function assertParticipant(tripId: string, userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('customer_id, driver_id')
    .eq('id', tripId)
    .single();

  if (error || !data) {
    throw new Error('Trip not found');
  }

  if (data.customer_id !== userId && data.driver_id !== userId) {
    throw new Error('Not authorized');
  }
}

export const listMessages = async (req: Request, res: Response) => {
  try {
    const tripId = req.query.tripId as string | undefined;
    if (!tripId) return res.status(400).json({ error: 'tripId is required' });

    await assertParticipant(tripId, req.user!.id);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ messages: data || [] });
  } catch (err: any) {
    const status = err.message === 'Not authorized' ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { tripId, content } = req.body;
    if (!tripId || !content) {
      return res.status(400).json({ error: 'tripId and content are required' });
    }

    await assertParticipant(tripId, req.user!.id);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        trip_id: tripId,
        sender_id: req.user!.id,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: data });
  } catch (err: any) {
    const status = err.message === 'Not authorized' ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
};
