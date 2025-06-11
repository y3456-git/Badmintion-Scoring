"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, Users, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import Router from "next/router"
import { authAPI, matchAPI, playerAPI, settingsAPI } from "@/app/services/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatCourt, formatEventType, formatDate, formatTime, formatElapsedTime } from "@/app/utils/formatting"

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await authAPI.checkAuth()
      setIsLoggedIn(response.authenticated)
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/">
                <Button variant="outline">Live Dashboard</Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="schedule">Schedule Match</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Matches</TabsTrigger>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleMatchForm />
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledMatches />
          </TabsContent>

          <TabsContent value="active">
            <ActiveMatches />
          </TabsContent>

          <TabsContent value="players">
            <PlayerManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
  async function handleLogout() {
    try {
      await authAPI.logout()
      setIsLoggedIn(false)
      router.push("/")
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Failed to logout')
    }
  }
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await authAPI.login(credentials.username, credentials.password)
      if (response.success) {
        onLogin()
      } else {
        toast.error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            {/* <p className="text-sm text-gray-600 text-center">Demo: admin/admin</p> */}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function ScheduleMatchForm() {
  const [matchData, setMatchData] = useState({
    event_type: "",
    match_number: "",
    date: "",
    time: "",
    court: "",
    umpire: "",
    service_judge: "",
    max_points: 21,
    total_sets: 3,
    deuce_enabled: true,
    player1: "",
    player2: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [courtsInUse, setCourtsInUse] = useState<string[]>([])
  const [eventTypes, setEventTypes] = useState<string[]>([])

  useEffect(() => {
    // Fetch live matches to get courts in use
    const fetchLiveMatches = async () => {
      try {
        const response = await matchAPI.getMatches({ status: 'live' })
        const inUse = response.map((match: any) => match.court)
        setCourtsInUse(inUse)
      } catch (error) {
        // Optionally handle error
      }
    }

    // Fetch event types from settings
    const fetchEventTypes = async () => {
      try {
        const settings = await settingsAPI.getSettings()
        const types = settings.default_event_types?.split(',') || []
        setEventTypes(types)
      } catch (error) {
        console.error('Failed to fetch event types:', error)
        toast.error('Failed to load event types')
      }
    }

    fetchLiveMatches()
    fetchEventTypes()
  }, [])

  // List of all courts
  const allCourts = [
    { value: "court1", label: "Court 1" },
    { value: "court2", label: "Court 2" },
    { value: "court3", label: "Court 3" },
    { value: "court4", label: "Court 4" },
  ]

  // Filter out courts in use
  const availableCourts = allCourts.filter(court => !courtsInUse.includes(court.value))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await matchAPI.createMatch(matchData)
      if (response.success) {
        toast.success('Match scheduled successfully')
        // Reset form
        setMatchData({
          event_type: "",
          match_number: "",
          date: "",
          time: "",
          court: "",
          umpire: "",
          service_judge: "",
          max_points: 21,
          total_sets: 3,
          deuce_enabled: true,
          player1: "",
          player2: "",
        })
      } else {
        toast.error(response.message || 'Failed to schedule match')
      }
    } catch (error) {
      console.error('Failed to schedule match:', error)
      toast.error('Failed to schedule match')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Schedule New Match
        </CardTitle>
        <CardDescription>Set up a new badminton match</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={matchData.event_type}
                onValueChange={(value) => setMatchData((prev) => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((eventType) => (
                    <SelectItem key={eventType} value={eventType}>
                      {formatEventType(eventType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="match_number">Match Number</Label>
              <Input
                id="match_number"
                value={matchData.match_number}
                onChange={(e) => setMatchData((prev) => ({ ...prev, match_number: e.target.value }))}
                placeholder="e.g., MS-001"
              />
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={matchData.date}
                onChange={(e) => setMatchData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={matchData.time}
                onChange={(e) => setMatchData((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="court">Court</Label>
              <Select
                value={matchData.court}
                onValueChange={(value) => setMatchData((prev) => ({ ...prev, court: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourts.map((court) => (
                    <SelectItem key={court.value} value={court.value}>{court.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="umpire">Umpire</Label>
              <Input
                id="umpire"
                value={matchData.umpire}
                onChange={(e) => setMatchData((prev) => ({ ...prev, umpire: e.target.value }))}
                placeholder="Umpire name"
              />
            </div>

            <div>
              <Label htmlFor="service_judge">Service Judge</Label>
              <Input
                id="service_judge"
                value={matchData.service_judge}
                onChange={(e) => setMatchData((prev) => ({ ...prev, service_judge: e.target.value }))}
                placeholder="Service judge name"
              />
            </div>

            <div>
              <Label htmlFor="max_points">Max Points per Set</Label>
              <Select
                value={matchData.max_points.toString()}
                onValueChange={(value) => setMatchData((prev) => ({ ...prev, max_points: Number.parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="11">11 Points</SelectItem>
                  <SelectItem value="15">15 Points</SelectItem>
                  <SelectItem value="21">21 Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="total_sets">Total Sets</Label>
              <Select
                value={matchData.total_sets.toString()}
                onValueChange={(value) => setMatchData((prev) => ({ ...prev, total_sets: Number.parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Best of 1</SelectItem>
                  <SelectItem value="3">Best of 3</SelectItem>
                  <SelectItem value="5">Best of 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="deuce_enabled"
              checked={matchData.deuce_enabled}
              onCheckedChange={(checked) => setMatchData((prev) => ({ ...prev, deuce_enabled: checked as boolean }))}
            />
            <Label htmlFor="deuce_enabled">Enable Deuce</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="player1">Player/Team 1</Label>
              <Input
                id="player1"
                value={matchData.player1}
                onChange={(e) => setMatchData((prev) => ({ ...prev, player1: e.target.value }))}
                placeholder="Player or team name"
              />
            </div>

            <div>
              <Label htmlFor="player2">Player/Team 2</Label>
              <Input
                id="player2"
                value={matchData.player2}
                onChange={(e) => setMatchData((prev) => ({ ...prev, player2: e.target.value }))}
                placeholder="Player or team name"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Scheduling...' : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Match
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
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

function ScheduledMatches() {
  const [matches, setMatches] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      const response = await matchAPI.getMatches({ status: 'scheduled' })
      setMatches(response)
    } catch (error) {
      console.error('Failed to load matches:', error)
      toast.error('Failed to load matches')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartMatch = async (matchId: number) => {
    try {
      const response = await matchAPI.startMatch(matchId)
      if (response.success) {
        toast.success('Match started')
        loadMatches()
      } else {
        toast.error(response.message || 'Failed to start match')
      }
    } catch (error) {
      console.error('Failed to start match:', error)
      toast.error('Failed to start match')
    }
  }

  const handleDeleteMatch = async (matchId: number) => {
    try {
      const response = await matchAPI.deleteMatch(matchId)
      if (response.success) {
        toast.success('Match deleted')
        loadMatches()
      } else {
        toast.error(response.message || 'Failed to delete match')
      }
    } catch (error) {
      console.error('Failed to delete match:', error)
      toast.error('Failed to delete match')
    }
  }

  if (isLoading) {
    return <div>Loading matches...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scheduled Matches</h3>
        <Badge variant="secondary">{matches.length} Scheduled</Badge>
      </div>
      <div className="grid gap-4">
        {matches.map((match: any) => (
          <Card key={match.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-semibold">Match #{match.match_number || '-'}</h4>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" /> Scheduled
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{formatEventType(match.event_type) || 'Event'}</span> • <span>{formatCourt(match.court) || 'Court'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{match.player1 || 'Player 1'}</span> vs <span className="font-medium">{match.player2 || 'Player 2'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Scheduled for {formatDate(match.date)} at {formatTime(match.time)}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 items-end">
                  <Button 
                    size="sm" 
                    onClick={() => handleStartMatch(match.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Start Match
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteMatch(match.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ActiveMatches() {
  const [matches, setMatches] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      const response = await matchAPI.getMatches({ status: 'live' })
      setMatches(response)
    } catch (error) {
      console.error('Failed to load matches:', error)
      toast.error('Failed to load matches')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndMatch = async (matchId: number) => {
    try {
      const response = await matchAPI.endMatch(matchId)
      if (response.success) {
        toast.success('Match ended')
        loadMatches()
      } else {
        toast.error(response.message || 'Failed to end match')
      }
    } catch (error) {
      console.error('Failed to end match:', error)
      toast.error('Failed to end match')
    }
  }

  if (isLoading) {
    return <div>Loading matches...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Active Matches</h3>
        <Badge variant="secondary">{matches.length} Live</Badge>
      </div>
      <div className="grid gap-4">
        {matches.map((match: any) => (
          <Card key={match.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-semibold">Match #{match.match_number || '-'}</h4>
                    <Badge className="bg-green-500 text-white">LIVE</Badge>
                    {match.start_time && (
                      <span className="flex items-center text-xs font-mono ml-2">
                        <Clock className="h-3 w-3 mr-1" />
                        <LiveElapsedTime startTime={match.start_time} />
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{formatEventType(match.event_type) || 'Event'}</span> • <span>{formatCourt(match.court) || 'Court'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{match.player1 || 'Player 1'}</span> vs <span className="font-medium">{match.player2 || 'Player 2'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Started at {match.start_time ? formatDate(match.start_time) + ' ' + formatTime(match.start_time) : '-'} • Set {match.current_set || 1}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 items-end">
                  <Link href={`/scoring/${match.id}`}>
                    <Button size="sm">Score</Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEndMatch(match.id)}
                  >
                    End Match
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PlayerManagement() {
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    try {
      const response = await playerAPI.getPlayers()
      setPlayers(response)
    } catch (error) {
      console.error('Failed to load players:', error)
      toast.error('Failed to load players')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePlayer = async (playerId: number) => {
    try {
      const response = await playerAPI.deletePlayer(playerId)
      if (response.success) {
        toast.success('Player deleted')
        loadPlayers()
      } else {
        toast.error(response.message || 'Failed to delete player')
      }
    } catch (error) {
      console.error('Failed to delete player:', error)
      toast.error('Failed to delete player')
    }
  }

  if (isLoading) {
    return <div>Loading players...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Player Management
        </CardTitle>
        <CardDescription>Manage players and teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Player
          </Button>

          <div className="border rounded-lg">
            <div className="grid grid-cols-3 gap-4 p-4 border-b font-semibold">
              <span>Name</span>
              <span>Team</span>
              <span>Actions</span>
            </div>
            {players.map((player: any) => (
              <div key={player.id} className="grid grid-cols-3 gap-4 p-4 border-b last:border-b-0">
                <span>{player.name}</span>
                <span>{player.team}</span>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeletePlayer(player.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SystemSettings() {
  const [settings, setSettings] = useState({
    default_max_points: "21",
    default_total_sets: "3",
    default_deuce_enabled: "1",
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.getSettings()
      setSettings(response)
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await settingsAPI.updateSettings(settings)
      if (response.success) {
        toast.success('Settings saved')
      } else {
        toast.error(response.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    }
  }

  if (isLoading) {
    return <div>Loading settings...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          System Settings
        </CardTitle>
        <CardDescription>Configure system-wide settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label>Default Match Settings</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="default_points">Default Points per Set</Label>
                <Select 
                  value={settings.default_max_points}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, default_max_points: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11">11 Points</SelectItem>
                    <SelectItem value="15">15 Points</SelectItem>
                    <SelectItem value="21">21 Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="default_sets">Default Total Sets</Label>
                <Select 
                  value={settings.default_total_sets}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, default_total_sets: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Best of 1</SelectItem>
                    <SelectItem value="3">Best of 3</SelectItem>
                    <SelectItem value="5">Best of 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="auto_deuce" 
              checked={settings.default_deuce_enabled === "1"}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                default_deuce_enabled: checked ? "1" : "0" 
              }))}
            />
            <Label htmlFor="auto_deuce">Enable Deuce by Default</Label>
          </div>

          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  )
}
