import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  Download,
  Eye,
  Flag,
  User,
  MessageSquare,
  File,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Report {
  id: string
  reason: 'harassment' | 'spam' | 'inappropriate_content' | 'hate_speech' | 'violence' | 'impersonation' | 'malware' | 'other'
  reportType: 'user' | 'message' | 'file' | 'other'
  description: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  reporter: {
    id: string
    username: string
    email: string
  }
  reportedUser?: {
    id: string
    username: string
    email: string
  }
  reportedContent?: {
    id: string
    type: string
    content: string
  }
  reviewer?: {
    id: string
    username: string
    email: string
  }
  resolution?: string
  actionTaken?: 'no_action' | 'warning_issued' | 'content_removed' | 'user_suspended' | 'user_banned' | 'other'
  createdAt: string
  reviewedAt?: string
}

interface ReportFilters {
  status?: string
  reason?: string
  reportType?: string
  search?: string
}

interface ResolveReportData {
  resolution: string
  actionTaken: 'no_action' | 'warning_issued' | 'content_removed' | 'user_suspended' | 'user_banned' | 'other'
  status: 'resolved' | 'dismissed'
}

// Mock API functions - these would be replaced with actual API calls
const reportsApi = {
  getReports: async (filters: ReportFilters = {}): Promise<{ data: Report[]; pagination: any }> => {
    // Mock data - replace with actual API call
    return {
      data: [
        {
          id: '1',
          reason: 'harassment',
          reportType: 'user',
          description: 'User sending threatening messages and harassment',
          status: 'pending',
          priority: 'high',
          reporter: {
            id: 'user-1',
            username: 'john_doe',
            email: 'john@example.com',
          },
          reportedUser: {
            id: 'user-2',
            username: 'jane_smith',
            email: 'jane@example.com',
          },
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          reason: 'spam',
          reportType: 'message',
          description: 'User sending spam messages with links to malicious sites',
          status: 'investigating',
          priority: 'medium',
          reporter: {
            id: 'user-3',
            username: 'bob_wilson',
            email: 'bob@example.com',
          },
          reportedContent: {
            id: 'msg-1',
            type: 'message',
            content: 'Check out this amazing site! [malicious link]',
          },
          reviewer: {
            id: 'admin-1',
            username: 'admin',
            email: 'admin@example.com',
          },
          createdAt: '2024-01-14T15:30:00Z',
          reviewedAt: '2024-01-14T16:00:00Z',
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalReports: 2,
      },
    }
  },
  
  resolveReport: async (reportId: string, data: ResolveReportData): Promise<void> => {
    // Mock implementation - replace with actual API call
    console.log('Resolving report:', reportId, data)
  },
}

const ReportsManagement: React.FC = () => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ReportFilters>({})
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [resolveData, setResolveData] = useState<ResolveReportData>({
    resolution: '',
    actionTaken: 'no_action',
    status: 'resolved',
  })

  const queryClient = useQueryClient()

  const { data: reportsData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'reports', page, filters],
    queryFn: () => reportsApi.getReports(filters),
    keepPreviousData: true,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: ResolveReportData }) =>
      reportsApi.resolveReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
      toast.success('Report resolved successfully')
      setIsResolveDialogOpen(false)
      setSelectedReport(null)
      setResolveData({
        resolution: '',
        actionTaken: 'no_action',
        status: 'resolved',
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resolve report')
    },
  })

  const reports = reportsData?.data || []
  const totalPages = reportsData?.pagination.totalPages || 1

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      harassment: 'bg-red-100 text-red-800',
      spam: 'bg-yellow-100 text-yellow-800',
      inappropriate_content: 'bg-orange-100 text-orange-800',
      hate_speech: 'bg-purple-100 text-purple-800',
      violence: 'bg-red-100 text-red-800',
      impersonation: 'bg-blue-100 text-blue-800',
      malware: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return (
      <Badge className={colors[reason] || colors.other}>
        {reason.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'investigating':
        return <Badge className="bg-blue-100 text-blue-800">Investigating</Badge>
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>
      case 'dismissed':
        return <Badge variant="outline">Dismissed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>
      default:
        return <Badge variant="outline">Low</Badge>
    }
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      case 'file':
        return <File className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const updateFilter = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const openResolveDialog = (report: Report) => {
    setSelectedReport(report)
    setIsResolveDialogOpen(true)
  }

  const openViewDialog = (report: Report) => {
    setSelectedReport(report)
    setIsViewDialogOpen(true)
  }

  const handleResolve = () => {
    if (selectedReport) {
      resolveMutation.mutate({
        reportId: selectedReport.id,
        data: resolveData,
      })
    }
  }

  const exportReports = (format: 'csv' | 'pdf') => {
    const exportUrl = `/api/admin/export/reports/${format}`
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    
    const url = `${exportUrl}?${params.toString()}`
    window.open(url, '_blank')
    toast.success(`Exporting reports as ${format.toUpperCase()}`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Reports Management
              </CardTitle>
              <CardDescription>
                Review and resolve user reports
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportReports('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportReports('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status || ''} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.reason || ''} onValueChange={(value) => updateFilter('reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Reasons</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                <SelectItem value="hate_speech">Hate Speech</SelectItem>
                <SelectItem value="violence">Violence</SelectItem>
                <SelectItem value="impersonation">Impersonation</SelectItem>
                <SelectItem value="malware">Malware</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.reportType || ''} onValueChange={(value) => updateFilter('reportType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {Object.keys(filters).length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => (
                value && (
                  <Badge key={key} variant="secondary" className="gap-1">
                    {key}: {value}
                    <button
                      onClick={() => updateFilter(key as keyof ReportFilters, '')}
                      className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </Badge>
                )
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* Reports Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading reports...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReportTypeIcon(report.reportType)}
                          <span className="text-sm capitalize">{report.reportType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getReasonBadge(report.reason)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(report.priority)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(report.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{report.reporter.username}</div>
                          <div className="text-muted-foreground">{report.reporter.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.reportedUser ? (
                            <>
                              <div className="font-medium">{report.reportedUser.username}</div>
                              <div className="text-muted-foreground">{report.reportedUser.email}</div>
                            </>
                          ) : report.reportedContent ? (
                            <div className="text-muted-foreground">
                              {report.reportedContent.type} #{report.reportedContent.id}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">N/A</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </div>
                        {report.reviewedAt && (
                          <div className="text-xs text-muted-foreground">
                            Reviewed: {formatDistanceToNow(new Date(report.reviewedAt), { addSuffix: true })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(report)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {['pending', 'investigating'].includes(report.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openResolveDialog(report)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Resolve Report
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({reportsData?.pagination.totalReports || 0} total reports)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Full details of the reported issue.
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Report Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getReportTypeIcon(selectedReport.reportType)}
                    <span className="capitalize">{selectedReport.reportType}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reason</Label>
                  <div className="mt-1">{getReasonBadge(selectedReport.reason)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedReport.priority)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm">{selectedReport.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Reporter</Label>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{selectedReport.reporter.username}</div>
                    <div className="text-muted-foreground">{selectedReport.reporter.email}</div>
                  </div>
                </div>
                
                {selectedReport.reportedUser && (
                  <div>
                    <Label className="text-sm font-medium">Reported User</Label>
                    <div className="mt-1 text-sm">
                      <div className="font-medium">{selectedReport.reportedUser.username}</div>
                      <div className="text-muted-foreground">{selectedReport.reportedUser.email}</div>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedReport.reportedContent && (
                <div>
                  <Label className="text-sm font-medium">Reported Content</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <div className="text-sm font-medium mb-1">
                      {selectedReport.reportedContent.type} #{selectedReport.reportedContent.id}
                    </div>
                    <p className="text-sm">{selectedReport.reportedContent.content}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="mt-1">
                    {formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true })}
                  </div>
                </div>
                
                {selectedReport.reviewedAt && (
                  <div>
                    <Label className="text-sm font-medium">Reviewed</Label>
                    <div className="mt-1">
                      {formatDistanceToNow(new Date(selectedReport.reviewedAt), { addSuffix: true })}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedReport.resolution && (
                <div>
                  <Label className="text-sm font-medium">Resolution</Label>
                  <p className="mt-1 text-sm">{selectedReport.resolution}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedReport && ['pending', 'investigating'].includes(selectedReport.status) && (
              <Button onClick={() => {
                setIsViewDialogOpen(false)
                openResolveDialog(selectedReport)
              }}>
                Resolve Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Report Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Review and resolve the reported issue.
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  {getReportTypeIcon(selectedReport.reportType)}
                  <span className="font-medium capitalize">{selectedReport.reportType}</span>
                  {getReasonBadge(selectedReport.reason)}
                  {getPriorityBadge(selectedReport.priority)}
                </div>
                <p className="text-sm">{selectedReport.description}</p>
                <div className="text-xs text-muted-foreground mt-2">
                  Reported by {selectedReport.reporter.username} • {formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true })}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Textarea
                  id="resolution"
                  value={resolveData.resolution}
                  onChange={(e) => setResolveData(prev => ({ ...prev, resolution: e.target.value }))}
                  placeholder="Describe the resolution and any actions taken..."
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actionTaken">Action Taken</Label>
                  <Select
                    value={resolveData.actionTaken}
                    onValueChange={(value) => setResolveData(prev => ({ ...prev, actionTaken: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_action">No Action</SelectItem>
                      <SelectItem value="warning_issued">Warning Issued</SelectItem>
                      <SelectItem value="content_removed">Content Removed</SelectItem>
                      <SelectItem value="user_suspended">User Suspended</SelectItem>
                      <SelectItem value="user_banned">User Banned</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Final Status</Label>
                  <Select
                    value={resolveData.status}
                    onValueChange={(value) => setResolveData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={resolveMutation.isLoading || !resolveData.resolution.trim()}
            >
              {resolveMutation.isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Resolve Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportsManagement