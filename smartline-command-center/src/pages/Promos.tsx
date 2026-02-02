import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Search, Plus, MoreHorizontal, Filter, Percent, DollarSign, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  discount_max: number; // Max discount amount
  valid_from: string;
  valid_until: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
}

export default function Promos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Promo Form State
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_percent: 20,
    max_uses: 100,
    days_valid: 30
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('valid_from', { ascending: false });

      if (error) throw error;
      setPromos(data || []);
    } catch (error) {
      console.error('Error fetching promos:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code) {
      toast.error("Code is required");
      return;
    }

    setIsCreating(true);
    try {
      // Calculate dates
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + newPromo.days_valid);

      const { data, error } = await supabase
        .from('promo_codes')
        .insert({
          code: newPromo.code.toUpperCase(),
          discount_percent: newPromo.discount_percent,
          max_uses: newPromo.max_uses,
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Promo code created!");
      setPromos([data, ...promos]);
      setOpenCreate(false);
      setNewPromo({ code: '', discount_percent: 20, max_uses: 100, days_valid: 30 }); // Reset

    } catch (error: any) {
      console.error("Create Promo Error:", error);
      toast.error(error.message || "Failed to create promo");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete promo");
    } else {
      toast.success("Promo deleted");
      setPromos(promos.filter(p => p.id !== id));
    }
  };

  return (
    <DashboardLayout title="Promo Codes">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search promo codes..." className="pl-9 w-64" />
            </div>
          </div>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Promo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Promo Code</DialogTitle>
                <DialogDescription>Generates a code users can apply for discount.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">Code</Label>
                  <Input
                    id="code"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                    className="col-span-3 uppercase"
                    placeholder="e.g. SUMMER20"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount" className="text-right">Discount %</Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="discount"
                      type="number"
                      value={newPromo.discount_percent}
                      onChange={(e) => setNewPromo({ ...newPromo, discount_percent: parseInt(e.target.value) })}
                    />
                    <Percent className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="uses" className="text-right">Max Uses</Label>
                  <Input
                    id="uses"
                    type="number"
                    value={newPromo.max_uses}
                    onChange={(e) => setNewPromo({ ...newPromo, max_uses: parseInt(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="days" className="text-right">Duration (Days)</Label>
                  <Input
                    id="days"
                    type="number"
                    value={newPromo.days_valid}
                    onChange={(e) => setNewPromo({ ...newPromo, days_valid: parseInt(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreatePromo} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Promo Codes Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : promos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">No promo codes found.</TableCell>
                </TableRow>
              ) : promos.map((promo) => {
                const usagePercent = Math.min((promo.current_uses / promo.max_uses) * 100, 100);
                const isExpired = new Date(promo.valid_until) < new Date();
                const status = !promo.is_active ? 'inactive' : isExpired ? 'expired' : 'active';

                return (
                  <TableRow key={promo.id} className="table-row-hover">
                    <TableCell>
                      <span className="font-mono font-medium bg-secondary px-2 py-1 rounded">
                        {promo.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-medium text-green-600">
                        {promo.discount_percent}% OFF
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 w-32">
                        <div className="flex justify-between text-sm">
                          <span>{promo.current_uses}</span>
                          <span className="text-muted-foreground">/ {promo.max_uses}</span>
                        </div>
                        <Progress value={usagePercent} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(promo.valid_until), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(promo.id)}>Delete</DropdownMenuItem>
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
