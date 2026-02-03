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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MoreHorizontal, Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface VehicleChangeRequest {
  id: string;
  driver_id: string;
  current_vehicle_model: string | null;
  current_vehicle_plate: string | null;
  new_vehicle_model: string;
  new_vehicle_plate: string;
  new_vehicle_type: string;
  new_vehicle_front_url: string | null;
  new_vehicle_back_url: string | null;
  new_vehicle_left_url: string | null;
  new_vehicle_right_url: string | null;
  new_vehicle_license_front_url: string | null;
  new_vehicle_license_back_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  driver?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

export default function VehicleChangeRequests() {
  const [requests, setRequests] = useState<VehicleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('pending');
  const [selectedRequest, setSelectedRequest] = useState<VehicleChangeRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicle_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch driver details
      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map(r => r.driver_id))];
        let driversMap: Record<string, any> = {};

        if (driverIds.length > 0) {
          const { data: drivers } = await supabase
            .from('users')
            .select('id, full_name, phone')
            .in('id', driverIds);
          drivers?.forEach(d => driversMap[d.id] = d);
        }

        const enrichedRequests = data.map(req => ({
          ...req,
          driver: req.driver_id ? driversMap[req.driver_id] : undefined,
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch vehicle change requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.driver?.phone?.includes(searchTerm) ||
      req.new_vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function handleApproveReject(request: VehicleChangeRequest, action: 'approve' | 'reject') {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes('');
    setShowActionDialog(true);
  }

  async function submitAction() {
    if (!selectedRequest || !actionType) return;

    try {
      setProcessing(true);
      const newStatus = actionType === 'approve' ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('vehicle_change_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Vehicle change request ${newStatus}`,
      });

      setShowActionDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout title="Vehicle Change Requests">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by driver, plate, or ID..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={fetchRequests} variant="outline">Refresh</Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-semibold text-green-600">{stats.approved}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-semibold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('approved')}
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('rejected')}
          >
            Rejected
          </Button>
        </div>

        {/* Requests Table */}
        <div className="card-elevated overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              No vehicle change requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Driver</TableHead>
                  <TableHead>Current Vehicle</TableHead>
                  <TableHead>New Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="table-row-hover">
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.driver?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{request.driver?.phone || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{request.current_vehicle_model || 'N/A'}</p>
                        <p className="text-muted-foreground">{request.current_vehicle_plate || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{request.new_vehicle_model}</p>
                        <p className="text-muted-foreground">{request.new_vehicle_plate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {request.new_vehicle_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailsDialog(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApproveReject(request, 'approve')}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleApproveReject(request, 'reject')}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Change Request Details</DialogTitle>
            <DialogDescription>
              Request ID: {selectedRequest?.id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Driver Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Driver Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedRequest.driver?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedRequest.driver?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Current Vehicle</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Model:</span> {selectedRequest.current_vehicle_model || 'N/A'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plate:</span> {selectedRequest.current_vehicle_plate || 'N/A'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span> {selectedRequest.current_vehicle_type || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">New Vehicle</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Model:</span> {selectedRequest.new_vehicle_model}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plate:</span> {selectedRequest.new_vehicle_plate}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="capitalize">{selectedRequest.new_vehicle_type}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Images */}
              {(selectedRequest.new_vehicle_front_url || selectedRequest.new_vehicle_back_url || selectedRequest.new_vehicle_left_url || selectedRequest.new_vehicle_right_url) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vehicle Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.new_vehicle_front_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Front</p>
                          <img src={selectedRequest.new_vehicle_front_url} alt="Front" className="w-full rounded border" />
                        </div>
                      )}
                      {selectedRequest.new_vehicle_back_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Back</p>
                          <img src={selectedRequest.new_vehicle_back_url} alt="Back" className="w-full rounded border" />
                        </div>
                      )}
                      {selectedRequest.new_vehicle_left_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Left</p>
                          <img src={selectedRequest.new_vehicle_left_url} alt="Left" className="w-full rounded border" />
                        </div>
                      )}
                      {selectedRequest.new_vehicle_right_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Right</p>
                          <img src={selectedRequest.new_vehicle_right_url} alt="Right" className="w-full rounded border" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* License Images */}
              {(selectedRequest.new_vehicle_license_front_url || selectedRequest.new_vehicle_license_back_url) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">License Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.new_vehicle_license_front_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">License Front</p>
                          <img src={selectedRequest.new_vehicle_license_front_url} alt="License Front" className="w-full rounded border" />
                        </div>
                      )}
                      {selectedRequest.new_vehicle_license_back_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">License Back</p>
                          <img src={selectedRequest.new_vehicle_license_back_url} alt="License Back" className="w-full rounded border" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status & Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                    </span>
                  </div>
                  {selectedRequest.admin_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Admin Notes</p>
                      <p className="text-sm">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Vehicle Change Request
            </DialogTitle>
            <DialogDescription>
              Driver: {selectedRequest?.driver?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (Optional)</label>
              <Textarea
                placeholder="Add notes about this decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve Request' : 'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
