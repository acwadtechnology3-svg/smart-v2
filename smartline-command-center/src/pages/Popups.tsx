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
import { Search, Plus, MoreHorizontal, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Popup {
    id: string;
    title: string;
    image_url: string;
    target_role: 'all' | 'customer' | 'driver';
    is_active: boolean;
    created_at: string;
}

export default function Popups() {
    const [popups, setPopups] = useState<Popup[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCreate, setOpenCreate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // New Popup Form State
    const [newPopup, setNewPopup] = useState({
        title: '',
        image_url: '',
        target_role: 'all',
    });

    useEffect(() => {
        fetchPopups();
    }, []);

    const fetchPopups = async () => {
        try {
            const { data, error } = await supabase
                .from('app_popups')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPopups(data || []);
        } catch (error) {
            console.error('Error fetching popups:', error);
            toast.error('Failed to load popups');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePopup = async () => {
        if (!newPopup.title || !newPopup.image_url) {
            toast.error("Title and Image URL are required");
            return;
        }

        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('app_popups')
                .insert({
                    title: newPopup.title,
                    image_url: newPopup.image_url,
                    target_role: newPopup.target_role,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            toast.success("Popup created!");
            setPopups([data, ...popups]);
            setOpenCreate(false);
            setNewPopup({ title: '', image_url: '', target_role: 'all' }); // Reset

        } catch (error: any) {
            console.error("Create Popup Error:", error);
            toast.error(error.message || "Failed to create popup");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('app_popups').delete().eq('id', id);
        if (error) {
            toast.error("Failed to delete popup");
        } else {
            toast.success("Popup deleted");
            setPopups(popups.filter(p => p.id !== id));
        }
    };

    const toggleStatus = async (popup: Popup) => {
        const newStatus = !popup.is_active;
        const { error } = await supabase
            .from('app_popups')
            .update({ is_active: newStatus })
            .eq('id', popup.id);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Popup ${newStatus ? 'activated' : 'deactivated'}`);
            setPopups(popups.map(p => p.id === popup.id ? { ...p, is_active: newStatus } : p));
        }
    };

    return (
        <DashboardLayout title="App Popups">
            <div className="space-y-6 animate-fade-in">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex gap-3">
                        {/* Search if needed */}
                    </div>

                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create Popup
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Popup</DialogTitle>
                                <DialogDescription>Appears on app launch for users.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="title" className="text-right">Title</Label>
                                    <Input
                                        id="title"
                                        value={newPopup.title}
                                        onChange={(e) => setNewPopup({ ...newPopup, title: e.target.value })}
                                        className="col-span-3"
                                        placeholder="e.g. Welcome Offer"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="image_url" className="text-right">Image URL</Label>
                                    <Input
                                        id="image_url"
                                        value={newPopup.image_url}
                                        onChange={(e) => setNewPopup({ ...newPopup, image_url: e.target.value })}
                                        className="col-span-3"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="role" className="text-right">Target Role</Label>
                                    <select
                                        id="role"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                                        value={newPopup.target_role}
                                        onChange={(e) => setNewPopup({ ...newPopup, target_role: e.target.value as any })}
                                    >
                                        <option value="all">All Users</option>
                                        <option value="customer">Customers Only</option>
                                        <option value="driver">Drivers Only</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleCreatePopup} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Popup
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Popups Table */}
                <div className="card-elevated overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : popups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No popups found.</TableCell>
                                </TableRow>
                            ) : popups.map((popup) => (
                                <TableRow key={popup.id} className="table-row-hover">
                                    <TableCell>
                                        <div className="h-10 w-16 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                                            {popup.image_url ? (
                                                <img src={popup.image_url} alt="Popup" className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{popup.title}</TableCell>
                                    <TableCell>
                                        <span className="capitalize bg-secondary px-2 py-1 rounded text-xs">
                                            {popup.target_role}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {format(new Date(popup.created_at), 'MMM dd, yyyy')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={popup.is_active ? 'active' : 'inactive'} />
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => toggleStatus(popup)}>
                                                    {popup.is_active ? 'Deactivate' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(popup.id)}>Delete</DropdownMenuItem>
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
