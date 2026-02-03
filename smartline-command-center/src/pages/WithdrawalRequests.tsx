import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface WithdrawalRequest {
    id: string;
    driver_id: string;
    amount: number;
    method: string;
    account_number: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    admin_note?: string;
    users?: {
        full_name: string;
        phone: string;
    };
}

const WithdrawalRequests = () => {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
    const [adminNote, setAdminNote] = useState("");
    const [processing, setProcessing] = useState(false);
    const [sessionToken, setSessionToken] = useState<string | null>(null);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setSessionToken(session.access_token);
        });

        // 2. Listen for auth changes (updates token automatically)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) setSessionToken(session.access_token);
        });

        fetchRequests();

        return () => subscription.unsubscribe();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Join with users table directly since driver_id references users.id
            const { data, error } = await supabase
                .from('withdrawal_requests')
                .select(`
                    *,
                    users (
                        full_name,
                        phone
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            console.log("Fetched Withdrawal Requests:", data);
            setRequests(data as any || []);
        } catch (error) {
            console.error('Error fetching withdrawal requests:', error);
            toast.error("Failed to fetch withdrawal requests");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;

        setProcessing(true);
        try {
            console.log("Approving withdrawal via RPC...");

            const { error } = await supabase.rpc('approve_withdrawal', {
                req_id: selectedRequest.id,
                admin_note: adminNote || null
            });

            if (error) throw error;

            toast.success("Withdrawal approved successfully");
            setSelectedRequest(null);
            setAdminNote("");
            fetchRequests();
        } catch (error: any) {
            console.error('Error approving withdrawal:', error);
            toast.error(error.message || "Failed to approve withdrawal");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        if (!adminNote.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        setProcessing(true);
        try {
            console.log("Rejecting withdrawal via RPC...");

            const { error } = await supabase.rpc('reject_withdrawal', {
                req_id: selectedRequest.id,
                admin_note: adminNote
            });

            if (error) throw error;

            toast.success("Withdrawal rejected");
            setSelectedRequest(null);
            setAdminNote("");
            fetchRequests();
        } catch (error: any) {
            console.error('Error rejecting withdrawal:', error);
            toast.error(error.message || "Failed to reject withdrawal");
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const processedRequests = requests.filter(r => r.status !== 'pending');

    return (
        <DashboardLayout title="Withdrawal Requests">
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{pendingRequests.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Total: EGP {pendingRequests.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {processedRequests.filter(r => r.status === 'approved' &&
                                    new Date(r.created_at).toDateString() === new Date().toDateString()).length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                            <DollarSign className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{requests.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Requests */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center p-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : pendingRequests.length === 0 ? (
                            <div className="text-center p-10 text-gray-500">
                                No pending withdrawal requests
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map((request) => (
                                    <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-lg">
                                                        {request.users?.full_name || 'Unknown Driver'}
                                                    </h3>
                                                    {getStatusBadge(request.status)}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                    <div>
                                                        <span className="font-medium">Amount:</span> EGP {request.amount.toFixed(2)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Method:</span> {request.method}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Account:</span> {request.account_number}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Phone:</span> {request.users?.phone || 'N/A'}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="font-medium">Date:</span>{' '}
                                                        {new Date(request.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setAdminNote("");
                                                    }}
                                                >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Review
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Processed Requests */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Processed Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {processedRequests.length === 0 ? (
                            <div className="text-center p-10 text-gray-500">
                                No processed requests yet
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {processedRequests.slice(0, 10).map((request) => (
                                    <div key={request.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold">
                                                        {request.users?.full_name || 'Unknown Driver'}
                                                    </h3>
                                                    {getStatusBadge(request.status)}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                    <div>
                                                        <span className="font-medium">Amount:</span> EGP {request.amount.toFixed(2)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Method:</span> {request.method}
                                                    </div>
                                                    {request.admin_note && (
                                                        <div className="col-span-2">
                                                            <span className="font-medium">Admin Note:</span> {request.admin_note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Review Dialog */}
            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Withdrawal Request</DialogTitle>
                        <DialogDescription>
                            Review and approve or reject this withdrawal request
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-medium">Driver:</span>
                                    <span>{selectedRequest.users?.full_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Amount:</span>
                                    <span className="text-lg font-bold">EGP {selectedRequest.amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Method:</span>
                                    <span>{selectedRequest.method}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Account:</span>
                                    <span>{selectedRequest.account_number}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Admin Note (optional for approval, required for rejection)
                                </label>
                                <Textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="Add a note..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={handleReject}
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                                    Reject
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Approve
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default WithdrawalRequests;
