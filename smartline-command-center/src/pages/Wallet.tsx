import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  trip_id?: string;
  created_at: string;
  description?: string;
  status: string;
  user?: {
    full_name: string;
  };
}

interface WithdrawalRequest {
  id: string;
  driver_id: string;
  amount: number;
  method: string;
  account_number: string;
  status: string;
  admin_note?: string;
  created_at: string;
  driver?: {
    full_name: string;
  };
}

const transactionIcons = {
  payment: { icon: ArrowUpRight, className: 'text-success bg-success/10' },
  deposit: { icon: ArrowDownLeft, className: 'text-primary bg-primary/10' },
  refund: { icon: RefreshCw, className: 'text-warning bg-warning/10' },
  withdrawal: { icon: CreditCard, className: 'text-destructive bg-destructive/10' },
  commission: { icon: CreditCard, className: 'text-orange-600 bg-orange-100' },
  trip_earnings: { icon: ArrowUpRight, className: 'text-green-600 bg-green-100' },
};

export default function Wallet() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch wallet transactions
      const { data: txnData, error: txnError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (txnError) throw txnError;

      // Fetch user details for transactions
      if (txnData && txnData.length > 0) {
        const userIds = [...new Set(txnData.map(t => t.user_id))];
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        const usersMap: Record<string, any> = {};
        users?.forEach(u => usersMap[u.id] = u);

        const enrichedTxns = txnData.map(txn => ({
          ...txn,
          user: txn.user_id ? usersMap[txn.user_id] : undefined,
        }));
        setTransactions(enrichedTxns);
      }

      // Fetch withdrawal requests
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (withdrawalError) throw withdrawalError;

      // Fetch driver details for withdrawals
      if (withdrawalData && withdrawalData.length > 0) {
        const driverIds = [...new Set(withdrawalData.map(w => w.driver_id))];
        const { data: drivers } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', driverIds);

        const driversMap: Record<string, any> = {};
        drivers?.forEach(d => driversMap[d.id] = d);

        const enrichedWithdrawals = withdrawalData.map(w => ({
          ...w,
          driver: w.driver_id ? driversMap[w.driver_id] : undefined,
        }));
        setWithdrawals(enrichedWithdrawals);
      }
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch wallet data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = transactions.filter(txn =>
    txn.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalRevenue: transactions
      .filter(t => ['payment', 'trip_earnings', 'commission'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0),
    pendingPayouts: withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + Number(w.amount), 0),
    totalRefunds: transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + Number(t.amount), 0),
  };

  return (
    <DashboardLayout title="Wallet & Payments">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={fetchData} variant="outline">Refresh</Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold text-success">${stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Pending Payouts</p>
            <p className="text-2xl font-semibold text-warning">${stats.pendingPayouts.toFixed(2)}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-semibold">{transactions.length}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Refunds</p>
            <p className="text-2xl font-semibold text-destructive">${stats.totalRefunds.toFixed(2)}</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card-elevated overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Transactions</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              No transactions found
            </div>
          ) : (
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
                {filteredTransactions.map((txn) => {
                  const iconConfig = transactionIcons[txn.type] || transactionIcons.payment;
                  const { icon: Icon, className } = iconConfig;
                  const isIncoming = ['payment', 'deposit', 'trip_earnings', 'commission'].includes(txn.type);

                  return (
                    <TableRow key={txn.id} className="table-row-hover">
                      <TableCell className="font-mono text-sm">{txn.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded-lg', className)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm capitalize">{txn.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{txn.user?.full_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          isIncoming ? 'text-success' : 'text-foreground'
                        )}>
                          {isIncoming ? '+' : '-'}${Number(txn.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.status === 'completed' ? 'default' :
                            txn.status === 'pending' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(txn.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Withdrawal Requests Table */}
        <div className="card-elevated overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Withdrawal Requests</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              No withdrawal requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Request ID</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id} className="table-row-hover">
                    <TableCell className="font-mono text-sm">{withdrawal.id.slice(0, 8)}</TableCell>
                    <TableCell>{withdrawal.driver?.full_name || 'Unknown'}</TableCell>
                    <TableCell className="font-medium">${Number(withdrawal.amount).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{withdrawal.method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          withdrawal.status === 'approved' ? 'default' :
                          withdrawal.status === 'pending' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(withdrawal.created_at), 'MMM dd, HH:mm')}
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
