import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, writeBatch, collection, getDocs, getDoc, onSnapshot } from 'firebase/firestore';

export type TieBreaker = 'points' | 'sets_won' | 'points_scored' | 'points_conceded';

export type MatchFormat = 'single_game' | 'home_and_away';

export type PhaseType = 'groups' | 'round_16' | 'quarter_finals' | 'semi_finals' | 'finals' | 'third_place';

export interface PhaseConfig {
  type: PhaseType;
  matchFormat: MatchFormat;
}

export interface QualificationRules {
  numberOfGroups: number;
  qualifiersPerGroup: number;
}

export type ScoringMode = 'single_set' | 'best_of_3';

export interface Tournament {
  id: string;
  name: string;
  groupStageMode: ScoringMode;
  knockoutMode: ScoringMode;
  isGroupStageHomeAway?: boolean;
  isKnockoutHomeAway?: boolean;
  pointsPerSetWon: number;
  qualificationRules: QualificationRules;
  tieBreakers: TieBreaker[];
  hasThirdPlaceMatch: boolean;

  groups: Group[];
  matches: Match[];
  apiKey: string;
  isArchived: boolean;
  status?: 'group_stage' | 'knockout_stage' | 'archived';
  hasKnockoutStarted?: boolean;
}

export interface Team {
  id: string;
  name: string;
  players: string[];
  points: number;
  setsWon: number;
  setsLost: number;
  totalPointsScored: number;
  totalPointsConceded: number;
}

export interface Match {
  id: string;
  phaseType: PhaseType;
  team1Id: string | null;
  team2Id: string | null;
  team1Score: number[];
  team2Score: number[];
  isFinished: boolean;
  status?: 'scheduled' | 'live' | 'finished';
  groupId?: string;
  nextMatchId?: string;
  nextMatchSlot?: 'team1' | 'team2';
  isHomeAndAway?: boolean;
  legIndex?: number;
  scheduledTime?: string; // Kept for backwards compatibility
  scheduledAt?: string; // Native datetime-local string
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
}

interface TournamentState {
  currentTournament: Tournament | null;
  tournamentsList: Tournament[];
  setCurrentTournament: (tournament: Tournament | null) => void;
  fetchTournaments: () => Promise<void>;
  deleteTournament: (tournamentId: string, apiKey: string) => Promise<void>;
  subscribeToTournament: (tournamentId: string) => () => void;
  createTournament: (name: string, groupStageMode: ScoringMode, knockoutMode: ScoringMode, isGroupStageHomeAway: boolean, isKnockoutHomeAway: boolean, pointsPerSetWon: number, qualificationRules: QualificationRules, tieBreakers: TieBreaker[], hasThirdPlaceMatch: boolean, teamsList: Team[]) => Promise<void>;
  updateMatchSchedule: (matchId: string, scheduledAt: string, tournamentId: string, apiKey: string) => Promise<void>;
  updateMatchScoreRealtime: (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean, matchStatus: 'scheduled' | 'live' | 'finished', tournamentId: string, apiKey: string) => Promise<void>;
  generateKnockoutBracket: (tournamentId: string) => Promise<void>;
  archiveTournament: (tournamentId: string) => Promise<void>;
  setManualKnockoutTeam: (matchId: string, teamId: string, slot: 'team1Id' | 'team2Id') => Promise<void>;
  updateTeamDetails: (tournamentId: string, groupId: string, teamId: string, newName: string, newPlayers: string[]) => Promise<void>;
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

  deleteTournament: async (tournamentId: string, apiKey: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'tournaments', tournamentId));
    batch.delete(doc(db, 'public_tournaments', apiKey));
    const matchesSnap = await getDocs(collection(db, `tournaments/${tournamentId}/matches`));
    matchesSnap.forEach(matchDoc => {
      batch.delete(matchDoc.ref);
    });
    await batch.commit();
    await get().fetchTournaments();
  },

  subscribeToTournament: (tournamentId: string) => {
      let unsubMatches: () => void = () => {};
      const unsubTournament = onSnapshot(doc(db, 'tournaments', tournamentId), (docSnapshot: any) => {
          if (docSnapshot.exists()) {
              const tData = docSnapshot.data() as Tournament;
              unsubMatches();
              unsubMatches = onSnapshot(collection(db, `tournaments/${tournamentId}/matches`), (matchesSnapshot: any) => {
                  const matches = matchesSnapshot.docs.map((mDoc: any) => mDoc.data() as Match);
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

  createTournament: async (
    name, groupStageMode, knockoutMode, isGroupStageHomeAway, isKnockoutHomeAway, pointsPerSetWon,
    qualificationRules, tieBreakers, hasThirdPlaceMatch, teamsList
  ) => {
    const tournamentId = Math.random().toString(36).substring(7);
    const apiKey = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);

    // 1. Random Draw (Fisher-Yates Shuffle)
    const shuffledTeams = [...teamsList];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    // 2. Distribuzione nei Gironi
    const groups: Group[] = Array.from({ length: qualificationRules.numberOfGroups }, (_, i) => ({
      id: `group_${i + 1}`,
      name: `Girone ${String.fromCharCode(65 + i)}`,
      teams: []
    }));

    shuffledTeams.forEach((team, index) => {
      groups[index % qualificationRules.numberOfGroups].teams.push(team);
    });

    // 3. Generazione Calendario Gironi (Round-Robin / Circle Method)
    const matches: Match[] = [];
    groups.forEach(group => {
      const groupTeams = [...group.teams];
      if (groupTeams.length % 2 !== 0) {
        groupTeams.push({
          id: 'dummy', name: 'Bye', players: [],
          points: 0, setsWon: 0, setsLost: 0, totalPointsScored: 0, totalPointsConceded: 0
        });
      }

      const numTeams = groupTeams.length;
      const numRounds = numTeams - 1;
      const halfSize = numTeams / 2;

      for (let round = 0; round < numRounds; round++) {
        for (let i = 0; i < halfSize; i++) {
          const isHome = round % 2 === 0 ? i === 0 : i !== 0;
          const t1 = isHome ? groupTeams[i] : groupTeams[numTeams - 1 - i];
          const t2 = isHome ? groupTeams[numTeams - 1 - i] : groupTeams[i];

          if (t1.id !== 'dummy' && t2.id !== 'dummy') {
            const matchId = Math.random().toString(36).substring(7);
            matches.push({
              id: matchId,
              phaseType: 'groups',
              team1Id: t1.id,
              team2Id: t2.id,
              team1Score: [0],
              team2Score: [0],
              isFinished: false,
              status: 'scheduled',
              groupId: group.id,
              isHomeAndAway: isGroupStageHomeAway,
              legIndex: 0
            });

            if (isGroupStageHomeAway) {
                matches.push({
                    id: Math.random().toString(36).substring(7),
                    phaseType: 'groups',
                    team1Id: t2.id,
                    team2Id: t1.id, // inverted for home/away
                    team1Score: [0],
                    team2Score: [0],
                    isFinished: false,
                    status: 'scheduled',
                    groupId: group.id,
                    isHomeAndAway: true,
                    legIndex: 1,
                    nextMatchId: matchId // links return leg to first leg
                });
            }
          }
        }
        groupTeams.splice(1, 0, groupTeams.pop()!);
      }
    });

    const newTournament: Tournament = {
      id: tournamentId,
      name,
      groupStageMode,
      knockoutMode,
      isGroupStageHomeAway,
      isKnockoutHomeAway,
      pointsPerSetWon,
      qualificationRules,
      tieBreakers,
      hasThirdPlaceMatch,
      groups,
      matches,
      apiKey,
      isArchived: false,
      status: 'group_stage',
      hasKnockoutStarted: false
    };

    const batch = writeBatch(db);
    const tournamentRef = doc(db, 'tournaments', tournamentId);

    batch.set(tournamentRef, {
      id: tournamentId,
      name,
      groupStageMode,
      knockoutMode,
      isGroupStageHomeAway,
      isKnockoutHomeAway,
      pointsPerSetWon,
      qualificationRules,
      tieBreakers,
      hasThirdPlaceMatch,
      apiKey,
      isArchived: false,
      status: 'group_stage',
      hasKnockoutStarted: false,
      groups: groups.map(g => ({ id: g.id, name: g.name, teams: g.teams }))
    });

    matches.forEach(match => {
      const matchRef = doc(db, `tournaments/${tournamentId}/matches`, match.id);
      batch.set(matchRef, match);
    });

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

  updateMatchSchedule: async (matchId, scheduledAt, tournamentId, apiKey) => {
    const batch = writeBatch(db);
    const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);
    batch.update(matchRef, { scheduledAt });

    const publicRef = doc(db, 'public_tournaments', apiKey);
    const publicDoc = await getDoc(publicRef);
    if (publicDoc.exists()) {
        const pubData = publicDoc.data();
        const pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, scheduledAt } : m);
        batch.update(publicRef, { matches: pubMatches });
    }
    await batch.commit();
  },

  updateMatchScoreRealtime: async (matchId, team1Score, team2Score, isFinished, matchStatus, tournamentId, apiKey) => {
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament) return;

    const currentMatch = tournament.matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    const isGroupMatch = currentMatch.phaseType === 'groups';

    const batch = writeBatch(db);
    const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);
    batch.update(matchRef, { team1Score, team2Score, isFinished, status: matchStatus });

    if (!isFinished) {
       // Match reopened or updated while live
    }

    let updatedNextMatch: Match | null = null;
    let thirdPlaceMatchToUpdate: Match | null = null;

    if (!isGroupMatch && currentMatch.team1Id && currentMatch.team2Id) {
        let winnerId: string | null = null;
        let loserId: string | null = null;

        if (tournament.isKnockoutHomeAway && currentMatch.legIndex === 1) {
            const firstLeg = tournament.matches.find(m => m.id === currentMatch.nextMatchId);
            if (firstLeg && firstLeg.isFinished) {
                let aggT1Score = 0;
                let aggT2Score = 0;

                firstLeg.team1Score.forEach(s => aggT2Score += s);
                firstLeg.team2Score.forEach(s => aggT1Score += s);

                team1Score.forEach(s => aggT1Score += s);
                team2Score.forEach(s => aggT2Score += s);

                if (aggT1Score > aggT2Score) {
                    winnerId = currentMatch.team1Id;
                    loserId = currentMatch.team2Id;
                } else {
                    winnerId = currentMatch.team2Id;
                    loserId = currentMatch.team1Id;
                }
            }
        } else if (!tournament.isKnockoutHomeAway) {
            let t1SetsWon = 0, t2SetsWon = 0;
            for (let i = 0; i < team1Score.length; i++) {
                if (team1Score[i] > team2Score[i]) t1SetsWon++;
                else if (team2Score[i] > team1Score[i]) t2SetsWon++;
            }
            if (t1SetsWon > t2SetsWon) { winnerId = currentMatch.team1Id; loserId = currentMatch.team2Id; }
            else if (t2SetsWon > t1SetsWon) { winnerId = currentMatch.team2Id; loserId = currentMatch.team1Id; }
        }

        if (winnerId || (!isFinished && currentMatch.isFinished)) {
            // Se stiamo rettificando una partita chiusa (riaprendola) oppure se la abbiamo appena chiusa/modificata e abbiamo un nuovo vincitore
            // Se riapriamo (!isFinished) dobbiamo "cancellare" la propagazione (togliere il vincitore dal match successivo)
            // Se rettifichiamo con risultati diversi potremmo avere un nuovo winnerId e aggiorniamo.
            // Gestiamo il reset del vincitore
            const actualWinnerId = isFinished ? winnerId : null;

            const targetNextId = tournament.isKnockoutHomeAway ?
                (tournament.matches.find(m => m.id === currentMatch.nextMatchId)?.nextMatchId) : currentMatch.nextMatchId;

            if (targetNextId) {
                const nextMatch = tournament.matches.find(m => m.id === targetNextId);
                if (nextMatch) {
                    updatedNextMatch = { ...nextMatch };
                    const slot = tournament.isKnockoutHomeAway ? tournament.matches.find(m => m.id === currentMatch.nextMatchId)?.nextMatchSlot : currentMatch.nextMatchSlot;

                    if (slot === 'team1') updatedNextMatch.team1Id = actualWinnerId;
                    else updatedNextMatch.team2Id = actualWinnerId;

                    batch.update(doc(db, `tournaments/${tournamentId}/matches`, nextMatch.id), {
                        team1Id: updatedNextMatch.team1Id,
                        team2Id: updatedNextMatch.team2Id
                    });

                    if (tournament.isKnockoutHomeAway) {
                         const nextNextReturn = tournament.matches.find(m => m.nextMatchId === nextMatch.id && m.legIndex === 1);
                         if (nextNextReturn) {
                             batch.update(doc(db, `tournaments/${tournamentId}/matches`, nextNextReturn.id), {
                                 [slot === 'team1' ? 'team2Id' : 'team1Id']: actualWinnerId
                             });
                         }
                    }
                }
            }

            if (tournament.hasThirdPlaceMatch && currentMatch.phaseType === 'semi_finals') {
                const actualLoserId = isFinished ? loserId : null;
                const thirdMatch = tournament.matches.find(m => m.phaseType === 'third_place');
                if (thirdMatch) {
                    thirdPlaceMatchToUpdate = { ...thirdMatch };
                    // We might not know which slot loser was. If it's resetting, we just reset both if it matches team1/team2. But without deep tracking, it's safer to check currentMatch's players.
                    if (thirdMatch.team1Id === currentMatch.team1Id || thirdMatch.team1Id === currentMatch.team2Id || (!thirdMatch.team1Id && actualLoserId)) {
                        thirdPlaceMatchToUpdate.team1Id = actualLoserId;
                    } else if (thirdMatch.team2Id === currentMatch.team1Id || thirdMatch.team2Id === currentMatch.team2Id || (!thirdMatch.team2Id && actualLoserId)) {
                        thirdPlaceMatchToUpdate.team2Id = actualLoserId;
                    }

                    batch.update(doc(db, `tournaments/${tournamentId}/matches`, thirdMatch.id), {
                        team1Id: thirdPlaceMatchToUpdate.team1Id,
                        team2Id: thirdPlaceMatchToUpdate.team2Id
                    });
                }
            }
        }
    }

    // Always recalculate standings if group match, even if we are un-finishing it
    if (isGroupMatch && currentMatch.groupId) {
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        const tournamentDoc = await getDoc(tournamentRef);

        if (tournamentDoc.exists()) {
            const tData = tournamentDoc.data() as Tournament;

            const matchDocs = await getDocs(collection(db, `tournaments/${tournamentId}/matches`));
            const allMatches: Match[] = matchDocs.docs.map(d => d.data() as Match);
            const currentMatches = allMatches.map(m => m.id === matchId ? { ...m, team1Score, team2Score, isFinished } : m);

            const newGroupsCalculated = tData.groups.map((group: Group) => {
               if(group.id !== currentMatch.groupId) return group;

               const groupMatches = currentMatches.filter(m => m.groupId === currentMatch.groupId && m.isFinished);
               const newTeams = group.teams.map(team => {
                   let pts = 0, sw = 0, sl = 0, totalPtsScored = 0, totalPtsConceded = 0;

                   groupMatches.forEach(gm => {
                       let m_t1w = 0, m_t2w = 0;
                       for(let s = 0; s < gm.team1Score.length; s++) {
                           const t1s = gm.team1Score[s];
                           const t2s = gm.team2Score[s];
                           if (t1s > t2s) m_t1w++;
                           else if (t2s > t1s) m_t2w++;

                           if (gm.team1Id === team.id) {
                               totalPtsScored += t1s;
                               totalPtsConceded += t2s;
                           } else if (gm.team2Id === team.id) {
                               totalPtsScored += t2s;
                               totalPtsConceded += t1s;
                           }
                       }

                       if (gm.team1Id === team.id) {
                           sw += m_t1w; sl += m_t2w;
                           pts += (m_t1w * (tData.pointsPerSetWon || 0));
                       } else if (gm.team2Id === team.id) {
                           sw += m_t2w; sl += m_t1w;
                           pts += (m_t2w * (tData.pointsPerSetWon || 0));
                       }
                   });

                   return { ...team, points: pts, setsWon: sw, setsLost: sl, totalPointsScored: totalPtsScored, totalPointsConceded: totalPtsConceded };
               });

               newTeams.sort((a: Team, b: Team) => {
                   const tieBreakers = tData.tieBreakers || ['points', 'sets_won', 'points_scored', 'points_conceded'];

                   for (const tb of tieBreakers) {
                       if (tb === 'points' && a.points !== b.points) {
                           return b.points - a.points;
                       } else if (tb === 'sets_won' && a.setsWon !== b.setsWon) {
                           return b.setsWon - a.setsWon;
                       } else if (tb === 'points_scored' && a.totalPointsScored !== b.totalPointsScored) {
                           return b.totalPointsScored - a.totalPointsScored;
                       } else if (tb === 'points_conceded' && a.totalPointsConceded !== b.totalPointsConceded) {
                           return a.totalPointsConceded - b.totalPointsConceded;
                       }
                   }
                   return 0;
               });

               return { ...group, teams: newTeams };
            });

            batch.update(tournamentRef, { groups: newGroupsCalculated });

            // IF the tournament has already started knockout phase, we MUST update the qualifiers in the first phase.
            let firstPhaseMatchesToUpdate: Match[] = [];
            if (tData.hasKnockoutStarted) {
                // Re-calculate qualifiers
                const qualifiers: Team[] = [];
                const qCount = tData.qualificationRules?.qualifiersPerGroup || 2;

                newGroupsCalculated.forEach((group: Group) => {
                   for (let i = 0; i < group.teams.length; i++) {
                       if (i < qCount) {
                           qualifiers.push({ ...group.teams[i], _originalGroupIndex: i } as any);
                       }
                   }
                });

                let totalQualifiers = qualifiers.length;
                let bracketSize = Math.pow(2, Math.ceil(Math.log2(totalQualifiers)));

                // Note: This simple reassignment assumes no wildcards or complex repêchage changed bracket size.
                // We just re-inject the newly sorted qualifiers into the first phase matches.
                // Trova la prima fase (quella in cui i team id correnti corrispondono ai team id qualificati in origine o hanno null se dummy_tie)
                // Ma più semplicemente: la prima fase è quella che ha partite giocate nei gruppi ma inserite qui.
                // Un modo robusto è prendere le partite di knockout che non hanno nessun'altra partita che punta a loro come "nextMatchId".
                const knockoutMatches = allMatches.filter(m => m.phaseType !== 'groups' && m.phaseType !== 'third_place');
                const nextMatchIds = new Set(knockoutMatches.map(m => m.nextMatchId).filter(Boolean));

                // firstPhaseMatches: quelle che NON sono puntate da nessun nextMatchId
                // Ma in realtà nel bracket generateKnockoutBracket crea nextMatchId.
                // Chi non è nextMatchId di nessuno? Le partite iniziali!
                const firstPhaseMatches = knockoutMatches.filter(m => !nextMatchIds.has(m.id) && m.legIndex === 0);

                // Ordiniamo le prime partite (di solito sono in ordine di ID o possiamo usare lo stesso ordine in cui le abbiamo create)
                // Assumiamo che siano rimaste nell'ordine corretto.
                firstPhaseMatches.sort((a,b) => a.id.localeCompare(b.id));

                for (let i = 0; i < firstPhaseMatches.length; i++) {
                    const match = firstPhaseMatches[i];
                    const t1 = qualifiers[i];
                    const t2 = qualifiers[bracketSize - 1 - i];

                    const newTeam1Id = t1?.id === 'dummy_tie' ? null : (t1?.id || null);
                    const newTeam2Id = t2?.id === 'dummy_tie' ? null : (t2?.id || null);

                    if (match.team1Id !== newTeam1Id || match.team2Id !== newTeam2Id) {
                        batch.update(doc(db, `tournaments/${tournamentId}/matches`, match.id), {
                            team1Id: newTeam1Id,
                            team2Id: newTeam2Id
                        });
                        firstPhaseMatchesToUpdate.push({ ...match, team1Id: newTeam1Id, team2Id: newTeam2Id });

                        if (tData.isKnockoutHomeAway) {
                            const returnMatch = knockoutMatches.find(m => m.nextMatchId === match.id && m.legIndex === 1);
                            if (returnMatch) {
                                batch.update(doc(db, `tournaments/${tournamentId}/matches`, returnMatch.id), {
                                    team1Id: newTeam2Id,
                                    team2Id: newTeam1Id
                                });
                                firstPhaseMatchesToUpdate.push({ ...returnMatch, team1Id: newTeam2Id, team2Id: newTeam1Id });
                            }
                        }
                    }
                }
            }

            const publicRef = doc(db, 'public_tournaments', apiKey);
            const publicDoc = await getDoc(publicRef);
            if(publicDoc.exists()) {
                const pubData = publicDoc.data();
                let pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, team1Score, team2Score, isFinished, status: matchStatus } : m);

                if (firstPhaseMatchesToUpdate.length > 0) {
                     pubMatches = pubMatches.map((m: Match) => {
                         const updated = firstPhaseMatchesToUpdate.find(u => u.id === m.id);
                         return updated ? { ...m, team1Id: updated.team1Id, team2Id: updated.team2Id } : m;
                     });
                }

                batch.update(publicRef, {
                    matches: pubMatches,
                    groups: newGroupsCalculated
                });
            }
        }
    } else {
        const publicRef = doc(db, 'public_tournaments', apiKey);
        const publicDoc = await getDoc(publicRef);
        if(publicDoc.exists()) {
            const pubData = publicDoc.data();
            let pubMatches = pubData.matches.map((m: Match) => m.id === matchId ? { ...m, team1Score, team2Score, isFinished, status: matchStatus } : m);
            if (updatedNextMatch) {
                pubMatches = pubMatches.map((m: Match) => m.id === updatedNextMatch!.id ? { ...m, team1Id: updatedNextMatch!.team1Id, team2Id: updatedNextMatch!.team2Id } : m);
            }
            if (thirdPlaceMatchToUpdate) {
                pubMatches = pubMatches.map((m: Match) => m.id === thirdPlaceMatchToUpdate!.id ? { ...m, team1Id: thirdPlaceMatchToUpdate!.team1Id, team2Id: thirdPlaceMatchToUpdate!.team2Id } : m);
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

    const qualifiers: Team[] = [];
    const nonQualifiers: Team[] = [];
    const qCount = tournament.qualificationRules?.qualifiersPerGroup || 2;

    tournament.groups.forEach(group => {
       for (let i = 0; i < group.teams.length; i++) {
           if (i < qCount) {
               qualifiers.push({ ...group.teams[i], _originalGroupIndex: i } as any);
           } else {
               nonQualifiers.push({ ...group.teams[i], _originalGroupIndex: i } as any);
           }
       }
    });

    let totalQualifiers = qualifiers.length;
    if (totalQualifiers < 2) return;

    let bracketSize = Math.pow(2, Math.ceil(Math.log2(totalQualifiers)));

    // Classifica Avulsa: Ripescaggio
    if (totalQualifiers < bracketSize) {
        const missingTeams = bracketSize - totalQualifiers;

        // Ordina i non qualificati
        nonQualifiers.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
            if (b.totalPointsScored !== a.totalPointsScored) return b.totalPointsScored - a.totalPointsScored;
            return a.totalPointsConceded - b.totalPointsConceded; // Minore è meglio
        });

        // Controlla se c'è parità assoluta al taglio (tra l'ultimo ripescato e il primo escluso)
        let hasAbsoluteTie = false;
        if (nonQualifiers.length > missingTeams) {
            const lastIn = nonQualifiers[missingTeams - 1];
            const firstOut = nonQualifiers[missingTeams];
            if (
                lastIn.points === firstOut.points &&
                lastIn.setsWon === firstOut.setsWon &&
                lastIn.totalPointsScored === firstOut.totalPointsScored &&
                lastIn.totalPointsConceded === firstOut.totalPointsConceded
            ) {
                hasAbsoluteTie = true;
            }
        }

        for (let i = 0; i < missingTeams; i++) {
            if (nonQualifiers[i]) {
                if (hasAbsoluteTie && i === missingTeams - 1) {
                     // Inseriamo un placeholder speciale per l'inserimento manuale
                     qualifiers.push({ id: 'dummy_tie', name: 'TBD (Parità)', players: [], points: 0, setsWon: 0, setsLost: 0, totalPointsScored: 0, totalPointsConceded: 0 });
                } else {
                     qualifiers.push(nonQualifiers[i]);
                }
            }
        }
        totalQualifiers = qualifiers.length;
    }

    const seeds: Team[] = [];
    for (let pos = 0; pos < qCount; pos++) {
      for (const group of tournament.groups) {
        if (group.teams[pos]) seeds.push(group.teams[pos]);
      }
    }

    const bracketMatches: Match[] = [];
    const phasesTree: string[][] = [];
    let numMatches = bracketSize / 2;
    let phaseNames: PhaseType[] = [];

    if (numMatches >= 8) phaseNames = ['round_16', 'quarter_finals', 'semi_finals', 'finals'];
    else if (numMatches >= 4) phaseNames = ['quarter_finals', 'semi_finals', 'finals'];
    else if (numMatches >= 2) phaseNames = ['semi_finals', 'finals'];
    else phaseNames = ['finals'];

    for (let pIndex = 0; pIndex < phaseNames.length; pIndex++) {
        const phaseType = phaseNames[pIndex];
        const currentPhaseIds: string[] = [];

        for (let m = 0; m < numMatches; m++) {
            const matchId = Math.random().toString(36).substring(7);
            currentPhaseIds.push(matchId);

            bracketMatches.push({
                id: matchId,
                phaseType: phaseType as any,
                team1Id: null,
                team2Id: null,
                team1Score: [0],
                team2Score: [0],
                isFinished: false,
                status: 'scheduled',
                isHomeAndAway: false,
                legIndex: 0
            });

            if (tournament.isKnockoutHomeAway) {
                const returnMatchId = Math.random().toString(36).substring(7);
                bracketMatches.push({
                    id: returnMatchId,
                    phaseType: phaseType as any,
                    team1Id: null,
                    team2Id: null,
                    team1Score: [0],
                    team2Score: [0],
                    isFinished: false,
                    status: 'scheduled',
                    isHomeAndAway: true,
                    legIndex: 1,
                    nextMatchId: matchId
                });
            }
        }

        phasesTree.push(currentPhaseIds);

        if (pIndex > 0) {
            const previousPhaseIds = phasesTree[pIndex - 1];
            for (let i = 0; i < previousPhaseIds.length; i++) {
                const nextMatchIndex = Math.floor(i / 2);
                const nextMatchId = currentPhaseIds[nextMatchIndex];
                const slotIndex = (i % 2 === 0) ? 'team1' : 'team2';

                const prevMatchObj = bracketMatches.find(m => m.id === previousPhaseIds[i]);
                if (prevMatchObj) {
                    prevMatchObj.nextMatchId = nextMatchId;
                    prevMatchObj.nextMatchSlot = slotIndex;
                }
            }
        }
        numMatches = numMatches / 2;
    }

    if (tournament.hasThirdPlaceMatch && phaseNames.includes('semi_finals')) {
        bracketMatches.push({
            id: 'third_place_match',
            phaseType: 'third_place',
            team1Id: null,
            team2Id: null,
            team1Score: [0],
            team2Score: [0],
            status: 'scheduled',
            isFinished: false
        });
    }

    const firstPhaseIds = phasesTree[0];

    // Per un vero ripescaggio, usiamo i qualifiers invece dei soli seeds per mappare tutto il tabellone se bracketSize == totalQualifiers
    // Ordiniamo qualifiers in modo da simulare un bracket standard (primo contro ultimo)
    // Semplificato: incrocio speculare su array qualifiers
    for (let i = 0; i < firstPhaseIds.length; i++) {
        const match = bracketMatches.find(m => m.id === firstPhaseIds[i]);
        if (match) {
            const t1 = qualifiers[i];
            const t2 = qualifiers[bracketSize - 1 - i];

            match.team1Id = t1?.id === 'dummy_tie' ? null : (t1?.id || null);
            match.team2Id = t2?.id === 'dummy_tie' ? null : (t2?.id || null);

            if (tournament.isKnockoutHomeAway) {
                const returnMatch = bracketMatches.find(m => m.nextMatchId === match.id && m.legIndex === 1);
                if (returnMatch) {
                    returnMatch.team1Id = match.team2Id;
                    returnMatch.team2Id = match.team1Id;
                }
            }
        }
    }

    const batch = writeBatch(db);
    bracketMatches.forEach(match => {
      batch.set(doc(db, `tournaments/${tournamentId}/matches`, match.id), match);
    });

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.update(tournamentRef, { status: 'knockout_stage', hasKnockoutStarted: true });

    const publicRef = doc(db, 'public_tournaments', tournament.apiKey);
    const publicDoc = await getDoc(publicRef);
    if (publicDoc.exists()) {
        const pubData = publicDoc.data();
        batch.update(publicRef, {
            matches: [...pubData.matches, ...bracketMatches],
            status: 'knockout_stage',
            hasKnockoutStarted: true
        });
    }

    await batch.commit();
  },

  archiveTournament: async (tournamentId: string) => {
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament || tournament.id !== tournamentId) return;

    const batch = writeBatch(db);

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.update(tournamentRef, { isArchived: true, status: 'archived' });

    const publicRef = doc(db, 'public_tournaments', tournament.apiKey);
    const publicDoc = await getDoc(publicRef);
    if(publicDoc.exists()) {
        batch.update(publicRef, { isArchived: true, status: 'archived' });
    }

    await batch.commit();

    set({
        currentTournament: {
            ...tournament,
            isArchived: true
        }
    });
  },

  setManualKnockoutTeam: async (matchId, teamId, slot) => {
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament) return;

    const batch = writeBatch(db);
    const matchRef = doc(db, `tournaments/${tournament.id}/matches`, matchId);

    batch.update(matchRef, { [slot]: teamId });

    if (tournament.isKnockoutHomeAway) {
        const firstLeg = tournament.matches.find(m => m.id === matchId);
        if (firstLeg) {
             const returnLeg = tournament.matches.find(m => m.nextMatchId === matchId && m.legIndex === 1);
             if (returnLeg) {
                 const returnSlot = slot === 'team1Id' ? 'team2Id' : 'team1Id';
                 batch.update(doc(db, `tournaments/${tournament.id}/matches`, returnLeg.id), { [returnSlot]: teamId });
             }
        }
    }

    const publicRef = doc(db, 'public_tournaments', tournament.apiKey);
    const publicDoc = await getDoc(publicRef);
    if(publicDoc.exists()) {
        const pubData = publicDoc.data();
        let pubMatches = pubData.matches.map((m: Match) => {
            if (m.id === matchId) {
                return { ...m, [slot]: teamId };
            }
            if (tournament.isKnockoutHomeAway && m.nextMatchId === matchId && m.legIndex === 1) {
                const returnSlot = slot === 'team1Id' ? 'team2Id' : 'team1Id';
                return { ...m, [returnSlot]: teamId };
            }
            return m;
        });
        batch.update(publicRef, { matches: pubMatches });
    }

    await batch.commit();
  },

  updateTeamDetails: async (tournamentId, groupId, teamId, newName, newPlayers) => {
    const state = get();
    const tournament = state.currentTournament;
    if (!tournament || tournament.id !== tournamentId) return;

    const groupIndex = tournament.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    const group = tournament.groups[groupIndex];
    const teamIndex = group.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return;

    // Create a deep copy of the groups to modify
    const newGroups = JSON.parse(JSON.stringify(tournament.groups));

    // Update the specific team's details
    newGroups[groupIndex].teams[teamIndex].name = newName;
    newGroups[groupIndex].teams[teamIndex].players = newPlayers;

    const batch = writeBatch(db);
    const tournamentRef = doc(db, 'tournaments', tournamentId);

    // Update private doc
    batch.update(tournamentRef, {
        groups: newGroups
    });

    // Update public API doc
    const publicRef = doc(db, 'public_tournaments', tournament.apiKey);
    const publicDoc = await getDoc(publicRef);
    if (publicDoc.exists()) {
        batch.update(publicRef, {
            groups: newGroups
        });
    }

    await batch.commit();
    // Let the firestore listener naturally update local state, or optionally we could aggressively update local state here
  }
}));
