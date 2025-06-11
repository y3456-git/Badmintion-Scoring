const API_BASE_URL = 'http://192.168.29.152:5328/api';

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.json();
  },

  checkAuth: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/check`, {
      credentials: 'include',
    });
    return response.json();
  },
};

// Match API
export const matchAPI = {
  getMatches: async (params: { status?: string } = {}) => {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${API_BASE_URL}/matches?${queryParams}`, {
      credentials: 'include',
    });
    return response.json();
  },

  getMatch: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
      credentials: 'include',
    });
    return response.json();
  },

  createMatch: async (matchData: any) => {
    const response = await fetch(`${API_BASE_URL}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(matchData),
    });
    return response.json();
  },

  updateMatch: async (matchId: number, matchData: any) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(matchData),
    });
    return response.json();
  },

  deleteMatch: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.json();
  },

  startMatch: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}/start`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.json();
  },

  endMatch: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}/end`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.json();
  },

  updateScore: async (matchId: number, scoreData: {
    player: number,  // 1 for player1, 2 for player2
    action: 'increment' | 'decrement',
    set_number: number
  }) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}/score`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(scoreData),
    });
    return response.json();
  },

  nextSet: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}/next-set`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.json();
  },

  endMatchAbruptly: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/matches/${matchId}/end-abruptly`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.json();
  },
};

// Player API
export const playerAPI = {
  getPlayers: async () => {
    const response = await fetch(`${API_BASE_URL}/players`, {
      credentials: 'include',
    });
    return response.json();
  },

  createPlayer: async (playerData: any) => {
    const response = await fetch(`${API_BASE_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(playerData),
    });
    return response.json();
  },

  updatePlayer: async (playerId: number, playerData: any) => {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(playerData),
    });
    return response.json();
  },

  deletePlayer: async (playerId: number) => {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.json();
  },
};

// Settings API
export const settingsAPI = {
  getSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      credentials: 'include',
    });
    return response.json();
  },

  updateSettings: async (settings: any) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    return response.json();
  },
};

// Stats API
export const statsAPI = {
  getDashboardStats: async () => {
    const response = await fetch(`${API_BASE_URL}/stats/dashboard`, {
      credentials: 'include',
    });
    return response.json();
  },

  getMatchStats: async (matchId: number) => {
    const response = await fetch(`${API_BASE_URL}/stats/matches/${matchId}`, {
      credentials: 'include',
    });
    return response.json();
  },
}; 