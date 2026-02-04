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
import { Plus, MoreHorizontal, Zap, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
// Map Imports
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Marker Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface SurgeZone {
    id: string;
    center_lat: number;
    center_lng: number;
    radius: number;
    multiplier: number;
    label: string;
    is_active: boolean;
    created_at: string;
}

// Map Click Component
function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function SurgeZones() {
    const [zones, setZones] = useState<SurgeZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCreate, setOpenCreate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // New Zone Form State
    const [newZone, setNewZone] = useState({
        center_lat: '',
        center_lng: '',
        radius: 500,
        multiplier: 1.5,
        label: ''
    });

    useEffect(() => {
        console.log("SurgeZones loaded");
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            const { data, error } = await supabase
                .from('surge_zones')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setZones(data || []);
        } catch (error) {
            console.error('Error fetching surge zones:', error);
            toast.error('Failed to load surge zones');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateZone = async () => {
        if (!newZone.center_lat || !newZone.center_lng) {
            toast.error("Coordinates are required (Click on map)");
            return;
        }

        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('surge_zones')
                .insert({
                    center_lat: parseFloat(newZone.center_lat),
                    center_lng: parseFloat(newZone.center_lng),
                    radius: newZone.radius,
                    multiplier: newZone.multiplier,
                    label: newZone.label,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            toast.success("Surge zone created!");
            setZones([data, ...zones]);
            setOpenCreate(false);
            setNewZone({ center_lat: '', center_lng: '', radius: 500, multiplier: 1.5, label: '' }); // Reset

        } catch (error: any) {
            console.error("Create Zone Error:", error);
            toast.error(error.message || "Failed to create surge zone");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('surge_zones').delete().eq('id', id);
        if (error) {
            toast.error("Failed to delete zone");
        } else {
            toast.success("Zone deleted");
            setZones(zones.filter(z => z.id !== id));
        }
    };

    const toggleStatus = async (zone: SurgeZone) => {
        const newStatus = !zone.is_active;
        const { error } = await supabase
            .from('surge_zones')
            .update({ is_active: newStatus })
            .eq('id', zone.id);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Zone ${newStatus ? 'activated' : 'deactivated'}`);
            setZones(zones.map(z => z.id === zone.id ? { ...z, is_active: newStatus } : z));
        }
    };

    return (
        <DashboardLayout title="Surge Zones (Honeycomb)">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex gap-3"></div>

                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Surge Zone
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Surge Zone</DialogTitle>
                                <DialogDescription>Click on the map to set location.</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                {/* Map Column */}
                                <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative z-0">
                                    <MapContainer
                                        center={[31.2001, 29.9187]} // Default Alexandria
                                        zoom={13}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <LocationSelector
                                            onSelect={(lat, lng) => setNewZone(prev => ({ ...prev, center_lat: lat.toString(), center_lng: lng.toString() }))}
                                        />
                                        {/* Show existing zones for reference */}
                                        {zones.map(z => (
                                            <Circle
                                                key={z.id}
                                                center={[z.center_lat, z.center_lng]}
                                                radius={z.radius}
                                                pathOptions={{ color: z.is_active ? 'orange' : 'gray', fillColor: z.is_active ? 'orange' : 'gray', fillOpacity: 0.2 }}
                                            />
                                        ))}

                                        {/* Show Current Selection */}
                                        {newZone.center_lat && newZone.center_lng && (
                                            <>
                                                <Marker position={[parseFloat(newZone.center_lat), parseFloat(newZone.center_lng)]} />
                                                <Circle
                                                    center={[parseFloat(newZone.center_lat), parseFloat(newZone.center_lng)]}
                                                    radius={newZone.radius || 500}
                                                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                                                />
                                            </>
                                        )}
                                    </MapContainer>
                                </div>

                                {/* Form Column */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="lat" className="text-right">Latitude</Label>
                                        <Input id="lat" value={newZone.center_lat} type="number" readOnly className="col-span-3 bg-gray-50" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="lng" className="text-right">Longitude</Label>
                                        <Input id="lng" value={newZone.center_lng} type="number" readOnly className="col-span-3 bg-gray-50" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="radius" className="text-right">Radius (m)</Label>
                                        <Input id="radius" value={newZone.radius} type="number" onChange={(e) => setNewZone({ ...newZone, radius: parseInt(e.target.value) })} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="multiplier" className="text-right">Multiplier</Label>
                                        <Input id="multiplier" value={newZone.multiplier} type="number" step="0.1" onChange={(e) => setNewZone({ ...newZone, multiplier: parseFloat(e.target.value) })} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="label" className="text-right">Label</Label>
                                        <Input id="label" value={newZone.label} onChange={(e) => setNewZone({ ...newZone, label: e.target.value })} className="col-span-3" placeholder="e.g. Downtown" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleCreateZone} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Zone
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="card-elevated overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Location</TableHead>
                                <TableHead>Multiplier</TableHead>
                                <TableHead>Radius</TableHead>
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
                            ) : zones.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No surge zones active.</TableCell>
                                </TableRow>
                            ) : zones.map((zone) => (
                                <TableRow key={zone.id} className="table-row-hover">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{zone.label || 'Unnamed Zone'}</span>
                                            <span className="text-xs text-muted-foreground">{zone.center_lat.toFixed(4)}, {zone.center_lng.toFixed(4)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-bold text-orange-600">
                                            <Zap size={14} /> {zone.multiplier}x
                                        </div>
                                    </TableCell>
                                    <TableCell>{zone.radius}m</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {format(new Date(zone.created_at), 'MMM dd, yyyy')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={zone.is_active ? 'active' : 'inactive'} />
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => toggleStatus(zone)}>
                                                    {zone.is_active ? 'Deactivate' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(zone.id)}>Delete</DropdownMenuItem>
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
