import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { transactions } from '@/data/mockData';
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
import { Search, Filter, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const transactionIcons = {
  trip_payment: { icon: ArrowUpRight, className: 'text-success bg-success/10' },
  wallet_topup: { icon: ArrowDownLeft, className: 'text-primary bg-primary/10' },
  refund: { icon: RefreshCw, className: 'text-warning bg-warning/10' },
  driver_payout: { icon: CreditCard, className: 'text-destructive bg-destructive/10' },
};

const transactionLabels = {
  trip_payment: 'Trip Payment',
  wallet_topup: 'Wallet Top-up',
  refund: 'Refund',
  driver_payout: 'Driver Payout',
};

export default function Wallet() {
  return (
    <DashboardLayout title="Wallet & Payments">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search transactions..." className="pl-9 w-64" />
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
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold text-success">$58,205</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Pending Payouts</p>
            <p className="text-2xl font-semibold text-warning">$12,450</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Today's Revenue</p>
            <p className="text-2xl font-semibold">$2,340</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Refunds (MTD)</p>
            <p className="text-2xl font-semibold text-destructive">$890</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card-elevated overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Transactions</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Transaction ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => {
                const { icon: Icon, className } = transactionIcons[txn.type];
                const isIncoming = txn.type === 'trip_payment' || txn.type === 'wallet_topup';
                return (
                  <TableRow key={txn.id} className="table-row-hover">
                    <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-lg', className)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{transactionLabels[txn.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell>{txn.userName}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'font-medium',
                        isIncoming ? 'text-success' : 'text-foreground'
                      )}>
                        {isIncoming ? '+' : '-'}${txn.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                        txn.status === 'completed' && 'bg-success/10 text-success border-success/20',
                        txn.status === 'pending' && 'bg-warning/10 text-warning border-warning/20',
                        txn.status === 'failed' && 'bg-destructive/10 text-destructive border-destructive/20'
                      )}>
                        {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(txn.createdAt), 'MMM dd, HH:mm')}
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
