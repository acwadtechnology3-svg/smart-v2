import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, subtext, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {(change !== undefined || subtext) && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive && 'text-success',
              isNegative && 'text-destructive',
              typeof change === 'string' && 'text-muted-foreground'
            )}>
              {typeof change === 'number' && isPositive && <TrendingUp className="h-4 w-4" />}
              {typeof change === 'number' && isNegative && <TrendingDown className="h-4 w-4" />}

              <span>
                {typeof change === 'number' ? (
                  <>{isPositive ? '+' : ''}{change}%</>
                ) : (
                  change
                )}
              </span>
              {subtext && <span className="text-muted-foreground font-normal ml-1">{subtext}</span>}
            </div>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl bg-secondary transition-colors duration-200 group-hover:bg-accent',
          iconColor
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
