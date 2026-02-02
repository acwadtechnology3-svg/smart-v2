import { Users, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dashboardStats } from '@/data/mockData';

export function QuickStats() {
  const stats = [
    {
      label: 'Drivers Online',
      value: dashboardStats.onlineDrivers,
      icon: Users,
      className: 'text-success',
    },
    {
      label: 'Pending Approvals',
      value: dashboardStats.pendingApprovals,
      icon: Clock,
      className: 'text-warning',
    },
    {
      label: 'Open Tickets',
      value: dashboardStats.openTickets,
      icon: AlertCircle,
      className: 'text-destructive',
    },
    {
      label: 'Completion Rate',
      value: `${dashboardStats.completionRate}%`,
      icon: CheckCircle2,
      className: 'text-primary',
    },
  ];

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
