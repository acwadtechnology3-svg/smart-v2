import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TripStatusChart } from '@/components/dashboard/TripStatusChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { MapPin, Car, DollarSign, Users, UserPlus } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeDrivers: 0,
    pendingDrivers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Optional: Subscribe to changes if you want real-time
    const driverSubscription = supabase
      .channel('public:drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(driverSubscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Total Pending Drivers
      const { count: pendingCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 2. Total Approved Drivers
      const { count: approvedCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // 3. Total Customers (Users with role 'customer')
      const { count: customerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      // 4. Total Trips
      const { count: tripCount, data: tripData } = await supabase
        .from('trips')
        .select('price', { count: 'exact' });

      const revenue = tripData?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0;

      setStats({
        totalTrips: tripCount || 0,
        activeDrivers: approvedCount || 0,
        pendingDrivers: pendingCount || 0,
        activeCustomers: customerCount || 0,
        totalRevenue: revenue
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Requests"
            value={loading ? "..." : stats.pendingDrivers.toLocaleString()}
            change={stats.pendingDrivers > 0 ? `+${stats.pendingDrivers} New` : "Caught up"}
            icon={UserPlus}
            iconColor="text-orange-500"
          />
          <StatCard
            title="Active Drivers"
            value={loading ? "..." : stats.activeDrivers.toLocaleString()}
            // change="+5%" // Mock trend for now
            subtext="online"
            icon={Car}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Total Revenue"
            value={loading ? "..." : `EGP ${stats.totalRevenue.toLocaleString()}`}
            // change="+12.5%"
            subtext="lifetime"
            icon={DollarSign}
            iconColor="text-green-500"
          />
          <StatCard
            title="Total Customers"
            value={loading ? "..." : stats.activeCustomers.toLocaleString()}
            // change="+8%" 
            subtext="registered"
            icon={Users}
            iconColor="text-purple-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <TripStatusChart />
        </div>

        {/* Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentActivity />
          <QuickStats />
        </div>
      </div>
    </DashboardLayout>
  );
}
