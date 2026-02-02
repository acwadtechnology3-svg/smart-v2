import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { trips } from '@/data/mockData';
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
import { Search, MoreHorizontal, Filter, MapPin, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Trips() {
  return (
    <DashboardLayout title="Trips Management">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search trips..." className="pl-9 w-64" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Trips</p>
            <p className="text-2xl font-semibold">{trips.length}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-primary">
              {trips.filter((t) => t.status === 'active').length}
            </p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold text-success">
              {trips.filter((t) => t.status === 'completed').length}
            </p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-semibold text-destructive">
              {trips.filter((t) => t.status === 'cancelled').length}
            </p>
          </div>
        </div>

        {/* Trips Table */}
        <div className="card-elevated overflow-hidden">
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
              {trips.map((trip) => (
                <TableRow key={trip.id} className="table-row-hover">
                  <TableCell className="font-mono text-sm">{trip.id}</TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <p className="text-sm truncate">{trip.pickupLocation}</p>
                      </div>
                      <div className="flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-sm truncate">{trip.dropoffLocation}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{trip.driverName}</TableCell>
                  <TableCell>{trip.customerName}</TableCell>
                  <TableCell>
                    <StatusBadge status={trip.status} />
                  </TableCell>
                  <TableCell>
                    {trip.fare > 0 ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{trip.fare.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(trip.startTime), 'HH:mm')}
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
                        <DropdownMenuItem>Contact Driver</DropdownMenuItem>
                        <DropdownMenuItem>Contact Customer</DropdownMenuItem>
                        {trip.status === 'active' && (
                          <DropdownMenuItem className="text-destructive">Cancel Trip</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
