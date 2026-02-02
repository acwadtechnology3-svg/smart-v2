import { cn } from '@/lib/utils';

type Status = 'active' | 'pending' | 'inactive' | 'rejected' | 'approved' | 'banned' | 'completed' | 'cancelled' | 'open' | 'in-progress' | 'resolved' | 'closed' | 'expired';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  active: 'bg-success/10 text-success border-success/20',
  approved: 'bg-success/10 text-success border-success/20',
  completed: 'bg-success/10 text-success border-success/20',
  resolved: 'bg-success/10 text-success border-success/20',
  closed: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  open: 'bg-primary/10 text-primary border-primary/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  banned: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<Status, string> = {
  active: 'Active',
  approved: 'Approved',
  completed: 'Completed',
  resolved: 'Resolved',
  closed: 'Closed',
  pending: 'Pending',
  'in-progress': 'In Progress',
  open: 'Open',
  inactive: 'Inactive',
  expired: 'Expired',
  rejected: 'Rejected',
  banned: 'Banned',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
