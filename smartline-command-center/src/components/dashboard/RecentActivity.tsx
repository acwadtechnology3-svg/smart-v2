import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, UserPlus, MessageSquare, Ticket, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    // Fetch recent pending drivers as "activity"
    const { data } = await supabase
      .from('drivers')
      .select('*, users!drivers_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      // Map drivers to generic activity format
      const mapped = data.map(d => ({
        id: d.id,
        type: d.status === 'pending' ? 'driver_pending' : 'driver_approved',
        message: `${d.users?.full_name || 'Driver'} registered as a new driver`,
        time: d.created_at
      }));
      setActivities(mapped);
    }
  };

  return (
    <div className="stat-card bg-white p-6 rounded-xl border shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest platform events</p>
      </div>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg', 'bg-blue-50 text-blue-600')}>
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{activity.message}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.time), { addSuffix: true })}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
