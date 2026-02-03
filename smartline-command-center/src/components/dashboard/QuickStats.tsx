import { useEffect, useState } from 'react';
import { Users, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function QuickStats() {
  const [stats, setStats] = useState([
    { label: 'Drivers Online', value: 0, icon: Users, className: 'text-success' },
    { label: 'Pending Approvals', value: 0, icon: Clock, className: 'text-warning' },
    { label: 'Open Tickets', value: 0, icon: AlertCircle, className: 'text-destructive' },
    { label: 'Completion Rate', value: '0%', icon: CheckCircle2, className: 'text-primary' },
  ]);

  useEffect(() => {
    fetchQuickStats();
  }, []);

  async function fetchQuickStats() {
    try {
      // Drivers Online (approved drivers)
      const { count: onlineCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver')
        .eq('status', 'approved');

      // Pending Approvals
      const { count: pendingCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver')
        .eq('status', 'pending');

      // Open Tickets (support requests with pending status)
      const { count: ticketCount } = await supabase
        .from('support_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Completion Rate
      const { data: trips } = await supabase
        .from('trips')
        .select('status');

      let completionRate = 0;
      if (trips && trips.length > 0) {
        const completed = trips.filter(t => t.status === 'completed').length;
        completionRate = Math.round((completed / trips.length) * 100);
      }

      setStats([
        { label: 'Drivers Online', value: onlineCount || 0, icon: Users, className: 'text-success' },
        { label: 'Pending Approvals', value: pendingCount || 0, icon: Clock, className: 'text-warning' },
        { label: 'Open Tickets', value: ticketCount || 0, icon: AlertCircle, className: 'text-destructive' },
        { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, className: 'text-primary' },
      ]);
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  }

  return (
    <div className="stat-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Stats</h3>
        <p className="text-sm text-muted-foreground">Real-time metrics</p>
      </div>
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.className}`} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
