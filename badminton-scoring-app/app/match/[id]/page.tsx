"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Trophy, Users, Calendar } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { matchAPI } from "@/app/services/api"
import { toast } from "sonner"
import { formatDateTime, formatDate, formatCourt, formatEventType, formatElapsedTime } from "@/app/utils/formatting"

interface MatchDetails {
  id: number
  event_type: string
  match_number: string
  court: string
  player1: string
  player2: string
  date: string
  start_time: string
  end_time?: string
  duration?: string
  umpire: string
  service_judge: string
  max_points: number
  total_sets: number
  deuce_enabled: boolean
  status: "scheduled" | "live" | "completed"
  shuttles_used: number
  scores: Array<{
    set_number: number
    player1_score: number
    player2_score: number
    completed: boolean
    updated_at?: string
  }>
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

export default function MatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [match, setMatch] = useState<MatchDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMatch()

    // Set up polling for live matches
    const pollInterval = setInterval(() => {
      if (match?.status === 'live') {
        loadMatch()
      }
    }, 5000) // Poll every 5 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(pollInterval)
  }, [matchId, match?.status])

  const loadMatch = async () => {
    try {
      const response = await matchAPI.getMatch(parseInt(matchId))
      setMatch(response)
    } catch (error) {
      console.error('Failed to load match:', error)
      toast.error('Failed to load match details')
      router.push('/history')
    } finally {
      setIsLoading(false)
    }
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

  const getWinner = (match: MatchDetails) => {
    const player1Sets = match.scores.filter((set) => set.completed && set.player1_score > set.player2_score).length
    const player2Sets = match.scores.filter((set) => set.completed && set.player2_score > set.player1_score).length

    if (player1Sets > player2Sets) return match.player1
    if (player2Sets > player1Sets) return match.player2
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading match details...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Match Not Found</h2>
          <Button onClick={() => router.push('/history')}>Back to History</Button>
        </div>
      </div>
    )
  }

  const winner = getWinner(match)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.back()}>
                ← Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{match.match_number}</h1>
                <p className="text-gray-600">{formatEventType(match.event_type)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={`${getStatusColor(match.status)} text-white`}>{match.status.toUpperCase()}</Badge>
              {match.status === 'live' && match.start_time && (
                <div className="flex items-center text-lg font-mono">
                  <Clock className="h-4 w-4 mr-1" />
                  <LiveElapsedTime startTime={match.start_time} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Match Result */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Match Result</span>
                  {winner && (
                    <Badge className="bg-green-600 text-white">
                      <Trophy className="h-4 w-4 mr-1" />
                      {winner} Wins
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Players */}
                  <div className="grid grid-cols-2 gap-8">
                    <div
                      className={`text-center p-6 rounded-lg ${winner === match.player1 ? "bg-green-50 border-2 border-green-200" : "bg-gray-50"}`}
                    >
                      <h3 className="text-2xl font-bold mb-2">{match.player1}</h3>
                      <div className="text-3xl font-bold text-blue-600">
                        {match.scores.filter((set) => set.completed && set.player1_score > set.player2_score).length}
                      </div>
                      <p className="text-sm text-gray-600">Sets Won</p>
                    </div>
                    <div
                      className={`text-center p-6 rounded-lg ${winner === match.player2 ? "bg-green-50 border-2 border-green-200" : "bg-gray-50"}`}
                    >
                      <h3 className="text-2xl font-bold mb-2">{match.player2}</h3>
                      <div className="text-3xl font-bold text-red-600">
                        {match.scores.filter((set) => set.completed && set.player2_score > set.player1_score).length}
                      </div>
                      <p className="text-sm text-gray-600">Sets Won</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Set-by-Set Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Set-by-Set Breakdown</CardTitle>
                <CardDescription>Detailed score progression</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {match.scores.map((set, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">Set {set.set_number}</h4>
                        {set.completed && <Badge variant="secondary">Completed</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-gray-600">{match.player1}</p>
                          <p
                            className={`text-2xl font-bold ${set.completed && set.player1_score > set.player2_score ? "text-green-600" : "text-red-600"}`}
                          >
                            {set.player1_score}
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          <span className="text-gray-400">-</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{match.player2}</p>
                          <p
                            className={`text-2xl font-bold ${set.completed && set.player2_score > set.player1_score ? "text-green-600" : "text-red-600"}`}
                          >
                            {set.player2_score}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Match Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Match Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Match Started</p>
                      <p className="text-sm text-gray-600">{formatDateTime(match.start_time)}</p>
                    </div>
                  </div>
                  {match.scores
                    .filter((set) => set.completed)
                    .map((set, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">Set {set.set_number} Completed</p>
                          <p className="text-sm text-gray-600">
                            {set.player1_score}-{set.player2_score}
                            {set.player1_score > set.player2_score
                              ? ` (${match.player1} wins)`
                              : ` (${match.player2} wins)`}
                          </p>
                          {set.updated_at && (
                            <p className="text-xs text-gray-400">Completed at {formatDateTime(set.updated_at)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  {match.end_time && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Match Ended</p>
                        <p className="text-sm text-gray-600">{formatDateTime(match.end_time)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Match Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Match Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{formatDate(match.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Court</p>
                  <p className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {formatCourt(match.court)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {match.duration || "In Progress"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Format</p>
                  <p className="font-medium">
                    Best of {match.total_sets} to {match.max_points}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deuce</p>
                  <p className="font-medium">{match.deuce_enabled ? "Enabled" : "Disabled"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Officials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Officials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Umpire</p>
                  <p className="font-medium">{match.umpire}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Service Judge</p>
                  <p className="font-medium">{match.service_judge}</p>
                </div>
              </CardContent>
            </Card>

            {/* Match Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Shuttles Used</p>
                  <p className="font-medium">{match.shuttles_used}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Points</p>
                  <p className="font-medium">
                    {match.scores.reduce((total, set) => total + set.player1_score + set.player2_score, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Longest Set</p>
                  <p className="font-medium">
                    {Math.max(...match.scores.map((set) => set.player1_score + set.player2_score))} points
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">
                  Export Scoresheet
                </Button>
                <Button variant="outline" className="w-full">
                  Share Match
                </Button>
                <Button variant="outline" className="w-full">
                  Print Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
