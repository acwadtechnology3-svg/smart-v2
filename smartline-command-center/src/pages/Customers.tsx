import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { customers } from '@/data/mockData';
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
import { Search, MoreHorizontal, Filter, Wallet } from 'lucide-react';

export default function Customers() {
  return (
    <DashboardLayout title="Customers">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search customers..." className="pl-9 w-64" />
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
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-semibold">{customers.length}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-success">
              {customers.filter((c) => c.status === 'active').length}
            </p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Trips</p>
            <p className="text-2xl font-semibold">
              {customers.reduce((acc, c) => acc + c.totalTrips, 0)}
            </p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">
              ${customers.reduce((acc, c) => acc + c.totalSpent, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Trips</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="table-row-hover">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={customer.avatar} />
                        <AvatarFallback>{customer.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    <StatusBadge status={customer.status} />
                  </TableCell>
                  <TableCell>{customer.totalTrips}</TableCell>
                  <TableCell>${customer.totalSpent.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span>${customer.walletBalance.toFixed(2)}</span>
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
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>View Trips</DropdownMenuItem>
                        <DropdownMenuItem>Adjust Wallet</DropdownMenuItem>
                        {customer.status === 'active' && (
                          <DropdownMenuItem className="text-destructive">Suspend Account</DropdownMenuItem>
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
