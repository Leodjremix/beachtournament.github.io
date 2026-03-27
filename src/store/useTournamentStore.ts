import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, writeBatch, collection, getDocs, getDoc, onSnapshot } from 'firebase/firestore';

export type TieBreaker = 'head_to_head' | 'point_difference' | 'set_quotient';
export type MatchFormat = 'single_game' | 'home_and_away';
export type PhaseType = 'groups' | 'round_16' | 'quarter_finals' | 'semi_finals' | 'finals';

export type PhaseConfig = {
  type: PhaseType;
  matchFormat: MatchFormat;
};

export type Team = {
  id: string;
  name: string;
  players: string[]; // Lista flessibile dei partecipanti (min 2 per beach volley, ma gestito come array)
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
  nextMatchSlot?: 'team1' | 'team2'; // Indica se il vincitore va nello slot 1 o 2 del prossimo match
  isHomeAndAway?: boolean;
  legIndex?: number; // 0 per andata, 1 per ritorno
  scheduledTime?: string; // Timestamp o testo (es. "Sabato 15:30") assegnato dall'Admin
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
  updateMatchSchedule: (matchId: string, scheduledTime: string, tournamentId: string, apiKey: string) => Promise<void>;
  tournamentsList: Tournament[];
  generateKnockoutBracket: (tournamentId: string) => Promise<void>;
  archiveTournament: (tournamentId: string) => Promise<void>;
  fetchTournaments: () => Promise<void>;
  subscribeToTournament: (tournamentId: string) => () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  currentTournament: null,
  tournamentsList: [],

  setCurrentTournament: (tournament) => set({ currentTournament: tournament }),

  fetchTournaments: async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'tournaments'));
        const list = querySnapshot.docs.map(doc => doc.data() as Tournament);
        set({ tournamentsList: list });
    } catch (error) {
        console.error("Error fetching tournaments:", error);
    }
  },

  subscribeToTournament: (tournamentId: string) => {
      let unsubMatches: () => void = () => {};

      // Sottoscrizione al documento principale del torneo
      const unsubTournament = onSnapshot(doc(db, 'tournaments', tournamentId), (docSnapshot: any) => {
          if (docSnapshot.exists()) {
              const tData = docSnapshot.data() as Tournament;

              // Disiscriviti dai match precedenti se esistono, prima di crearne di nuovi
              unsubMatches();
              // Sottoscrizione ai match del torneo (ricrea ogni volta che cambia il torneo, ottimizzabile)
              unsubMatches = onSnapshot(collection(db, `tournaments/${tournamentId}/matches`), (matchesSnapshot: any) => {
                  const matches = matchesSnapshot.docs.map((mDoc: any) => mDoc.data() as Match);

                  // Ordiniamo i match dei gironi per round (legIndex)
                  matches.sort((a: Match, b: Match) => (a.legIndex || 0) - (b.legIndex || 0));

                  set({ currentTournament: { ...tData, matches } });
              });
          }
      });

      return () => {
          unsubTournament();
          unsubMatches();
      };
  },

  createTournament: async (name, scoringSystem, playoffScoringSystem, groups, qualifiersPerGroup, tieBreakers, knockoutPhases) => {
    const tournamentId = Math.random().toString(36).substring(7);
    const apiKey = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);

    const matches: Match[] = [];

    // Algoritmo Round-Robin (Circle Method) per i gironi
    groups.forEach(group => {
      // Per il circle method serve un numero pari di squadre, aggiungiamo un "dummy" se dispari
      const teams = [...group.teams];
      const hasDummy = teams.length % 2 !== 0;
      if (hasDummy) {
          teams.push({ id: 'dummy', name: 'Bye', players: [], points: 0, setsWon: 0, setsLost: 0, totalPointsScored: 0, totalPointsConceded: 0 });
      }

      const numTeams = teams.length;
      const numRounds = numTeams - 1;
      const halfSize = numTeams / 2;

      for (let round = 0; round < numRounds; round++) {
        for (let i = 0; i < halfSize; i++) {
            // Alternate home/away to ensure fairness (though less relevant for neutral beach volley)
            // It fixes potential consecutive match patterns
            const isHome = round % 2 === 0 ? i === 0 : i !== 0;
            const team1 = isHome ? teams[i] : teams[numTeams - 1 - i];
            const team2 = isHome ? teams[numTeams - 1 - i] : teams[i];

            // Se nessuna delle due è il dummy team, crea la partita
            if (team1.id !== 'dummy' && team2.id !== 'dummy') {
                matches.push({
                    id: Math.random().toString(36).substring(7),
                    phaseType: 'groups',
                    team1Id: team1.id,
                    team2Id: team2.id,
                    team1Score: [0],
                    team2Score: [0],
                    isFinished: false,
                    groupId: group.id,
                    // legIndex usato impropriamente come round marker per ordinarle nell'UI
                    legIndex: round + 1
                });
            }
        }

        // Ruota gli elementi (tranne il primo)
        // Correct implementation of standard circle method
        const elementToMove = teams.splice(1, 1)[0];
        teams.push(elementToMove);
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

  updateMatchSchedule: async (matchId, scheduledTime, tournamentId, apiKey) => {
    const batch = writeBatch(db);

    // Aggiorna la partita (Match)
    const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);
    batch.update(matchRef, { scheduledTime });

    // Aggiorna anche il documento pubblico (con i dati live grezzi)
    const publicRef = doc(db, 'public_tournaments', apiKey);
    const publicDoc = await getDoc(publicRef);
    if(publicDoc.exists()) {
        const pubData = publicDoc.data();
        const pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, scheduledTime } : m);
        batch.update(publicRef, { matches: pubMatches });
    }

    await batch.commit();
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

    // --- AVANZAMENTO AUTOMATICO FASI FINALI ---
    let updatedNextMatch: Match | null = null;
    if (!isGroupMatch && isFinished && currentMatch.nextMatchId && currentMatch.nextMatchSlot && currentMatch.team1Id && currentMatch.team2Id) {
        // Determina il vincitore
        let t1SetsWon = 0, t2SetsWon = 0;
        for (let i = 0; i < team1Score.length; i++) {
            if (team1Score[i] > team2Score[i]) t1SetsWon++;
            else if (team2Score[i] > team1Score[i]) t2SetsWon++;
        }

        let winnerId: string | null = null;
        if (t1SetsWon > t2SetsWon) winnerId = currentMatch.team1Id;
        else if (t2SetsWon > t1SetsWon) winnerId = currentMatch.team2Id;

        if (winnerId) {
            const nextMatch = tournament.matches.find(m => m.id === currentMatch.nextMatchId);
            if (nextMatch) {
                updatedNextMatch = { ...nextMatch };
                if (currentMatch.nextMatchSlot === 'team1') {
                    updatedNextMatch.team1Id = winnerId;
                } else {
                    updatedNextMatch.team2Id = winnerId;
                }
                const nextMatchRef = doc(db, `tournaments/${tournamentId}/matches`, nextMatch.id);
                batch.update(nextMatchRef, {
                    team1Id: updatedNextMatch.team1Id,
                    team2Id: updatedNextMatch.team2Id
                });
            }
        }
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
            let pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);

            // Applica anche l'avanzamento al documento pubblico per i read-only clients
            if (updatedNextMatch) {
                pubMatches = pubMatches.map((m: Match) => m.id === updatedNextMatch!.id ? { ...m, team1Id: updatedNextMatch!.team1Id, team2Id: updatedNextMatch!.team2Id } : m);
            }

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

    tournament.groups.forEach(group => {
       for(let i=0; i < Math.min(qCount, group.teams.length); i++) {
           qualifiers.push(group.teams[i]);
       }
    });

    if (!tournament.knockoutPhases || tournament.knockoutPhases.length === 0) return;

    const bracketMatches: Match[] = [];
    // Matrice temporanea per collegare i nodi dell'albero: array di array di match ids per fase
    // phasesTree[0] = ottavi, phasesTree[1] = quarti ecc.
    const phasesTree: string[][] = [];

    // --- STEP A: CREA I PLACEHOLDER PER TUTTE LE FASI (a partire dalla FINALE all'indietro o viceversa) ---
    // Procediamo dalla prima fase all'ultima per calcolare il numero di match, ma i collegamenti (nextMatchId) li facciamo man mano

    // Prima fase (i match in cui mettiamo le squadre qualificate)
    let numMatchesForCurrentPhase = qualifiers.length / 2;

    for (let pIndex = 0; pIndex < tournament.knockoutPhases.length; pIndex++) {
        const phase = tournament.knockoutPhases[pIndex];
        const currentPhaseIds: string[] = [];

        // Creiamo i match (andata o secca)
        for (let m = 0; m < numMatchesForCurrentPhase; m++) {
            const matchId = Math.random().toString(36).substring(7);
            currentPhaseIds.push(matchId);

            bracketMatches.push({
                id: matchId,
                phaseType: phase.type,
                team1Id: null, // Saranno popolati dopo per la prima fase
                team2Id: null,
                team1Score: [0],
                team2Score: [0],
                isFinished: false,
                isHomeAndAway: phase.matchFormat === 'home_and_away',
                legIndex: 0
            });

            // Gara di ritorno (per ora semplifichiamo: il nextMatchId andrà sempre agganciato alla gara "principale" o gestito diversamente, qui trattiamo il bracket standard secco)
        }

        phasesTree.push(currentPhaseIds);

        // Colleghiamo i match della fase PRECEDENTE a questa fase NUOVA
        if (pIndex > 0) {
            const previousPhaseIds = phasesTree[pIndex - 1];
            for (let i = 0; i < previousPhaseIds.length; i++) {
                // Il match 0 e 1 della fase precedente confluiscono nel match 0 di questa fase
                // Il match 2 e 3 nel match 1, ecc.
                const nextMatchIndex = Math.floor(i / 2);
                const nextMatchId = currentPhaseIds[nextMatchIndex];
                const slotIndex = (i % 2 === 0) ? 'team1' : 'team2'; // Il primo va in team1, il secondo in team2

                const prevMatchObj = bracketMatches.find(m => m.id === previousPhaseIds[i]);
                if (prevMatchObj) {
                    prevMatchObj.nextMatchId = nextMatchId;
                    prevMatchObj.nextMatchSlot = slotIndex;
                }
            }
        }

        // Dimezza per la fase successiva
        numMatchesForCurrentPhase = numMatchesForCurrentPhase / 2;
    }

    // --- STEP B: POPOLA LA PRIMA FASE CON I QUALIFICATI ---
    // Incroci standard (1° vs 4°, 2° vs 3° se 4 team)
    const firstPhaseIds = phasesTree[0];
    for (let i = 0; i < firstPhaseIds.length; i++) {
        const match = bracketMatches.find(m => m.id === firstPhaseIds[i]);
        if (match) {
            match.team1Id = qualifiers[i]?.id || null;
            match.team2Id = qualifiers[qualifiers.length - 1 - i]?.id || null;
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
  },

  archiveTournament: async (tournamentId: string) => {
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament || tournament.id !== tournamentId) return;

    const batch = writeBatch(db);

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.update(tournamentRef, { isArchived: true });

    const publicRef = doc(db, 'public_tournaments', tournament.apiKey);
    const publicDoc = await getDoc(publicRef);
    if(publicDoc.exists()) {
        batch.update(publicRef, { isArchived: true });
    }

    await batch.commit();

    set({
        currentTournament: {
            ...tournament,
            isArchived: true
        }
    });
  }
}));
