import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, PhoneIcon, UserIcon, CarFront } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SOSAlert {
    id: string;
    trip_id: string;
    reporter_id?: string;
    latitude: number;
    longitude: number;
    status: 'pending' | 'investigating' | 'resolved' | 'false_alarm';
    created_at: string;
    metadata?: any;
    reporter?: {
        name: string;
        phone: string;
        avatar_url?: string;
    };
    trip?: {
        pickup_address: string;
        dest_address: string;
        status: string;
        driver_id?: string;
        customer_id?: string;
        customer?: {
            name: string;
            phone: string;
            avatar_url?: string;
        };
        driver?: {
            id: string;
            name: string;
            phone: string;
            avatar_url?: string;
        };
        vehicle?: {
            vehicle_model: string;
            vehicle_plate: string;
            photo_url?: string;
        };
    };
}

export default function Safety() {
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchAlerts();

        const channel = supabase
            .channel('sos_alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, (payload) => {
                toast({
                    title: "NEW ALERT RECEIVED",
                    variant: "destructive"
                });
                fetchAlerts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchAlerts() {
        console.log("Fetching alerts (hybrid mode)...");

        // 1. Fetch Raw Alerts
        const { data: alertsData, error: alertsError } = await supabase
            .from('sos_alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (alertsError) {
            console.error('Error fetching alerts:', alertsError);
            return;
        }

        if (!alertsData || alertsData.length === 0) {
            setAlerts([]);
            return;
        }

        // 2. Collect IDs (from DB Columns OR Metadata)
        const tripIds = new Set<string>();
        const reporterIds = new Set<string>();
        const potentialDriverIds = new Set<string>();
        const potentialCustomerIds = new Set<string>();

        alertsData.forEach(a => {
            if (a.trip_id) tripIds.add(a.trip_id);
            if (a.reporter_id) reporterIds.add(a.reporter_id);

            // Check metadata snapshot for IDs if DB IDs are missing
            const snap = a.metadata?.snapshot?.trip;
            if (snap) {
                if (snap.driver_id) potentialDriverIds.add(snap.driver_id);
                if (snap.customer_id) potentialCustomerIds.add(snap.customer_id);
            }
        });

        // 3. Fetch Real Data
        let tripsMap: Record<string, any> = {};
        if (tripIds.size > 0) {
            const { data: trips } = await supabase
                .from('trips')
                .select('*')
                .in('id', Array.from(tripIds));
            (trips || []).forEach(t => tripsMap[t.id] = t);
        }

        // Add Customer/Driver IDs from Real Trips
        Object.values(tripsMap).forEach(t => {
            if (t.customer_id) potentialCustomerIds.add(t.customer_id);
            if (t.driver_id) potentialDriverIds.add(t.driver_id);
        });

        // 4. Fetch Profiles (Reporters + Customers + Drivers)
        const allUserIds = new Set([...reporterIds, ...potentialCustomerIds, ...potentialDriverIds]);
        let profilesMap: Record<string, any> = {};

        // Remove 'mock' IDs if any
        const validUserIds = Array.from(allUserIds).filter(id => id && id.length > 10 && id !== 'mock-driver-id');

        if (validUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, phone, avatar_url')
                .in('id', validUserIds);
            (profiles || []).forEach(p => profilesMap[p.id] = p);
        }

        // 5. Fetch Vehicles
        const validDriverIds = Array.from(potentialDriverIds).filter(id => id && id.length > 10);
        let vehiclesMap: Record<string, any> = {};
        if (validDriverIds.length > 0) {
            const { data: vehicles } = await supabase
                .from('drivers')
                .select('id, vehicle_model, vehicle_plate, photo_url')
                .in('id', validDriverIds);
            (vehicles || []).forEach(v => vehiclesMap[v.id] = v);
        }

        // 6. Stitch Data Together
        const textEnriched: SOSAlert[] = alertsData.map(alert => {
            const enriched: SOSAlert = { ...alert };

            // A. Attach Reporter
            if (alert.reporter_id && profilesMap[alert.reporter_id]) {
                enriched.reporter = profilesMap[alert.reporter_id];
            }

            // B. Attach Trip (DB or Snapshot)
            let rawTrip = alert.trip_id ? tripsMap[alert.trip_id] : null;
            let isSnapshot = false;

            if (!rawTrip && alert.metadata?.snapshot?.trip) {
                rawTrip = alert.metadata.snapshot.trip;
                isSnapshot = true;
            }

            if (rawTrip) {
                enriched.trip = {
                    pickup_address: rawTrip.pickup_address,
                    dest_address: rawTrip.dest_address,
                    status: rawTrip.status,
                    driver_id: rawTrip.driver_id,
                    customer_id: rawTrip.customer_id,

                    // Attach Customer (Profile look up by ID)
                    customer: (rawTrip.customer_id && profilesMap[rawTrip.customer_id])
                        ? profilesMap[rawTrip.customer_id]
                        : undefined,

                    // Attach Driver
                    driver: (rawTrip.driver_id && profilesMap[rawTrip.driver_id])
                        ? profilesMap[rawTrip.driver_id]
                        : undefined,

                    // Attach Vehicle
                    vehicle: (rawTrip.driver_id && vehiclesMap[rawTrip.driver_id])
                        ? vehiclesMap[rawTrip.driver_id]
                        : undefined
                };

                // If mock trip and no real profile found, use reporter as customer
                if (isSnapshot && !enriched.trip.customer && enriched.reporter) {
                    enriched.trip.customer = enriched.reporter;
                }
            }

            return enriched;
        });

        setAlerts(textEnriched);
    }

    async function updateStatus(id: string, newStatus: string) {
        await supabase.from('sos_alerts').update({ status: newStatus }).eq('id', id);
        fetchAlerts();
        toast({ title: `Marked as ${newStatus}` });
    }

    return (
        <DashboardLayout title="Safety Command Center">
            <div className="grid gap-6">
                {alerts.map((alert) => {
                    // Logic to determine customer display (Use Trip Customer first, else Reporter)
                    const customer = alert.trip?.customer || alert.reporter;

                    return (
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
                                        {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                                    </div>
                                    <Button asChild variant="link" className="pl-0 text-blue-600">
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`} target="_blank" rel="noreferrer">
                                            View on Google Maps &rarr;
                                        </a>
                                    </Button>

                                    {/* Debug Trip ID */}
                                    <div className="text-xs text-gray-400 mt-2">
                                        Trip ID: {alert.trip_id ? alert.trip_id.slice(0, 8) + '...' : (alert.trip ? "Demo Mode" : "None")}
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="space-y-4 border-r pr-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <UserIcon className="h-5 w-5 text-gray-500" />
                                        Customer Details
                                    </h3>
                                    {customer ? (
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarImage src={customer.avatar_url || ''} />
                                                <AvatarFallback>{customer.name ? customer.name.charAt(0) : '?'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{customer.name || "Unknown Name"}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <PhoneIcon className="h-3 w-3" />
                                                    {customer.phone || "No Phone"}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Unknown Customer</p>
                                    )}

                                    {alert.trip && (
                                        <div className="mt-4 pt-4 border-t">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Trip Route</p>
                                            <p className="text-sm mb-1"><span className="text-green-600">●</span> {alert.trip.pickup_address}</p>
                                            <p className="text-sm"><span className="text-red-600">●</span> {alert.trip.dest_address}</p>
                                        </div>
                                    )}
                                    {!alert.trip && (
                                        <div className="mt-4 pt-4 border-t text-sm text-yellow-600">
                                            ⚠ No trip linked to this alert.
                                        </div>
                                    )}
                                </div>

                                {/* Driver & Vehicle Info */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <CarFront className="h-5 w-5 text-gray-500" />
                                        Driver & Vehicle
                                    </h3>
                                    {alert.trip?.driver ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 border">
                                                    <AvatarImage src={alert.trip.driver.avatar_url || ''} />
                                                    <AvatarFallback>D</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{alert.trip.driver.name}</p>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                        <PhoneIcon className="h-3 w-3" />
                                                        {alert.trip.driver.phone}
                                                    </div>
                                                </div>
                                            </div>

                                            {alert.trip.vehicle && (
                                                <div className="bg-gray-50 p-3 rounded-md">
                                                    <p className="font-semibold">{alert.trip.vehicle.vehicle_model}</p>
                                                    <p className="text-sm text-gray-600 font-mono mt-1 border px-2 py-0.5 rounded bg-white w-fit">
                                                        {alert.trip.vehicle.vehicle_plate}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No Driver Assigned</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {alerts.length === 0 && (
                    <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        No active alerts. The system is monitored.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
