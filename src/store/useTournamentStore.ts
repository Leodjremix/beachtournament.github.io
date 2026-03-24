import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, writeBatch, collection, getDocs, getDoc } from 'firebase/firestore';

export type TieBreaker = 'head_to_head' | 'point_difference' | 'set_quotient';
export type MatchFormat = 'single_game' | 'home_and_away';
export type PhaseType = 'groups' | 'round_16' | 'quarter_finals' | 'semi_finals' | 'finals';

export type PhaseConfig = {
  type: PhaseType;
  matchFormat: MatchFormat;
};

export type Team = {
  id: string;
  player1: string;
  player2: string;
  points: number;
  setsWon: number;
  setsLost: number;
  totalPointsScored: number;
  totalPointsConceded: number;
};

export type Match = {
  id: string;
  phaseType: PhaseType;
  team1Id: string | null; // null if TBD (Waiting for previous phase)
  team2Id: string | null;
  team1Score: number[];
  team2Score: number[];
  isFinished: boolean;
  groupId?: string; // only for group stage
  nextMatchId?: string; // Per il bracket
  isHomeAndAway?: boolean;
  legIndex?: number; // 0 per andata, 1 per ritorno
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

  // Advanced Config
  qualifiersPerGroup: number;
  tieBreakers: TieBreaker[];
  knockoutPhases: PhaseConfig[];

  groups: Group[];
  matches: Match[]; // Contains both group matches and bracket matches
  apiKey: string;
  isArchived: boolean;
};

interface TournamentState {
  currentTournament: Tournament | null;
  setCurrentTournament: (tournament: Tournament | null) => void;
  createTournament: (name: string, scoring: ScoringSystem, playoffScoring: ScoringSystem, groups: Group[], qualifiersPerGroup: number, tieBreakers: TieBreaker[], knockoutPhases: PhaseConfig[]) => Promise<void>;
  updateMatchScoreRealtime: (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean, tournamentId: string, apiKey: string) => Promise<void>;
  generateKnockoutBracket: (tournamentId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  currentTournament: null,

  setCurrentTournament: (tournament) => set({ currentTournament: tournament }),

  createTournament: async (name, scoringSystem, playoffScoringSystem, groups, qualifiersPerGroup, tieBreakers, knockoutPhases) => {
    const tournamentId = Math.random().toString(36).substring(7);
    const apiKey = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);

    const matches: Match[] = [];
    groups.forEach(group => {
      const teams = group.teams;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matches.push({
            id: Math.random().toString(36).substring(7),
            phaseType: 'groups',
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
      qualifiersPerGroup,
      tieBreakers,
      knockoutPhases,
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
      qualifiersPerGroup,
      tieBreakers,
      knockoutPhases,
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

  updateMatchScoreRealtime: async (matchId, team1Score, team2Score, isFinished, tournamentId, apiKey) => {
    // 1. Leggi il torneo corrente dallo state per avere i dati di base prima del ricalcolo
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament) return;

    // Troviamo il match prima dell'aggiornamento
    const currentMatch = tournament.matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    const isGroupMatch = currentMatch.phaseType === 'groups';

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

    // --- SE E' UN MATCH DEI GIRONI, RICALCOLIAMO LA CLASSIFICA ---
    if (isGroupMatch && currentMatch.groupId) {
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        const tournamentDoc = await getDoc(tournamentRef);

        if (tournamentDoc.exists()) {
            const tData = tournamentDoc.data();

            // ==========================================
            // ALGORITMO ROBUSTO: Ricalcola intero girone da zero con Tie-Breakers
            // ==========================================
            const matchDocs = await getDocs(collection(db, `tournaments/${tournamentId}/matches`));
            const allMatches: Match[] = matchDocs.docs.map(d => d.data() as Match);
            const currentMatches = allMatches.map(m => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);

            const newGroupsCalculated = tData.groups.map((group: Group) => {
               if(group.id !== currentMatch.groupId) return group;

               const groupMatches = currentMatches.filter(m => m.groupId === currentMatch.groupId && m.isFinished);
               const newTeams = group.teams.map(team => {
                   let pts = 0;
                   let sw = 0;
                   let sl = 0;
                   let totalPtsScored = 0;
                   let totalPtsConceded = 0;

                   groupMatches.forEach(gm => {
                       let m_t1w = 0, m_t2w = 0;
                       for(let s=0; s<gm.team1Score.length; s++) {
                           const t1s = gm.team1Score[s];
                           const t2s = gm.team2Score[s];
                           if(t1s > t2s) m_t1w++;
                           else if(t2s > t1s) m_t2w++;

                           if(gm.team1Id === team.id) {
                               totalPtsScored += t1s;
                               totalPtsConceded += t2s;
                           } else if(gm.team2Id === team.id) {
                               totalPtsScored += t2s;
                               totalPtsConceded += t1s;
                           }
                       }

                       let t1p = 0, t2p = 0;
                       if (tData.scoringSystem === 'single_set') {
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

                   return { ...team, points: pts, setsWon: sw, setsLost: sl, totalPointsScored: totalPtsScored, totalPointsConceded: totalPtsConceded };
               });

               // Tie-Breakers Algorithm
               newTeams.sort((a: Team, b: Team) => {
                   // 1. Sempre Punti in Classifica
                   if (b.points !== a.points) return b.points - a.points;

                   // 2. Se pari, esegui i tie breakers in ordine scelti dall'admin
                   const tieBreakers: TieBreaker[] = tData.tieBreakers || ['head_to_head', 'point_difference', 'set_quotient'];

                   for (const tb of tieBreakers) {
                       if (tb === 'head_to_head') {
                           const h2hMatch = groupMatches.find(m =>
                               (m.team1Id === a.id && m.team2Id === b.id) ||
                               (m.team1Id === b.id && m.team2Id === a.id)
                           );
                           if (h2hMatch) {
                               let aSets = 0, bSets = 0;
                               for(let i=0; i<h2hMatch.team1Score.length; i++) {
                                   if (h2hMatch.team1Id === a.id) {
                                       if(h2hMatch.team1Score[i] > h2hMatch.team2Score[i]) aSets++; else bSets++;
                                   } else {
                                       if(h2hMatch.team2Score[i] > h2hMatch.team1Score[i]) aSets++; else bSets++;
                                   }
                               }
                               if (aSets !== bSets) return bSets - aSets; // Il vincitore passa avanti
                           }
                       } else if (tb === 'point_difference') {
                           const aDiff = a.totalPointsScored - a.totalPointsConceded;
                           const bDiff = b.totalPointsScored - b.totalPointsConceded;
                           if (aDiff !== bDiff) return bDiff - aDiff;
                       } else if (tb === 'set_quotient') {
                           const aQuot = a.setsLost === 0 ? a.setsWon : a.setsWon / a.setsLost;
                           const bQuot = b.setsLost === 0 ? b.setsWon : b.setsWon / b.setsLost;
                           if (aQuot !== bQuot) return bQuot - aQuot;
                       }
                   }

                   return 0; // Perfetta parità (rarissimo)
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
    } else {
        // Aggiorna solo il match pubbblico per i playoff
        const publicRef = doc(db, 'public_tournaments', apiKey);
        const publicDoc = await getDoc(publicRef);
        if(publicDoc.exists()) {
            const pubData = publicDoc.data();
            const pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);
            batch.update(publicRef, { matches: pubMatches });
        }
    }

    await batch.commit();
  },

  generateKnockoutBracket: async (tournamentId) => {
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament || tournament.id !== tournamentId) return;

    // 1. Estrai le squadre qualificate da ogni girone
    const qualifiers: Team[] = [];
    const qCount = tournament.qualifiersPerGroup || 2;

    // Assumiamo che i team nei group siano già ordinati (l'algoritmo li ordina ad ogni update)
    tournament.groups.forEach(group => {
       for(let i=0; i < Math.min(qCount, group.teams.length); i++) {
           qualifiers.push(group.teams[i]);
       }
    });

    // 2. Determina la prima fase a eliminazione
    if (!tournament.knockoutPhases || tournament.knockoutPhases.length === 0) return;
    const firstPhase = tournament.knockoutPhases[0];

    // 3. Genera accoppiamenti (semplificato: incrocio 1° vs ultimo qualificato)
    // Se abbiamo 8 squadre: 1 vs 8, 2 vs 7, ecc.
    // Ordiniamo tutti i qualificati (le prime di ogni girone prima, poi le seconde, ecc.)
    // Per un incrocio vero bisognerebbe comparare i primi tra di loro, per semplicità:
    const bracketMatches: Match[] = [];

    // Per evitare scontri tra stesse squadre dello stesso girone, un approccio comune è
    // invertire l'array per la seconda metà degli accoppiamenti
    const numMatches = qualifiers.length / 2;

    for (let i = 0; i < numMatches; i++) {
        const team1 = qualifiers[i];
        const team2 = qualifiers[qualifiers.length - 1 - i];

        if (firstPhase.matchFormat === 'home_and_away') {
            // Gara di andata
            bracketMatches.push({
                id: Math.random().toString(36).substring(7),
                phaseType: firstPhase.type,
                team1Id: team1?.id || null,
                team2Id: team2?.id || null,
                team1Score: [0],
                team2Score: [0],
                isFinished: false,
                isHomeAndAway: true,
                legIndex: 0
            });
            // Gara di ritorno
            bracketMatches.push({
                id: Math.random().toString(36).substring(7),
                phaseType: firstPhase.type,
                team1Id: team2?.id || null, // invertiti in casa
                team2Id: team1?.id || null,
                team1Score: [0],
                team2Score: [0],
                isFinished: false,
                isHomeAndAway: true,
                legIndex: 1
            });
        } else {
            // Gara secca
            bracketMatches.push({
                id: Math.random().toString(36).substring(7),
                phaseType: firstPhase.type,
                team1Id: team1?.id || null,
                team2Id: team2?.id || null,
                team1Score: [0],
                team2Score: [0],
                isFinished: false,
                isHomeAndAway: false
            });
        }
    }

    // Aggiungi match vuoti per le fasi successive (placeholders)
    // Così la UI può renderizzare tutto il bracket vuoto fin dall'inizio
    let currentMatchCount = numMatches;
    for (let i = 1; i < tournament.knockoutPhases.length; i++) {
        const phase = tournament.knockoutPhases[i];
        currentMatchCount = currentMatchCount / 2; // es. da 4 ottavi si passa a 2 quarti

        for(let j=0; j < currentMatchCount; j++) {
            bracketMatches.push({
                id: Math.random().toString(36).substring(7),
                phaseType: phase.type,
                team1Id: null, // TBD
                team2Id: null, // TBD
                team1Score: [0],
                team2Score: [0],
                isFinished: false,
                isHomeAndAway: phase.matchFormat === 'home_and_away',
                legIndex: 0
            });
            if (phase.matchFormat === 'home_and_away') {
                 bracketMatches.push({
                    id: Math.random().toString(36).substring(7),
                    phaseType: phase.type,
                    team1Id: null,
                    team2Id: null,
                    team1Score: [0],
                    team2Score: [0],
                    isFinished: false,
                    isHomeAndAway: true,
                    legIndex: 1
                });
            }
        }
    }

    // 4. Salva su Firestore in batch
    const batch = writeBatch(db);

    bracketMatches.forEach(match => {
      const matchRef = doc(db, `tournaments/${tournamentId}/matches`, match.id);
      batch.set(matchRef, match);
    });

    const publicRef = doc(db, 'public_tournaments', tournament.apiKey);
    const publicDoc = await getDoc(publicRef);
    if(publicDoc.exists()) {
        const pubData = publicDoc.data();
        const updatedMatches = [...pubData.matches, ...bracketMatches];
        batch.update(publicRef, { matches: updatedMatches });
    }

    await batch.commit();

    // Aggiorna lo stato locale
    set({
        currentTournament: {
            ...tournament,
            matches: [...tournament.matches, ...bracketMatches]
        }
    });
  }
}));
