import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { CallHistorySkeleton } from '@/components/SkeletonLoaders';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';

interface CallLog {
  id: string;
  callType: 'video' | 'voice';
  status: 'completed' | 'missed' | 'rejected' | 'cancelled';
  direction: 'incoming' | 'outgoing';
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  duration: number; // in seconds
  timestamp: string;
}

export default function CallHistory() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const callsPerPage = 20;

  useEffect(() => {
    fetchCalls();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, statusFilter, calls]);

  const fetchCalls = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(`${apiUrl}/api/calls`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCalls(response.data.calls || []);
      setFilteredCalls(response.data.calls || []);
    } catch (err: any) {
      toast.error('Failed to load call history');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...calls];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(call =>
        call.participantName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(call => call.callType === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter);
    }

    setFilteredCalls(filtered);
    setCurrentPage(1);
  };

  const handleCallAgain = async (participantId: string, callType: 'video' | 'voice') => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('accessToken');

      await axios.post(
        `${apiUrl}/api/calls/initiate`,
        {
          recipientId: participantId,
          type: callType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Call initiated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate call');
    }
  };

  const getCallIcon = (call: CallLog) => {
    if (call.status === 'missed') {
      return <PhoneMissed className="h-4 w-4 text-red-500" />;
    }
    if (call.status === 'rejected' || call.status === 'cancelled') {
      return <PhoneOff className="h-4 w-4 text-gray-500" />;
    }
    return call.direction === 'incoming' ? (
      <PhoneIncoming className="h-4 w-4 text-green-500" />
    ) : (
      <PhoneOutgoing className="h-4 w-4 text-blue-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      missed: { variant: 'destructive', label: 'Missed' },
      rejected: { variant: 'secondary', label: 'Rejected' },
      cancelled: { variant: 'secondary', label: 'Cancelled' },
    };
    const config = variants[status] || variants.completed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / callsPerPage);
  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentCalls = filteredCalls.slice(indexOfFirstCall, indexOfLastCall);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
          <p className="text-muted-foreground">View your recent calls</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter your call history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Call Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video Calls</SelectItem>
                <SelectItem value="voice">Voice Calls</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {currentCalls.length} of {filteredCalls.length} calls
          </div>
        </CardContent>
      </Card>

      {/* Call List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>90-day retention</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CallHistorySkeleton count={5} />
          ) : currentCalls.length === 0 ? (
            filteredCalls.length === 0 && calls.length > 0 ? (
              <EmptyState
                icon={Search}
                title="No calls match your filters"
                description="Try adjusting your search or filter criteria"
              />
            ) : (
              <EmptyState
                icon={Phone}
                title="No calls yet"
                description="Your call history will appear here once you make or receive calls"
              />
            )
          ) : (
            <>
              <div className="space-y-3">
                {currentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={call.participantAvatar} />
                        <AvatarFallback>
                          {call.participantName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Call Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{call.participantName}</span>
                          {getCallIcon(call)}
                          {call.callType === 'video' ? (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(call.status)}
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(call.duration)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })} •{' '}
                          {format(new Date(call.timestamp), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>

                    {/* Call Again Button */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCallAgain(call.participantId, 'voice')}
                        title="Voice call"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCallAgain(call.participantId, 'video')}
                        title="Video call"
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
