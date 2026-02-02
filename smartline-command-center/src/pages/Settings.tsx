import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building, Bell, Shield, CreditCard, Globe, Banknote, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  service_tier: string;
  base_fare: number;
  per_km_rate: number;
  per_min_rate: number;
  minimum_trip_price: number;
  platform_fee_percent: number;
}

export default function Settings() {
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .order('service_tier');

      if (error) throw error;
      setPricing(data || []);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load pricing settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (index: number, field: keyof PricingTier, value: string) => {
    const newPricing = [...pricing];
    (newPricing[index] as any)[field] = parseFloat(value) || 0;
    setPricing(newPricing);
  };

  const savePricing = async (tier: PricingTier) => {
    try {
      const { error } = await supabase
        .from('pricing_settings')
        .update({
          base_fare: tier.base_fare,
          per_km_rate: tier.per_km_rate,
          per_min_rate: tier.per_min_rate,
          minimum_trip_price: tier.minimum_trip_price,
          platform_fee_percent: tier.platform_fee_percent
        })
        .eq('id', tier.id);

      if (error) throw error;
      toast.success(`${tier.service_tier.toUpperCase()} pricing updated!`);
    } catch (error) {
      toast.error('Failed to update pricing');
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 animate-fade-in max-w-4xl">

        {/* PRICING CONFIGURATION (New Section) */}
        <div className="stat-card border-blue-100 bg-blue-50/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-600/10">
              <Banknote className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Trip Pricing & Fees</h3>
              <p className="text-sm text-blue-600/80">Control fares per kilometer, minute, and driver platform fees.</p>
            </div>
          </div>

          <div className="grid gap-6">
            {loading ? (
              <p className="text-center text-gray-500 py-4">Loading pricing configuration...</p>
            ) : pricing.map((tier, index) => (
              <div key={tier.id} className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="font-bold text-lg capitalize flex items-center gap-2">
                    {tier.service_tier} Tier
                    {tier.service_tier === 'saver' && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-normal">Standard Car</span>}
                  </h4>
                  <Button size="sm" onClick={() => savePricing(tier)} className="gap-2">
                    <Save size={14} /> Save
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Base Fare (Start)</Label>
                    <Input
                      type="number"
                      value={tier.base_fare}
                      onChange={(e) => handlePriceChange(index, 'base_fare', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Price per KM</Label>
                    <Input
                      type="number"
                      value={tier.per_km_rate}
                      onChange={(e) => handlePriceChange(index, 'per_km_rate', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Price per Min</Label>
                    <Input
                      type="number"
                      value={tier.per_min_rate}
                      onChange={(e) => handlePriceChange(index, 'per_min_rate', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Min Trip Price</Label>
                    <Input
                      type="number"
                      value={tier.minimum_trip_price}
                      onChange={(e) => handlePriceChange(index, 'minimum_trip_price', e.target.value)}
                      className="h-9 bg-yellow-50 border-yellow-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-blue-600 font-semibold">Platform Fee %</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={tier.platform_fee_percent}
                        onChange={(e) => handlePriceChange(index, 'platform_fee_percent', e.target.value)}
                        className="h-9 pr-6 bg-blue-50 border-blue-100 text-blue-900 font-semibold"
                      />
                      <span className="absolute right-2 top-2.5 text-xs text-blue-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Company Settings */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Company Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your company information</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" defaultValue="SmartLine Inc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Support Email</Label>
                <Input id="company-email" type="email" defaultValue="support@smartline.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Support Phone</Label>
              <Input id="company-phone" defaultValue="+1 (555) 123-4567" />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Configure notification preferences</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Driver Applications</p>
                <p className="text-sm text-muted-foreground">Get notified when a new driver applies</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Support Ticket Escalations</p>
                <p className="text-sm text-muted-foreground">Get notified when tickets are marked urgent</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Summary Report</p>
                <p className="text-sm text-muted-foreground">Receive daily performance summary via email</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Regional Settings</h3>
              <p className="text-sm text-muted-foreground">Configure regional preferences</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select defaultValue="america-new-york">
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="america-new-york">America/New York (EST)</SelectItem>
                  <SelectItem value="america-los-angeles">America/Los Angeles (PST)</SelectItem>
                  <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                  <SelectItem value="asia-tokyo">Asia/Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select defaultValue="usd">
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="jpy">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">Manage security settings</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline">Enable 2FA</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-muted-foreground">Automatically logout after inactivity</p>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Billing Settings */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Billing</h3>
              <p className="text-sm text-muted-foreground">Manage billing and payment settings</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <p className="font-medium">Current Plan: Enterprise</p>
                <p className="text-sm text-muted-foreground">Unlimited drivers, trips, and support</p>
              </div>
              <Button variant="outline">Manage Plan</Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="px-8">Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
