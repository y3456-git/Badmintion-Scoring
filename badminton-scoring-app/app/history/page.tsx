"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Search, Filter, Trophy, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"
import { matchAPI } from "@/app/services/api"
import { toast } from "sonner"
import {
  formatCourt,
  formatEventType,
  formatDate,
  formatTime,
  formatDuration,
  availableCourts,
  availableEventTypes
} from "@/app/utils/formatting"
import { settingsAPI } from "@/app/services/api"

interface HistoricalMatch {
  id: number
  event_type: string
  match_number: string
  court: string
  player1: string
  player2: string
  date: string
  time: string
  start_time: string
  end_time: string
  duration: string
  status: "completed"
  scores: Array<{
    set_number: number
    player1_score: number
    player2_score: number
    completed: boolean
  }>
}

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [eventFilter, setEventFilter] = useState("all")
  const [courtFilter, setCourtFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [matches, setMatches] = useState<HistoricalMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<'end_time' | 'scheduled_date'>('end_time')
  const [eventTypes, setEventTypes] = useState<string[]>([])

  useEffect(() => {
    loadMatches()
    loadEventTypes()
  }, [])

  const loadMatches = async () => {
    try {
      setIsLoading(true)
      const params: Record<string, string> = {
        status: "completed",
        sort_by: sortBy,
        sort_order: sortOrder,
        search: searchTerm
      }
      
      // Only add filters if they are not 'all'
      if (eventFilter !== "all") {
        params.event_type = eventFilter
      }
      if (courtFilter !== "all") {
        params.court = courtFilter
      }
      if (dateFilter) {
        params.date = dateFilter
      }

      console.log('Fetching matches with params:', params) // Debug log
      const response = await matchAPI.getMatches(params)
      console.log('Received matches:', response) // Debug log
      setMatches(response)
    } catch (error) {
      console.error('Failed to load matches:', error)
      toast.error('Failed to load match history')
    } finally {
      setIsLoading(false)
    }
  }

  const loadEventTypes = async () => {
    try {
      const settings = await settingsAPI.getSettings()
      const types = settings.default_event_types?.split(',') || []
      setEventTypes(types)
    } catch (error) {
      console.error('Failed to fetch event types:', error)
      toast.error('Failed to load event types')
    }
  }

  const getWinner = (match: HistoricalMatch) => {
    const player1Sets = match.scores.filter((set) => set.completed && set.player1_score > set.player2_score).length
    const player2Sets = match.scores.filter((set) => set.completed && set.player2_score > set.player1_score).length

    if (player1Sets > player2Sets) return match.player1
    if (player2Sets > player1Sets) return match.player2
    return null
  }

  const isMatchDraw = (match: HistoricalMatch) => {
    if (match.status !== 'completed') return false;
    const player1Sets = match.scores.filter((set) => set.completed && set.player1_score > set.player2_score).length
    const player2Sets = match.scores.filter((set) => set.completed && set.player2_score > set.player1_score).length
    return player1Sets === player2Sets;
  }

  const getFinalScore = (match: HistoricalMatch) => {
    let player1Sets = 0
    let player2Sets = 0

    match.scores.forEach(set => {
      if (set.completed) {
        if (set.player1_score > set.player2_score) {
          player1Sets++
        } else {
          player2Sets++
        }
      }
    })

    return `${player1Sets}-${player2Sets}`
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setEventFilter("all")
    setCourtFilter("all")
    setDateFilter("")
    setSortOrder("desc")
    setSortBy("end_time")
  }

  // Filter handlers
  const handleEventFilterChange = (value: string) => {
    setEventFilter(value)
  }

  const handleCourtFilterChange = (value: string) => {
    setCourtFilter(value)
  }

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value)
  }

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSortChange = (value: 'end_time' | 'scheduled_date') => {
    setSortBy(value)
  }

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setSortOrder(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "scheduled":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading match history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Match History</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/">
                <Button variant="outline">Live Dashboard</Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline">Admin Panel</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter Matches
            </CardTitle>
            <CardDescription>Search and filter historical matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players, match number..."
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Event Type</label>
                <Select value={eventFilter} onValueChange={handleEventFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type">
                      {eventFilter === 'all' ? 'All Events' : formatEventType(eventFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {eventTypes.map((eventType) => (
                      <SelectItem key={eventType} value={eventType}>
                        {formatEventType(eventType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Court</label>
                <Select value={courtFilter} onValueChange={handleCourtFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select court">
                      {courtFilter === 'all' ? 'All Courts' : formatCourt(courtFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courts</SelectItem>
                    {availableCourts.map((court) => (
                      <SelectItem key={court} value={court}>
                        {formatCourt(court)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input 
                  type="date" 
                  value={dateFilter} 
                  onChange={handleDateFilterChange}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sort field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_time">End Time</SelectItem>
                    <SelectItem value="scheduled_date">Scheduled Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Sort Order</label>
                <Select value={sortOrder} onValueChange={handleSortOrderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Latest First</SelectItem>
                    <SelectItem value="asc">Earliest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-full">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {matches.length} matches
          </p>
        </div>

        {/* Match List */}
        <div className="space-y-4">
          {matches.map((match) => {
            const winner = getWinner(match);
            const draw = isMatchDraw(match);
            return (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{formatEventType(match.event_type)}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {formatCourt(match.court)}
                      </CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(match.status)} text-white`}>{match.status.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-0 flex-1">
                      <div>
                        <p className="text-sm text-gray-600">Players</p>
                        <p className="font-medium">{match.player1}</p>
                        <p className="font-medium">vs {match.player2}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Outcome</p>
                        {winner && (
                          <Badge className="bg-green-600 text-white">
                            <Trophy className="h-4 w-4 mr-1" />
                            {winner} Wins
                          </Badge>
                        )}
                        {draw && (
                          <Badge className="bg-gray-600 text-white">
                            <Users className="h-4 w-4 mr-1" />
                            Match Drawn
                          </Badge>
                        )}
                        {!winner && !draw && match.status === 'completed' && (
                          <Badge variant="outline" className="text-gray-500">No Result</Badge>
                        )}
                        <p className="text-sm text-gray-500">Score: {match.scores.filter(s => s.completed && s.player1_score > s.player2_score).length}-{match.scores.filter(s => s.completed && s.player2_score > s.player1_score).length}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Court & Duration</p>
                        <p className="font-medium flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {formatCourt(match.court)}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(match.duration)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Date & Time</p>
                        <p className="font-medium">{formatDate(match.date)}</p>
                        <p className="text-sm text-gray-500">
                          {match.start_time && match.end_time ? `${formatTime(match.start_time)} - ${formatTime(match.end_time)}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 mt-4 md:mt-0 md:ml-4">
                      <Link href={`/match/${match.id}`}>
                        <Button size="sm" className="w-full">View Details</Button>
                      </Link>
                      <Button size="sm" variant="outline" className="w-full">
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {matches.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search criteria or filters to find matches.</p>
              <Button onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
