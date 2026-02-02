import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supportTickets } from '@/data/mockData';
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
import { Search, MoreHorizontal, Filter, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const priorityConfig = {
  urgent: { icon: AlertCircle, className: 'text-destructive', label: 'Urgent' },
  high: { icon: AlertTriangle, className: 'text-warning', label: 'High' },
  medium: { icon: Info, className: 'text-primary', label: 'Medium' },
  low: { icon: Info, className: 'text-muted-foreground', label: 'Low' },
};

export default function Support() {
  return (
    <DashboardLayout title="Support & Issues">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tickets..." className="pl-9 w-64" />
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
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-2xl font-semibold">{supportTickets.length}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-2xl font-semibold text-primary">
              {supportTickets.filter((t) => t.status === 'open').length}
            </p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-semibold text-warning">
              {supportTickets.filter((t) => t.status === 'in-progress').length}
            </p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Urgent</p>
            <p className="text-2xl font-semibold text-destructive">
              {supportTickets.filter((t) => t.priority === 'urgent').length}
            </p>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Ticket ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supportTickets.map((ticket) => {
                const { icon: PriorityIcon, className, label } = priorityConfig[ticket.priority];
                return (
                  <TableRow key={ticket.id} className="table-row-hover">
                    <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        <p className="font-medium truncate">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{ticket.customerName}</TableCell>
                    <TableCell>
                      <div className={cn('flex items-center gap-1.5', className)}>
                        <PriorityIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
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
                          <DropdownMenuItem>Assign to Me</DropdownMenuItem>
                          <DropdownMenuItem>Change Priority</DropdownMenuItem>
                          <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Close Ticket</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
