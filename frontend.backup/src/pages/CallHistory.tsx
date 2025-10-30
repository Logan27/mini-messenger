import React, { useState, useMemo } from 'react'
import { Search, Filter, Phone, Video, PhoneOff, Calendar, Clock, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CallHistoryItem } from '@/features/calls/components/CallHistoryItem'
import { CallHistoryFilters, CallHistoryItem as CallHistoryItemType, CallType } from '@/shared/lib/types'

interface CallHistoryPageProps {
  callHistory: CallHistoryItemType[]
  onCallAgain: (userId: string, callType: CallType) => void
  onViewDetails?: (callId: string) => void
  isLoading?: boolean
}

export const CallHistory: React.FC<CallHistoryPageProps> = ({
  callHistory,
  onCallAgain,
  onViewDetails,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<CallHistoryFilters>({
    type: 'all',
    dateFrom: '',
    dateTo: '',
    duration: undefined
  })
  const [showFilters, setShowFilters] = useState(false)

  // Filter and search call history
  const filteredHistory = useMemo(() => {
    return callHistory.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const participantName = item.participant.name.toLowerCase()
        const topic = item.call.metadata?.topic?.toLowerCase() || ''

        if (!participantName.includes(query) && !topic.includes(query)) {
          return false
        }
      }

      // Type filter
      if (filters.type && filters.type !== 'all') {
        switch (filters.type) {
          case 'missed':
            if (!item.isMissed) return false
            break
          case 'audio':
            if (item.call.type !== 'audio') return false
            break
          case 'video':
            if (item.call.type !== 'video') return false
            break
          case 'received':
            if (!item.isIncoming) return false
            break
          case 'outgoing':
            if (item.isIncoming) return false
            break
        }
      }

      // Date filters
      if (filters.dateFrom) {
        const callDate = new Date(item.call.createdAt)
        const fromDate = new Date(filters.dateFrom)
        if (callDate < fromDate) return false
      }

      if (filters.dateTo) {
        const callDate = new Date(item.call.createdAt)
        const toDate = new Date(filters.dateTo)
        if (callDate > toDate) return false
      }

      // Duration filter
      if (filters.duration && item.call.duration) {
        switch (filters.duration) {
          case 'short':
            if (item.call.duration >= 60) return false
            break
          case 'medium':
            if (item.call.duration < 60 || item.call.duration > 600) return false
            break
          case 'long':
            if (item.call.duration <= 600) return false
            break
        }
      }

      return true
    })
  }, [callHistory, searchQuery, filters])

  // Group calls by date
  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: CallHistoryItemType[] } = {}

    filteredHistory.forEach(item => {
      const date = new Date(item.call.createdAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let groupKey: string
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday'
      } else {
        groupKey = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })

    return groups
  }, [filteredHistory])

  const getCallStats = () => {
    const total = callHistory.length
    const missed = callHistory.filter(item => item.isMissed).length
    const audio = callHistory.filter(item => item.call.type === 'audio').length
    const video = callHistory.filter(item => item.call.type === 'video').length
    const totalDuration = callHistory.reduce((sum, item) => sum + (item.call.duration || 0), 0)

    return { total, missed, audio, video, totalDuration }
  }

  const stats = getCallStats()

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateFrom: '',
      dateTo: '',
      duration: undefined
    })
    setSearchQuery('')
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Call History</h1>
        <p className="text-muted-foreground">
          View and manage your call history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Calls</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.missed}</div>
            <div className="text-sm text-muted-foreground">Missed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.audio}</div>
            <div className="text-sm text-muted-foreground">Audio Calls</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.video}</div>
            <div className="text-sm text-muted-foreground">Video Calls</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search calls by participant or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.type !== 'all' || filters.dateFrom || filters.dateTo || filters.duration) && (
                <Badge variant="secondary" className="ml-1">Active</Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {(searchQuery || filters.type !== 'all' || filters.dateFrom || filters.dateTo || filters.duration) && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Call Type</label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Calls</SelectItem>
                    <SelectItem value="audio">Audio Only</SelectItem>
                    <SelectItem value="video">Video Calls</SelectItem>
                    <SelectItem value="missed">Missed Calls</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <Select
                  value={filters.duration || ''}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, duration: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Duration</SelectItem>
                    <SelectItem value="short">Short (under 1 min)</SelectItem>
                    <SelectItem value="medium">Medium (1-10 min)</SelectItem>
                    <SelectItem value="long">Long (over 10 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call History List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading call history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No calls found</h3>
            <p className="text-muted-foreground">
              {callHistory.length === 0
                ? "You haven't made or received any calls yet."
                : "No calls match your current filters."
              }
            </p>
            {callHistory.length > 0 && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([dateGroup, calls]) => (
            <div key={dateGroup}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {dateGroup}
                <Badge variant="outline">{calls.length}</Badge>
              </h2>

              <div className="space-y-2">
                {calls.map((item) => (
                  <CallHistoryItem
                    key={item.call.id}
                    item={item}
                    onCallAgain={onCallAgain}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {filteredHistory.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredHistory.length} of {callHistory.length} calls
              </span>
              {stats.totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Total duration: {formatDuration(stats.totalDuration)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}