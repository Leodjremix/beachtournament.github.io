import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, writeBatch, collection, getDocs, getDoc } from 'firebase/firestore';

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
  setCurrentTournament: (tournament: Tournament | null) => void;
  createTournament: (name: string, scoring: ScoringSystem, playoffScoring: ScoringSystem, groups: Group[]) => Promise<void>;
  updateMatchScoreRealtime: (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean, groupId: string, tournamentId: string, apiKey: string, scoringSystem: ScoringSystem) => Promise<void>;
  generateApiKey: () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  currentTournament: null,

  setCurrentTournament: (tournament) => set({ currentTournament: tournament }),

  createTournament: async (name, scoringSystem, playoffScoringSystem, groups) => {
    const tournamentId = Math.random().toString(36).substring(7);
    const apiKey = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);

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

    const newTournament: Tournament = {
      id: tournamentId,
      name,
      scoringSystem,
      playoffScoringSystem,
      groups,
      matches,
      apiKey,
      isArchived: false
    };

    // Save to Firestore using a transaction or batch (here we use individual sets for simplicity in MVP, but batch is safer)
    const batch = writeBatch(db);

    // Main tournament doc
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.set(tournamentRef, {
      id: tournamentId,
      name,
      scoringSystem,
      playoffScoringSystem,
      apiKey,
      isArchived: false,
      groups: groups.map(g => ({ id: g.id, name: g.name, teams: g.teams }))
    });

    // Save matches in subcollection
    matches.forEach(match => {
      const matchRef = doc(db, `tournaments/${tournamentId}/matches`, match.id);
      batch.set(matchRef, match);
    });

    // Save to public API Collection
    const publicRef = doc(db, 'public_tournaments', apiKey);
    batch.set(publicRef, {
      tournamentId,
      name,
      groups: groups.map(g => ({ id: g.id, name: g.name, teams: g.teams })),
      matches
    });

    await batch.commit();
    set({ currentTournament: newTournament });
  },

  updateMatchScoreRealtime: async (matchId, team1Score, team2Score, isFinished, groupId, tournamentId, apiKey, scoringSystem) => {
    // 1. Leggi il torneo corrente dallo state per avere i dati di base prima del ricalcolo
    const state = get();
    if (!state.currentTournament) return;

    const batch = writeBatch(db);

    // 2. Aggiorna la partita (Match)
    const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);
    batch.update(matchRef, { team1Score, team2Score, isFinished });

    // Se non è finita, ci fermiamo qui (non ricalcoliamo i punti in classifica)
    if (!isFinished) {
       // Aggiorna anche il documento pubblico (con i dati live grezzi) - per semplicità qua facciamo un get intero del documento pubblico e riscriviamo l'array
       const publicRef = doc(db, 'public_tournaments', apiKey);
       const publicDoc = await getDoc(publicRef);
       if(publicDoc.exists()) {
           const pubData = publicDoc.data();
           const pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);
           batch.update(publicRef, { matches: pubMatches });
       }
       await batch.commit();
       return;
    }

    // --- RICALCOLO CLASSIFICA ---
    // Logica di calcolo set vinti/persi
    let t1SetsWon = 0;
    let t2SetsWon = 0;

    for(let i=0; i<team1Score.length; i++) {
        if(team1Score[i] > team2Score[i]) t1SetsWon++;
        else if (team2Score[i] > team1Score[i]) t2SetsWon++;
    }

    // Punti classifica
    // let t1Points = 0;
    // let t2Points = 0;


    // Points calc disabled here as full recalculation is below

    // 3. Aggiorna il gruppo nel documento Torneo
    // Per farlo in batch, prendiamo il vecchio gruppo, applichiamo i punti, e salviamo l'array intero.
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);

    if (tournamentDoc.exists()) {
        const tData = tournamentDoc.data();
        // const updatedGroups = [];

        // ==========================================
        // ALGORITMO ROBUSTO: Ricalcola intero girone da zero
        // ==========================================
        // Recupero tutti i match del torneo attualmente in db e aggiorno temporaneamente questo in memoria
        const matchDocs = await getDocs(collection(db, `tournaments/${tournamentId}/matches`));
        const allMatches: Match[] = matchDocs.docs.map(d => d.data() as Match);
        // sovrascrivi quello appena modificato in UI
        const currentMatches = allMatches.map(m => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);

        const newGroupsCalculated = tData.groups.map((group: Group) => {
           if(group.id !== groupId) return group;

           const groupMatches = currentMatches.filter(m => m.groupId === groupId && m.isFinished);
           const newTeams = group.teams.map(team => {
               let pts = 0;
               let sw = 0;
               let sl = 0;

               groupMatches.forEach(gm => {
                   let m_t1w = 0, m_t2w = 0;
                   for(let s=0; s<gm.team1Score.length; s++) {
                        if(gm.team1Score[s] > gm.team2Score[s]) m_t1w++;
                        else if(gm.team2Score[s] > gm.team1Score[s]) m_t2w++;
                   }

                   let t1p = 0, t2p = 0;
                   if (scoringSystem === 'single_set') {
                        if (m_t1w > m_t2w) t1p = 3; else if (m_t2w > m_t1w) t2p = 3;
                   } else {
                        if (m_t1w === 2 && m_t2w === 0) { t1p = 3; t2p = 0; }
                        else if (m_t1w === 2 && m_t2w === 1) { t1p = 2; t2p = 1; }
                        else if (m_t2w === 2 && m_t1w === 0) { t2p = 3; t1p = 0; }
                        else if (m_t2w === 2 && m_t1w === 1) { t2p = 2; t1p = 1; }
                   }

                   if(gm.team1Id === team.id) {
                       pts += t1p; sw += m_t1w; sl += m_t2w;
                   } else if(gm.team2Id === team.id) {
                       pts += t2p; sw += m_t2w; sl += m_t1w;
                   }
               });

               return { ...team, points: pts, setsWon: sw, setsLost: sl };
           });

           // Ordina la classifica
           newTeams.sort((a: Team, b: Team) => {
               if(b.points !== a.points) return b.points - a.points; // Per Punti
               if((b.setsWon - b.setsLost) !== (a.setsWon - a.setsLost)) return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost); // Differenza Set
               return 0; // Se serve si aggiunge scontro diretto / quoziente punti
           });

           return { ...group, teams: newTeams };
        });

        batch.update(tournamentRef, { groups: newGroupsCalculated });

        // 4. Aggiorna documento Pubblico Serverless
        const publicRef = doc(db, 'public_tournaments', apiKey);
        const publicDoc = await getDoc(publicRef);
        if(publicDoc.exists()) {
            const pubData = publicDoc.data();
            const pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);
            batch.update(publicRef, {
                matches: pubMatches,
                groups: newGroupsCalculated
            });
        }
    }

    await batch.commit();
  },

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
