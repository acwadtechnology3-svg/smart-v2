import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Filter, MapPin, Clock, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Trip {
  id: string;
  pickup_address: string;
  dest_address: string;
  status: string;
  price: number;
  final_price: number | null;
  created_at: string;
  driver?: {
    id: string;
    full_name: string;
  };
  customer?: {
    id: string;
    full_name: string;
  };
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          pickup_address,
          dest_address,
          status,
          price,
          final_price,
          created_at,
          driver_id,
          customer_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch driver and customer names
      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map(t => t.driver_id).filter(Boolean))];
        const customerIds = [...new Set(data.map(t => t.customer_id).filter(Boolean))];

        let driversMap: Record<string, any> = {};
        let customersMap: Record<string, any> = {};

        if (driverIds.length > 0) {
          const { data: drivers } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', driverIds);
          drivers?.forEach(d => driversMap[d.id] = d);
        }

        if (customerIds.length > 0) {
          const { data: customers } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', customerIds);
          customers?.forEach(c => customersMap[c.id] = c);
        }

        const enrichedTrips = data.map(trip => ({
          ...trip,
          driver: trip.driver_id ? driversMap[trip.driver_id] : undefined,
          customer: trip.customer_id ? customersMap[trip.customer_id] : undefined,
        }));

        setTrips(enrichedTrips);
      } else {
        setTrips([]);
      }
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch trips',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.dest_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || trip.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: trips.length,
    active: trips.filter(t => ['requested', 'accepted', 'arrived', 'started'].includes(t.status)).length,
    completed: trips.filter(t => t.status === 'completed').length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'requested':
      case 'accepted':
      case 'arrived':
      case 'started':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout title="Trips Management">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search trips..." 
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter ? `Status: ${statusFilter}` : 'Filters'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('requested')}>
                  Requested
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('accepted')}>
                  Accepted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('started')}>
                  Started
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button onClick={fetchTrips} variant="outline">Refresh</Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Trips</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.active}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-semibold text-red-600">{stats.cancelled}</p>
          </div>
        </div>

        {/* Trips Table */}
        <div className="card-elevated overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              No trips found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fare</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id} className="table-row-hover">
                    <TableCell className="font-mono text-sm">{trip.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm truncate">{trip.pickup_address || 'N/A'}</p>
                        </div>
                        <div className="flex items-start gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm truncate">{trip.dest_address || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{trip.driver?.full_name || 'Unassigned'}</TableCell>
                    <TableCell>{trip.customer?.full_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(trip.status)}`}>
                        {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{(trip.final_price || trip.price).toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(trip.created_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          {trip.driver && <DropdownMenuItem>Contact Driver</DropdownMenuItem>}
                          {trip.customer && <DropdownMenuItem>Contact Customer</DropdownMenuItem>}
                          {['requested', 'accepted', 'arrived', 'started'].includes(trip.status) && (
                            <DropdownMenuItem className="text-destructive">Cancel Trip</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
