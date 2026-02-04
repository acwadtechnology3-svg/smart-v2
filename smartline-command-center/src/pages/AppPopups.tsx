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
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface AppPopup {
  id: string;
  title: string;
  image_url: string;
  target_role: string;
  is_active: boolean;
  created_at: string;
}

export default function AppPopups() {
  const [popups, setPopups] = useState<AppPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    targetRole: 'all',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPopups();
  }, []);

  async function fetchPopups() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_popups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPopups(data || []);
    } catch (error: any) {
      console.error('Error fetching popups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch popups',
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

  async function handleCreatePopup() {
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title',
        variant: 'destructive',
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: 'Error',
        description: 'Please select an image',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload image to Supabase storage
      const fileName = `popup-${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(`popups/${fileName}`, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('app-assets')
        .getPublicUrl(`popups/${fileName}`);

      // Create popup record
      const { error: dbError } = await supabase
        .from('app_popups')
        .insert({
          title: formData.title,
          image_url: urlData.publicUrl,
          target_role: formData.targetRole,
          is_active: true,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Popup created successfully',
      });

      // Reset form and refresh
      setFormData({ title: '', targetRole: 'all' });
      setImageFile(null);
      setImagePreview('');
      setIsDialogOpen(false);
      fetchPopups();
    } catch (error: any) {
      console.error('Error creating popup:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create popup',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePopup(id: string, imageUrl: string) {
    if (!confirm('Are you sure you want to delete this popup?')) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(-2).join('/');

      // Delete from storage
      await supabase.storage.from('app-assets').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('app_popups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Popup deleted successfully',
      });

      fetchPopups();
    } catch (error: any) {
      console.error('Error deleting popup:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete popup',
        variant: 'destructive',
      });
    }
  }

  async function togglePopupStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('app_popups')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Popup ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      fetchPopups();
    } catch (error: any) {
      console.error('Error updating popup:', error);
      toast({
        title: 'Error',
        description: 'Failed to update popup',
        variant: 'destructive',
      });
    }
  }

  return (
    <DashboardLayout title="App Popups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">App Popups</h2>
            <p className="text-muted-foreground">Manage promotional popups for app users</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Create Popup
          </Button>
        </div>

        {/* Popups Table */}
        <div className="card-elevated overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : popups.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              No popups created yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Target Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popups.map((popup) => (
                  <TableRow key={popup.id} className="table-row-hover">
                    <TableCell>
                      <img
                        src={popup.image_url}
                        alt={popup.title}
                        className="h-12 w-12 rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{popup.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {popup.target_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={popup.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => togglePopupStatus(popup.id, popup.is_active)}
                      >
                        {popup.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(popup.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(popup.image_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePopup(popup.id, popup.image_url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create Popup Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Popup</DialogTitle>
            <DialogDescription>Appears on app launch for users.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g. Welcome Offer"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium">Image</label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      disabled={isSubmitting}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload image</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isSubmitting}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Target Role */}
            <div>
              <label className="text-sm font-medium">Target Role</label>
              <Select
                value={formData.targetRole}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetRole: value })
                }
                disabled={isSubmitting}
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

            {/* Submit Button */}
            <Button
              onClick={handleCreatePopup}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Popup'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
