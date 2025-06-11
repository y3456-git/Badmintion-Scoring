// Court formatting
export const formatCourt = (court: string) => {
  return court.replace('court', 'Court ')
}

// Event type formatting
export const formatEventType = (eventType: string) => {
  // Convert backend format to display format
  return eventType
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Available options
export const availableCourts = ['court1', 'court2', 'court3', 'court4']

// Format match number
export const formatMatchNumber = (matchNumber: string) => {
  return matchNumber.toUpperCase()
}

// Format duration
export const formatDuration = (duration: string) => {
  if (!duration) return 'N/A'
  return duration
}

// Format date
export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format time
export const formatTime = (time: string) => {
  if (!time) return 'N/A'
  return new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Format datetime
export const formatDateTime = (datetime: string) => {
  if (!datetime) return 'N/A'
  return new Date(datetime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Format elapsed time from start time
export const formatElapsedTime = (startTime: string) => {
  if (!startTime) return 'N/A'
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
} 