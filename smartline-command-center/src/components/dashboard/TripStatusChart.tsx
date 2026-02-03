import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';

export function TripStatusChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchTripStatusData();
  }, []);

  async function fetchTripStatusData() {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select('status');

      if (trips) {
        const statusCounts: Record<string, number> = {
          completed: 0,
          active: 0,
          cancelled: 0,
        };

        trips.forEach(trip => {
          const status = trip.status?.toLowerCase() || 'active';
          if (status in statusCounts) {
            statusCounts[status]++;
          }
        });

        const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        const chartData = [
          { name: 'Completed', value: total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0, fill: '#22c55e' },
          { name: 'Active', value: total > 0 ? Math.round((statusCounts.active / total) * 100) : 0, fill: '#3b82f6' },
          { name: 'Cancelled', value: total > 0 ? Math.round((statusCounts.cancelled / total) * 100) : 0, fill: '#ef4444' },
        ];

        setData(chartData);
      }
    } catch (error) {
      console.error('Error fetching trip status data:', error);
    }
  }

  return (
    <div className="stat-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Trip Status</h3>
        <p className="text-sm text-muted-foreground">Distribution by status</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
