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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, MoreHorizontal, Filter, MessageSquare, Send, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'closed' | 'resolved';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();

    // Subscribe to real-time updates on support_tickets
    const ticketsSubscription = supabase
      .channel('support_tickets_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      ticketsSubscription.unsubscribe();
    };
  }, []);

  async function fetchTickets() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch user details for each ticket
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))];
        let usersMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, phone')
            .in('id', userIds);
          users?.forEach(u => usersMap[u.id] = u);
        }

        const enrichedTickets = data.map(ticket => ({
          ...ticket,
          user: ticket.user_id ? usersMap[ticket.user_id] : undefined,
        }));

        setTickets(enrichedTickets);
      } else {
        setTickets([]);
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function openTicketChat(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    setChatOpen(true);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Subscribe to real-time messages when chat is open
  useEffect(() => {
    if (!chatOpen || !selectedTicket) return;

    const messagesSubscription = supabase
      .channel(`support_messages_${selectedTicket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as SupportMessage]);
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [chatOpen, selectedTicket?.id]);

  async function sendReply() {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: replyMessage,
          is_admin: true,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages([...messages, data]);
      setReplyMessage('');
      toast({
        title: 'Success',
        description: 'Reply sent',
      });

      // Update ticket updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setSendingReply(false);
    }
  }

  async function updateTicketStatus(ticketId: string, newStatus: 'open' | 'closed' | 'resolved') {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Ticket marked as ${newStatus}`,
      });

      // Update selected ticket if it's the one being changed
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }

      fetchTickets();
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  }

  async function closeTicket(ticketId: string) {
    await updateTicketStatus(ticketId, 'closed');
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user?.phone?.includes(searchTerm) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout title="Support & Issues">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={fetchTickets} variant="outline">Refresh</Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.open}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-semibold text-green-600">{stats.resolved}</p>
          </div>
          <div className="stat-card py-4">
            <p className="text-sm text-muted-foreground">Closed</p>
            <p className="text-2xl font-semibold text-gray-600">{stats.closed}</p>
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
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('open')}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved
          </Button>
          <Button
            variant={statusFilter === 'closed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('closed')}
          >
            Closed
          </Button>
        </div>

        {/* Tickets Table */}
        <div className="card-elevated overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              No support tickets found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="table-row-hover">
                    <TableCell>
                      <div className="max-w-[250px]">
                        <p className="font-medium truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground font-mono">#{ticket.id.slice(0, 8)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.user?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{ticket.user?.phone || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.updated_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openTicketChat(ticket)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            View & Reply
                          </DropdownMenuItem>
                          {ticket.status !== 'closed' && (
                            <DropdownMenuItem
                              onClick={() => closeTicket(ticket.id)}
                              className="text-destructive"
                            >
                              Close Ticket
                            </DropdownMenuItem>
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

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="border-b p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <DialogTitle>{selectedTicket?.subject}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTicket?.user?.full_name} • {selectedTicket?.user?.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedTicket?.status || 'open')}>
                  {selectedTicket?.status?.charAt(0).toUpperCase()}{selectedTicket?.status?.slice(1)}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => updateTicketStatus(selectedTicket!.id, 'open')}
                      className={selectedTicket?.status === 'open' ? 'bg-blue-50' : ''}
                    >
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateTicketStatus(selectedTicket!.id, 'resolved')}
                      className={selectedTicket?.status === 'resolved' ? 'bg-green-50' : ''}
                    >
                      Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateTicketStatus(selectedTicket!.id, 'closed')}
                      className={selectedTicket?.status === 'closed' ? 'bg-gray-50' : ''}
                    >
                      Closed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.is_admin ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-lg text-sm max-w-[70%] break-words',
                      msg.is_admin
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white border text-foreground'
                    )}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t p-6 flex gap-2">
            <Textarea
              placeholder="Type your reply..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  sendReply();
                }
              }}
              className="resize-none"
              rows={3}
            />
            <Button
              onClick={sendReply}
              disabled={sendingReply || !replyMessage.trim()}
              className="gap-2"
            >
              {sendingReply ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
