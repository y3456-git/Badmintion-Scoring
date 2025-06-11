"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Users, Trophy, Feather } from "lucide-react"
import Link from "next/link"
import { formatDateTime, formatCourt, formatEventType, formatElapsedTime } from "@/app/utils/formatting"

interface LiveMatch {
  id: number
  event_type: string
  match_number: string
  court: string
  player1: string
  player2: string
  current_set: number
  scores: Array<{
    set_number: number
    player1_score: number
    player2_score: number
  }>
  status: "live" | "completed" | "scheduled"
  start_time?: string
}

// LiveElapsedTime component for per-match timer
function LiveElapsedTime({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState<string>(formatElapsedTime(startTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(startTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return <>{elapsed}</>
}

export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [stats, setStats] = useState({
    liveMatches: 0,
    completedToday: 0,
    activeCourts: 0,
    avgDuration: "0m"
  })

  useEffect(() => {
    // Fetch live matches from /api/matches route
    const fetchLiveMatches = async () => {
      try {
        const response = await fetch('http://192.168.29.152:5328/api/matches?status=live', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (Array.isArray(data)) {
          setLiveMatches(data)
        } else {
          console.error('Expected array of matches but got:', data)
          setLiveMatches([])
        }
      } catch (error) {
        console.error('Error fetching live matches:', error)
        setLiveMatches([])
      }
    }

    // Fetch match statistics from /api/stats/dashboard route
    const fetchStats = async () => {
      try {
        const response = await fetch('http://192.168.29.152:5328/api/stats/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setStats({
          liveMatches: data.live_matches || 0,
          completedToday: data.completed_today || 0,
          activeCourts: data.active_courts || 0,
          avgDuration: data.avg_duration || '0m'
        })
      } catch (error) {
        console.error('Error fetching match statistics:', error)
      }
    }

    // Initial fetch
    fetchLiveMatches()
    fetchStats()

    // Set up polling for live updates
    const liveMatchesInterval = setInterval(() => {
      fetchLiveMatches()
    }, 5000) // Update live matches every 5 seconds

    // Set up polling for stats (less frequent)
    const statsInterval = setInterval(() => {
      fetchStats()
    }, 5000) // Update stats every 30 seconds

    return () => {
      clearInterval(liveMatchesInterval)
      clearInterval(statsInterval)
    }
  }, [])

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

  const getServingPlayer = (match: LiveMatch) => {
    if (match.status === 'live') {
      const currentSetScores = match.scores.find(set => set.set_number === match.current_set);
      if (currentSetScores) {
        if (currentSetScores.player1_score > currentSetScores.player2_score) return 1;
        if (currentSetScores.player2_score > currentSetScores.player1_score) return 2;
        // If tied, or no points, for simplicity, default to player 1 for display
        if (currentSetScores.player1_score > 0 || currentSetScores.player2_score > 0) return 1;
      }
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Badminton Live Scoring</h1>
            </div>
            <nav className="flex space-x-4">
              <Link href="/admin">
                <Button variant="outline">Admin Panel</Button>
              </Link>
              <Link href="/history">
                <Button variant="outline">Match History</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Matches</h2>
          <p className="text-gray-600">Follow the action in real-time</p>
        </div>

        {/* Live Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {liveMatches.map((match) => (
            <Card key={match.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{formatEventType(match.event_type) || 'Event'}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {formatCourt(match.court) || 'Court'}
                    </CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(match.status)} text-white`}>{match.status?.toUpperCase() || 'LIVE'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Match Info */}
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Match #{match.match_number || '-'}</span>
                    {match.start_time && (
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <LiveElapsedTime startTime={match.start_time} />
                      </span>
                    )}
                  </div>

                  {/* Players */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center">
                        {match.player1 || 'Player 1'}
                        {getServingPlayer(match) === 1 && match.status === 'live' && (
                          <Feather className="ml-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </span>
                      <span className="text-lg font-bold">
                        {match.scores && match.scores[match.current_set - 1] ? match.scores[match.current_set - 1].player1_score : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center">
                        {match.player2 || 'Player 2'}
                        {getServingPlayer(match) === 2 && match.status === 'live' && (
                          <Feather className="ml-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </span>
                      <span className="text-lg font-bold">
                        {match.scores && match.scores[match.current_set - 1] ? match.scores[match.current_set - 1].player2_score : 0}
                      </span>
                    </div>
                  </div>

                  {/* Set Scores */}
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Set History</span>
                      <span>Set {match.current_set || 1}</span>
                    </div>
                    <div className="flex space-x-2">
                      {match.scores && match.scores.length > 0 ? (
                        match.scores.map((score, index) => (
                          <div key={index} className="text-xs bg-gray-100 rounded px-2 py-1">
                            {score.player1_score}-{score.player2_score}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400">No sets</div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link href={`/match/${match.id}`}>
                    <Button className="w-full" variant="outline">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Live Matches</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.liveMatches}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Courts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCourts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgDuration}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
