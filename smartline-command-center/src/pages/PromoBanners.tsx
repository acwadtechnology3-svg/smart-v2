import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Trash2, Eye, Edit, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  action_type: 'link' | 'screen' | 'refer';
  action_value?: string;
  target_role: 'all' | 'customer' | 'driver';
  display_order: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}

const SCREEN_OPTIONS = [
  { value: 'InviteFriends', label: 'Invite Friends' },
  { value: 'Wallet', label: 'Wallet' },
  { value: 'Support', label: 'Support' },
  { value: 'Profile', label: 'Profile' },
];

export default function PromoBanners() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    action_type: 'link' as const,
    action_value: '',
    target_role: 'all' as const,
    display_order: 0,
    is_active: true,
    starts_at: '',
    ends_at: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch banners',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      subtitle: '',
      action_type: 'link',
      action_value: '',
      target_role: 'all',
      display_order: 0,
      is_active: true,
      starts_at: '',
      ends_at: '',
    });
    setImageFile(null);
    setImagePreview('');
    setEditingBanner(null);
  }

  function openDialog(banner?: PromoBanner) {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        subtitle: banner.subtitle || '',
        action_type: banner.action_type,
        action_value: banner.action_value || '',
        target_role: banner.target_role,
        display_order: banner.display_order,
        is_active: banner.is_active,
        starts_at: banner.starts_at ? new Date(banner.starts_at).toISOString().slice(0, 16) : '',
        ends_at: banner.ends_at ? new Date(banner.ends_at).toISOString().slice(0, 16) : '',
      });
      setImagePreview(banner.image_url || '');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title',
        variant: 'destructive',
      });
      return;
    }

    if (formData.action_type === 'link' && !formData.action_value.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL for link banners',
        variant: 'destructive',
      });
      return;
    }

    if (formData.action_type === 'screen' && !formData.action_value.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a screen for screen banners',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      let imageUrl = editingBanner?.image_url;

      if (imageFile) {
        const fileName = `banner-${Date.now()}-${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('app-assets')
          .upload(`banners/${fileName}`, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('app-assets')
          .getPublicUrl(`banners/${fileName}`);

        imageUrl = urlData.publicUrl;
      }

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        image_url: imageUrl || null,
        action_type: formData.action_type,
        action_value: formData.action_value || null,
        target_role: formData.target_role,
        display_order: formData.display_order,
        is_active: formData.is_active,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('promo_banners')
          .update(payload)
          .eq('id', editingBanner.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Banner updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('promo_banners')
          .insert(payload);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Banner created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBanners();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save banner',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Banner deleted successfully',
      });

      fetchBanners();
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete banner',
        variant: 'destructive',
      });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Promo Banners</h1>
            <p className="text-muted-foreground">
              Manage promotional banners shown in the customer and driver apps
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Banner
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      {banner.image_url ? (
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="h-12 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{banner.title}</div>
                        {banner.subtitle && (
                          <div className="text-sm text-muted-foreground">{banner.subtitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{banner.action_type}</Badge>
                        {banner.action_value && (
                          <div className="text-xs text-muted-foreground truncate max-w-32">
                            {banner.action_value}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={banner.target_role === 'all' ? 'default' : 'secondary'}>
                        {banner.target_role}
                      </Badge>
                    </TableCell>
                    <TableCell>{banner.display_order}</TableCell>
                    <TableCell>
                      <Badge variant={banner.is_active ? 'default' : 'secondary'}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(banner.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(banner)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
              </DialogTitle>
              <DialogDescription>
                Configure the banner content and behavior
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Banner title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Optional subtitle"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-16 w-24 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Action Type *</Label>
                  <Select
                    value={formData.action_type}
                    onValueChange={(value: 'link' | 'screen' | 'refer') =>
                      setFormData({ ...formData, action_type: value, action_value: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Open External Link</SelectItem>
                      <SelectItem value="screen">Navigate to App Screen</SelectItem>
                      <SelectItem value="refer">Go to Referral Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <Select
                    value={formData.target_role}
                    onValueChange={(value: 'all' | 'customer' | 'driver') =>
                      setFormData({ ...formData, target_role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customer">Customers Only</SelectItem>
                      <SelectItem value="driver">Drivers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.action_type === 'link' && (
                <div className="space-y-2">
                  <Label htmlFor="action_value">URL *</Label>
                  <Input
                    id="action_value"
                    value={formData.action_value}
                    onChange={(e) => setFormData({ ...formData, action_value: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              {formData.action_type === 'screen' && (
                <div className="space-y-2">
                  <Label>Screen *</Label>
                  <Select
                    value={formData.action_value}
                    onValueChange={(value) => setFormData({ ...formData, action_value: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a screen" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Start Date</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">End Date</Label>
                  <Input
                    id="ends_at"
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingBanner ? 'Update' : 'Create'} Banner
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
