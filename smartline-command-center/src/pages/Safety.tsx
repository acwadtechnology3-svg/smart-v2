import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, PhoneIcon, UserIcon, CarFront, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SOSAlert {
    id: string;
    driver_id: string;
    trip_id?: string;
    reporter_id?: string;
    latitude: number;
    longitude: number;
    status: 'pending' | 'investigating' | 'resolved' | 'false_alarm' | 'cancelled';
    notes?: string;
    created_at: string;
    metadata?: any;
    driver?: {
        full_name: string;
        phone: string;
    };
    reporter?: {
        full_name: string;
        phone: string;
    };
    trip?: {
        pickup_address: string;
        destination_address: string;
        status: string;
        customer_id?: string;
        customer?: {
            full_name: string;
            phone: string;
        };
    };
}

export default function Safety() {
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { toast } = useToast();

    // Play sound notification
    const playAlertSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => console.log('Audio play failed:', err));
        }
    };

    useEffect(() => {
        fetchAlerts();

        // Subscribe to real-time SOS alert changes
        const channel = supabase
            .channel('sos_alerts_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
                (payload) => {
                    console.log('New SOS alert received:', payload);
                    playAlertSound();
                    toast({
                        title: "🚨 NEW SOS ALERT RECEIVED",
                        description: "A new emergency alert has been reported",
                        variant: "destructive"
                    });
                    fetchAlerts();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sos_alerts' },
                (payload) => {
                    console.log('SOS alert updated:', payload);
                    fetchAlerts();
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        return () => {
            channel.unsubscribe();
        };
    }, []);

    async function fetchAlerts() {
        try {
            setLoading(true);
            console.log("Fetching SOS alerts...");

            // Fetch all SOS alerts
            const { data: alertsData, error: alertsError } = await supabase
                .from('sos_alerts')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('Alerts data:', alertsData);
            console.log('Alerts error:', alertsError);

            if (alertsError) {
                console.error('Error fetching alerts:', alertsError);
                toast({
                    title: 'Error',
                    description: 'Failed to fetch SOS alerts: ' + alertsError.message,
                    variant: 'destructive'
                });
                setAlerts([]);
                return;
            }

            if (!alertsData || alertsData.length === 0) {
                console.log('No alerts found');
                setAlerts([]);
                return;
            }

            // Collect all user IDs we need to fetch
            const driverIds = new Set<string>();
            const reporterIds = new Set<string>();
            const tripIds = new Set<string>();

            alertsData.forEach(a => {
                if (a.driver_id) driverIds.add(a.driver_id);
                if (a.reporter_id) reporterIds.add(a.reporter_id);
                if (a.trip_id) tripIds.add(a.trip_id);
            });

            // Fetch users (drivers and reporters)
            const allUserIds = [...new Set([...driverIds, ...reporterIds])];
            let usersMap: Record<string, any> = {};

            if (allUserIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, full_name, phone')
                    .in('id', allUserIds);
                (users || []).forEach(u => usersMap[u.id] = u);
            }

            // Fetch trips
            let tripsMap: Record<string, any> = {};
            if (tripIds.size > 0) {
                const { data: trips } = await supabase
                    .from('trips')
                    .select('id, pickup_address, destination_address, status, customer_id')
                    .in('id', Array.from(tripIds));
                
                // Fetch customers for trips
                const customerIds = new Set<string>();
                (trips || []).forEach(t => {
                    tripsMap[t.id] = t;
                    if (t.customer_id) customerIds.add(t.customer_id);
                });

                // Fetch customer details
                if (customerIds.size > 0) {
                    const { data: customers } = await supabase
                        .from('users')
                        .select('id, full_name, phone')
                        .in('id', Array.from(customerIds));
                    
                    (customers || []).forEach(c => {
                        // Attach customer to their trips
                        Object.values(tripsMap).forEach((trip: any) => {
                            if (trip.customer_id === c.id) {
                                trip.customer = c;
                            }
                        });
                    });
                }
            }

            // Enrich alerts with user and trip data
            const enrichedAlerts: SOSAlert[] = alertsData.map(alert => ({
                ...alert,
                driver: alert.driver_id ? usersMap[alert.driver_id] : undefined,
                reporter: alert.reporter_id ? usersMap[alert.reporter_id] : undefined,
                trip: alert.trip_id ? tripsMap[alert.trip_id] : undefined,
            }));

            console.log('Enriched alerts:', enrichedAlerts);
            setAlerts(enrichedAlerts);
        } catch (error) {
            console.error('Error in fetchAlerts:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch SOS alerts',
                variant: 'destructive'
            });
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const { error } = await supabase
                .from('sos_alerts')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', id);
            
            if (error) {
                console.error('Error updating status:', error);
                toast({ 
                    title: 'Error', 
                    description: 'Failed to update status: ' + error.message, 
                    variant: 'destructive' 
                });
                return;
            }
            
            console.log('Status updated successfully to:', newStatus);
            toast({ 
                title: 'Success', 
                description: `Alert marked as ${newStatus}` 
            });
            
            // Update the local state immediately
            setAlerts(prevAlerts => 
                prevAlerts.map(alert => 
                    alert.id === id ? { ...alert, status: newStatus as any } : alert
                )
            );
        } catch (error) {
            console.error('Error in updateStatus:', error);
            toast({ 
                title: 'Error', 
                description: 'Failed to update status', 
                variant: 'destructive' 
            });
        }
    }

    // Filter and search logic
    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = 
            alert.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.driver?.phone?.includes(searchTerm) ||
            alert.reporter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.reporter?.phone?.includes(searchTerm) ||
            alert.trip?.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.trip?.destination_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = !statusFilter || alert.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: alerts.length,
        pending: alerts.filter(a => a.status === 'pending').length,
        investigating: alerts.filter(a => a.status === 'investigating').length,
        resolved: alerts.filter(a => a.status === 'resolved').length,
    };

    return (
        <DashboardLayout title="Safety Command Center">
            <audio
                ref={audioRef}
                src="/sos-43210.mp3"
                preload="auto"
            />
            <div className="space-y-6">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <MapPinIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by driver, reporter, location, or alert ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <Button onClick={fetchAlerts} variant="outline">Refresh</Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="stat-card py-4">
                        <p className="text-sm text-muted-foreground">Total Alerts</p>
                        <p className="text-2xl font-semibold">{stats.total}</p>
                    </div>
                    <div className="stat-card py-4">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-semibold text-red-600">{stats.pending}</p>
                    </div>
                    <div className="stat-card py-4">
                        <p className="text-sm text-muted-foreground">Investigating</p>
                        <p className="text-2xl font-semibold text-blue-600">{stats.investigating}</p>
                    </div>
                    <div className="stat-card py-4">
                        <p className="text-sm text-muted-foreground">Resolved</p>
                        <p className="text-2xl font-semibold text-green-600">{stats.resolved}</p>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={statusFilter === null ? 'default' : 'outline'}
                        onClick={() => setStatusFilter(null)}
                    >
                        All Alerts
                    </Button>
                    <Button
                        variant={statusFilter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('pending')}
                        className={statusFilter === 'pending' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        Pending
                    </Button>
                    <Button
                        variant={statusFilter === 'investigating' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('investigating')}
                        className={statusFilter === 'investigating' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                        Investigating
                    </Button>
                    <Button
                        variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('resolved')}
                        className={statusFilter === 'resolved' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                        Resolved
                    </Button>
                </div>

                {/* Alerts Grid */}
                {loading ? (
                    <div className="flex items-center justify-center p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        {alerts.length === 0 ? 'No active alerts. The system is monitored.' : 'No alerts match your search or filter.'}
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredAlerts.map((alert) => (
                        <Card key={alert.id} className={`border-l-4 ${alert.status === 'pending' ? 'border-l-red-600 shadow-red-100' : 'border-l-green-500'}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="flex items-center gap-3">
                                        <Badge variant={alert.status === 'pending' ? 'destructive' : 'outline'} className="text-sm px-3 py-1">
                                            {alert.status.toUpperCase()}
                                        </Badge>
                                        <span>Emergency Alert</span>
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <CalendarIcon className="h-4 w-4" />
                                        {new Date(alert.created_at).toLocaleString()}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    {alert.status === 'pending' && (
                                        <Button onClick={() => updateStatus(alert.id, 'investigating')} variant="default" className="bg-blue-600 hover:bg-blue-700">Investigate</Button>
                                    )}
                                    {alert.status !== 'resolved' && (
                                        <Button onClick={() => updateStatus(alert.id, 'resolved')} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">Resolve</Button>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Location Column */}
                                <div className="space-y-4 border-r pr-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <MapPinIcon className="h-5 w-5 text-gray-500" />
                                        Live Location
                                    </h3>
                                    <div className="bg-gray-50 p-3 rounded-md text-sm font-mono">
                                        {Number(alert.latitude).toFixed(6)}, {Number(alert.longitude).toFixed(6)}
                                    </div>
                                    <Button asChild variant="link" className="pl-0 text-blue-600">
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`} target="_blank" rel="noreferrer">
                                            View on Google Maps &rarr;
                                        </a>
                                    </Button>
                                    {alert.notes && (
                                        <div className="text-sm text-gray-600 mt-2">
                                            <strong>Notes:</strong> {alert.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Reporter/Customer Info */}
                                <div className="space-y-4 border-r pr-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <UserIcon className="h-5 w-5 text-gray-500" />
                                        Reporter / Customer
                                    </h3>
                                    {alert.reporter ? (
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarFallback>{alert.reporter.full_name?.charAt(0) || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{alert.reporter.full_name || "Unknown"}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <PhoneIcon className="h-3 w-3" />
                                                    {alert.reporter.phone || "No Phone"}
                                                </div>
                                            </div>
                                        </div>
                                    ) : alert.trip?.customer ? (
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarFallback>{alert.trip.customer.full_name?.charAt(0) || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{alert.trip.customer.full_name || "Unknown"}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <PhoneIcon className="h-3 w-3" />
                                                    {alert.trip.customer.phone || "No Phone"}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Unknown Reporter</p>
                                    )}

                                    {alert.trip && (
                                        <div className="mt-4 pt-4 border-t">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Trip Route</p>
                                            <p className="text-sm mb-1"><span className="text-green-600">●</span> {alert.trip.pickup_address || 'N/A'}</p>
                                            <p className="text-sm"><span className="text-red-600">●</span> {alert.trip.destination_address || 'N/A'}</p>
                                        </div>
                                    )}
                                    {!alert.trip && (
                                        <div className="mt-4 pt-4 border-t text-sm text-yellow-600">
                                            ⚠ No trip linked to this alert.
                                        </div>
                                    )}
                                </div>

                                {/* Driver Info */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <CarFront className="h-5 w-5 text-gray-500" />
                                        Driver
                                    </h3>
                                    {alert.driver ? (
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarFallback>{alert.driver.full_name?.charAt(0) || 'D'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{alert.driver.full_name || "Unknown Driver"}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <PhoneIcon className="h-3 w-3" />
                                                    {alert.driver.phone || "No Phone"}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No Driver Info</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
