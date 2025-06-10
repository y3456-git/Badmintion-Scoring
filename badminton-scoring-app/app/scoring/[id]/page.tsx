"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus, Plus, Play, Square, Trophy, Clock, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { matchAPI } from "@/app/services/api"
import { toast } from "sonner"
import { use } from "react"
import { formatCourt, formatEventType, formatDateTime, formatElapsedTime, formatDuration } from "@/app/utils/formatting"

interface MatchData {
  id: number
  event_type: string
  match_number: string
  court: string
  player1: string
  player2: string
  player1_score: number
  player2_score: number
  status: "scheduled" | "live" | "completed"
  current_set: number
  total_sets: number
  max_points: number
  deuce_enabled: boolean
  start_time: string
  end_time?: string
  duration?: string
  scores: Array<{
    set_number: number
    player1_score: number
    player2_score: number
    completed: boolean
  }>
  shuttles_used: number
}

export default function ScoringPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [match, setMatch] = useState<MatchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>("")

  useEffect(() => {
    if (resolvedParams.id) {
      loadMatch()
    }
  }, [resolvedParams.id])

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (match?.status === "live" && match.start_time) {
      const updateElapsedTime = () => {
        setElapsedTime(formatElapsedTime(match.start_time))
      }

      // Update immediately and then every second
      updateElapsedTime()
      intervalId = setInterval(updateElapsedTime, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [match?.status, match?.start_time])

  const loadMatch = async () => {
    try {
      const response = await matchAPI.getMatch(parseInt(resolvedParams.id))
      setMatch(response)
    } catch (error) {
      console.error('Failed to load match:', error)
      toast.error('Failed to load match')
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateScore = async (player: 'player1' | 'player2', action: 'increment' | 'decrement') => {
    if (!match || isUpdating) return

    setIsUpdating(true)
    try {
      const response = await matchAPI.updateScore(match.id, {
        player: player === 'player1' ? 1 : 2,
        action,
        set_number: match.current_set
      })

      if (response && !response.error) {
        await loadMatch() // Reload match data
        toast.success('Score updated')
      } else {
        toast.error(response?.message || 'Failed to update score')
      }
    } catch (error) {
      console.error('Failed to update score:', error)
      toast.error('Failed to update score. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleShuttlesUpdate = async (newValue: number) => {
    if (!match || isUpdating) return

    setIsUpdating(true)
    try {
      const response = await matchAPI.updateMatch(match.id, {
        shuttles_used: newValue
      })

      if (response && response.success) {
        await loadMatch() // Reload match data
        toast.success('Shuttles count updated')
      } else {
        toast.error(response?.message || 'Failed to update shuttles count')
      }
    } catch (error) {
      console.error('Failed to update shuttles:', error)
      toast.error('Failed to update shuttles count. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNextSet = async () => {
    if (!match || isUpdating) return

    setIsUpdating(true)
    try {
      const response = await matchAPI.nextSet(match.id)
      if (response.success) {
        await loadMatch() // Reload match data
        toast.success('Next set started')
      } else {
        toast.error(response.message || 'Failed to start next set')
      }
    } catch (error) {
      console.error('Failed to start next set:', error)
      toast.error('Failed to start next set')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEndMatch = async () => {
    if (!match || isUpdating) return

    setIsUpdating(true)
    try {
      const response = await matchAPI.endMatch(match.id)
      if (response.success) {
        toast.success('Match ended')
        router.push('/')
      } else {
        toast.error(response.message || 'Failed to end match')
      }
    } catch (error) {
      console.error('Failed to end match:', error)
      toast.error('Failed to end match')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return <div>Loading match data...</div>
  }

  if (!match) {
    return <div>Match not found</div>
  }

  const getCurrentSet = () => {
    return match.scores.find(set => set.set_number === match.current_set) || {
      set_number: match.current_set,
      player1_score: 0,
      player2_score: 0,
      completed: false
    }
  }

  const currentSet = getCurrentSet()

  const getSetWins = (player: 1 | 2) => {
    return match.scores.filter((set) => {
      if (!set.completed) return false
      return player === 1 ? set.player1_score > set.player2_score : set.player2_score > set.player1_score
    }).length
  }

  const isDeuce = () => {
    return (
      match.deuce_enabled &&
      currentSet.player1_score >= match.max_points - 1 &&
      currentSet.player2_score >= match.max_points - 1 &&
      Math.abs(currentSet.player1_score - currentSet.player2_score) < 2
    )
  }

  // Robust check for set completion
  const isCurrentSetCompleted = match.scores[match.current_set - 1]?.completed === true
  const isAnySetJustCompleted = match.scores.some((set, idx) => set.completed && idx + 1 === match.current_set)

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
                <h1 className="text-2xl font-bold text-gray-900">{match.match_number || '-'}</h1>
                <p className="text-gray-600">
                  {formatEventType(match.event_type) || 'Event'} • {formatCourt(match.court) || 'Court'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={match.status === "live" ? "bg-green-500" : "bg-gray-500"}>
                {match.status?.toUpperCase() || 'STATUS'}
              </Badge>
              {match.status === "live" && (
                <div className="flex items-center text-lg font-mono">
                  <Clock className="h-4 w-4 mr-1" />
                  {elapsedTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Scoring Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Set Scoring */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Set {match.current_set} Scoring</CardTitle>
                  {isDeuce() && <Badge variant="destructive">DEUCE</Badge>}
                </div>
                <CardDescription>
                  Playing to {match.max_points} points
                  {match.deuce_enabled && " (Deuce enabled)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Player 1 */}
                  <div className="flex items-center justify-between p-6 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-blue-600">{getSetWins(1)}</div>
                      <div>
                        <h3 className="text-xl font-semibold">{match.player1}</h3>
                        <p className="text-sm text-gray-600">Sets Won</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleUpdateScore('player1', 'decrement')}
                        disabled={currentSet.completed || match.status !== "live" || isUpdating}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="text-6xl font-bold text-blue-600 min-w-[100px] text-center">
                        {currentSet.player1_score}
                      </div>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => handleUpdateScore('player1', 'increment')}
                        disabled={currentSet.completed || match.status !== "live" || isUpdating}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="text-center text-2xl font-bold text-gray-400">VS</div>

                  {/* Player 2 */}
                  <div className="flex items-center justify-between p-6 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-red-600">{getSetWins(2)}</div>
                      <div>
                        <h3 className="text-xl font-semibold">{match.player2}</h3>
                        <p className="text-sm text-gray-600">Sets Won</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleUpdateScore('player2', 'decrement')}
                        disabled={currentSet.completed || match.status !== "live" || isUpdating}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="text-6xl font-bold text-red-600 min-w-[100px] text-center">
                        {currentSet.player2_score}
                      </div>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => handleUpdateScore('player2', 'increment')}
                        disabled={currentSet.completed || match.status !== "live" || isUpdating}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Match Controls */}
                <div className="flex justify-center space-x-4 mt-6">
                  {match.status === "scheduled" && (
                    <Button onClick={handleNextSet} className="bg-green-600 hover:bg-green-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start Match
                    </Button>
                  )}

                  {/* Show Next Set or End Match button when set is completed and match is live */}
                  {match.status === "live" && (isCurrentSetCompleted || isAnySetJustCompleted) && (
                    match.current_set < match.total_sets ? (
                      <Button onClick={handleNextSet} variant="secondary">
                        Next Set
                      </Button>
                    ) : (
                      <Button onClick={handleEndMatch} variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        End Match
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Set History */}
            <Card>
              <CardHeader>
                <CardTitle>Set History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {match.scores.map((set, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        index + 1 === match.current_set ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">Set {set.set_number}</span>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`text-lg font-bold ${set.completed && set.player1_score > set.player2_score ? "text-green-600" : set.completed && set.player1_score < set.player2_score ? "text-red-600" : ""}`}
                        >
                          {set.player1_score}
                        </span>
                        <span>-</span>
                        <span
                          className={`text-lg font-bold ${set.completed && set.player2_score > set.player1_score ? "text-green-600" : set.completed && set.player2_score < set.player1_score ? "text-red-600" : ""}`}
                        >
                          {set.player2_score}
                        </span>
                        {set.completed === true && set.player1_score > set.player2_score && (<Badge variant="secondary">Complete</Badge>)}
                        {set.completed === true && set.player1_score < set.player2_score && (<Badge variant="secondary">Complete</Badge>)}
                        {index + 1 === match.current_set && !set.completed && <Badge>Current</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Match Info Sidebar */}
          <div className="space-y-6">
            {/* Match Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Match Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Event Type</Label>
                  <p className="font-medium">{formatEventType(match.event_type) || 'Event'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Court</Label>
                  <p className="font-medium">{formatCourt(match.court) || 'Court'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Format</Label>
                  <p className="font-medium">
                    Best of {match.total_sets || '-'} sets to {match.max_points || '-'}
                  </p>
                </div>
                {match.start_time && (
                  <div>
                    <Label className="text-sm text-gray-600">Start Time</Label>
                    <p className="font-medium">{formatDateTime(match.start_time)}</p>
                  </div>
                )}
                {match.end_time && (
                  <div>
                    <Label className="text-sm text-gray-600">End Time</Label>
                    <p className="font-medium">{formatDateTime(match.end_time)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Match Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shuttles">Shuttles Used</Label>
                  <Input
                    id="shuttles"
                    type="number"
                    value={match.shuttles_used}
                    onChange={(e) => {
                      const newValue = Number.parseInt(e.target.value) || 0
                      if (match) {
                        setMatch({
                          ...match,
                          shuttles_used: newValue
                        })
                        handleShuttlesUpdate(newValue)
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Duration</Label>
                  <p className="font-medium">{formatDuration(match.duration || "")}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Current Set</Label>
                  <p className="font-medium">
                    {match.current_set || '-'} of {match.total_sets || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Switch Sides
                </Button>
                <Button variant="outline" className="w-full">
                  Add Timeout
                </Button>
                <Button variant="outline" className="w-full">
                  Add Note
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
