import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Filter, Loader2, MoreHorizontal, Search, Star } from 'lucide-react';

type DriverStatus = 'pending' | 'approved' | 'rejected' | 'banned';

interface DriverRow {
  id: string;
  national_id: string | null;
  city: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  status: DriverStatus | null;
  profile_photo_url: string | null;
  created_at: string;
  is_online: boolean | null;
  last_location_update: string | null;
  rating: number | null;
  users?: {
    full_name: string | null;
    phone: string;
    email: string | null;
  } | null;
}

export default function Drivers() {
  const [search, setSearch] = useState('');
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const driversQuery = useQuery({
    queryKey: ['drivers'],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const startedAt = performance.now();
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          national_id,
          city,
          vehicle_type,
          vehicle_model,
          vehicle_plate,
          status,
          profile_photo_url,
          created_at,
          is_online,
          last_location_update,
          rating,
          users:id (
            full_name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      setLastLatencyMs(Math.round(performance.now() - startedAt));

      if (error) {
        toast.error('Failed to load drivers');
        throw error;
      }

      return (data ?? []) as DriverRow[];
    },
  });

  const filteredDrivers = useMemo(() => {
    const rows = driversQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((d) => {
      const haystack = [
        d.users?.full_name ?? '',
        d.users?.phone ?? '',
        d.users?.email ?? '',
        d.city ?? '',
        d.vehicle_type ?? '',
        d.vehicle_model ?? '',
        d.vehicle_plate ?? '',
        d.status ?? '',
        d.national_id ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [driversQuery.data, search]);

  const stats = useMemo(() => {
    const rows = driversQuery.data ?? [];
    const countBy = (s: DriverStatus) => rows.filter((d) => d.status === s).length;

    return {
      total: rows.length,
      approved: countBy('approved'),
      pending: countBy('pending'),
      banned: countBy('banned'),
    };
  }, [driversQuery.data]);

  const updatedAt = driversQuery.dataUpdatedAt ? new Date(driversQuery.dataUpdatedAt) : null;
  const cacheAgeSeconds = driversQuery.dataUpdatedAt
    ? Math.max(0, Math.round((Date.now() - driversQuery.dataUpdatedAt) / 1000))
    : null;

  return (
    <DashboardLayout title="Drivers Management">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                className="pl-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => driversQuery.refetch()}
            disabled={driversQuery.isFetching}
          >
            {driversQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        <div className="card-elevated p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Latency:</span>
              <span className="font-medium">{lastLatencyMs === null ? '—' : `${lastLatencyMs} ms`}</span>

              <span className="text-muted-foreground ml-4">Cache:</span>
              <span className="font-medium">
                {driversQuery.isFetching
                  ? 'Refreshing'
                  : driversQuery.isStale
                    ? 'Stale'
                    : 'Fresh'}
              </span>

              <span className="text-muted-foreground ml-4">Age:</span>
              <span className="font-medium">{cacheAgeSeconds === null ? '—' : `${cacheAgeSeconds}s`}</span>
            </div>

            <div className="text-sm text-muted-foreground">
              Updated: {updatedAt ? updatedAt.toLocaleString() : '—'}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Drivers</p>
            <p className="text-2xl font-semibold">{driversQuery.isLoading ? '…' : stats.total}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-semibold text-success">{driversQuery.isLoading ? '…' : stats.approved}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-semibold text-warning">{driversQuery.isLoading ? '…' : stats.pending}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Banned</p>
            <p className="text-2xl font-semibold text-destructive">{driversQuery.isLoading ? '…' : stats.banned}</p>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Driver</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Online</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driversQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading drivers...
                    </div>
                  </TableCell>
                </TableRow>
              ) : driversQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Failed to load drivers.
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => {
                  const name = driver.users?.full_name ?? 'Unnamed Driver';
                  const initials = name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]!.toUpperCase())
                    .join('');

                  const vehicleLabel = [driver.vehicle_model, driver.vehicle_type].filter(Boolean).join(' • ');
                  const status = (driver.status ?? 'pending') as any;

                  return (
                    <TableRow key={driver.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={driver.profile_photo_url ?? undefined} />
                            <AvatarFallback>{initials || 'DR'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-sm text-muted-foreground">{driver.users?.email ?? '—'}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{driver.users?.phone ?? '—'}</TableCell>

                      <TableCell>
                        <div>
                          <p className="text-sm">{vehicleLabel || '—'}</p>
                          <p className="text-xs text-muted-foreground">{driver.vehicle_plate ?? '—'}</p>
                        </div>
                      </TableCell>

                      <TableCell>{driver.city ?? '—'}</TableCell>

                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>

                      <TableCell>
                        {driver.rating && Number(driver.rating) > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span>{Number(driver.rating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {driver.is_online ? (
                          <span className="text-success font-medium">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
