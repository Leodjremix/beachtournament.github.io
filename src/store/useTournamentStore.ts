import { create } from 'zustand';

export type Team = {
  id: string;
  player1: string;
  player2: string;
  points: number;
  setsWon: number;
  setsLost: number;
};

export type Match = {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score: number[];
  team2Score: number[];
  isFinished: boolean;
  groupId?: string;
};

export type Group = {
  id: string;
  name: string;
  teams: Team[];
};

export type ScoringSystem = 'single_set' | 'best_of_3';

export type Tournament = {
  id: string;
  name: string;
  scoringSystem: ScoringSystem;
  playoffScoringSystem: ScoringSystem;
  groups: Group[];
  matches: Match[];
  apiKey: string;
  isArchived: boolean;
};

interface TournamentState {
  currentTournament: Tournament | null;
  isAdmin: boolean;
  setAdmin: (isAdmin: boolean) => void;
  createTournament: (name: string, scoring: ScoringSystem, playoffScoring: ScoringSystem, groups: Group[]) => void;
  updateMatchScore: (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean) => void;
  generateApiKey: () => void;
}

const mockGroups = [
  {
    id: 'g1',
    name: 'Girone A',
    teams: [
      { id: 't1', player1: 'Mario', player2: 'Luigi', points: 3, setsWon: 1, setsLost: 0 },
      { id: 't2', player1: 'Paolo', player2: 'Francesca', points: 0, setsWon: 0, setsLost: 1 },
      { id: 't3', player1: 'Anna', player2: 'Marco', points: 0, setsWon: 0, setsLost: 0 }
    ]
  }
];

const mockMatches = [
  {
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    team1Score: [21],
    team2Score: [18],
    isFinished: true,
    groupId: 'g1'
  },
  {
    id: 'm2',
    team1Id: 't1',
    team2Id: 't3',
    team1Score: [0],
    team2Score: [0],
    isFinished: false,
    groupId: 'g1'
  }
];

export const useTournamentStore = create<TournamentState>((set) => ({
  // Dati di esempio per lo sviluppo
  currentTournament: {
    id: 'tourney-1',
    name: 'Beach Volley Summer Cup',
    scoringSystem: 'single_set',
    playoffScoringSystem: 'best_of_3',
    groups: mockGroups,
    matches: mockMatches,
    apiKey: 'demo-api-key-123',
    isArchived: false
  },
  isAdmin: true, // Simulo l'accesso admin per default

  setAdmin: (isAdmin) => set({ isAdmin }),

  createTournament: (name, scoringSystem, playoffScoringSystem, groups) => set(() => {
    // Generate match schedule automatically for groups (round-robin)
    const matches: Match[] = [];
    groups.forEach(group => {
      const teams = group.teams;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matches.push({
            id: Math.random().toString(36).substring(7),
            team1Id: teams[i].id,
            team2Id: teams[j].id,
            team1Score: [0],
            team2Score: [0],
            isFinished: false,
            groupId: group.id
          });
        }
      }
    });

    return {

    currentTournament: {
      id: Math.random().toString(36).substring(7),
      name,
      scoringSystem,
      playoffScoringSystem,
      groups,
      matches,
      apiKey: Math.random().toString(36).substring(7),
      isArchived: false
    }
  };
  }),

  updateMatchScore: (matchId, team1Score, team2Score, isFinished) => set((state) => {
    if (!state.currentTournament) return state;

    const newMatches = state.currentTournament.matches.map(match =>
      match.id === matchId ? { ...match, team1Score, team2Score, isFinished } : match
    );

    return {
      currentTournament: {
        ...state.currentTournament,
        matches: newMatches
      }
    };
  }),

  generateApiKey: () => set((state) => {
    if (!state.currentTournament) return state;
    return {
      currentTournament: {
        ...state.currentTournament,
        apiKey: Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7)
      }
    }
  })
}));
