import type { Team, Group } from '../store/useTournamentStore';

/**
 * Mescola un array in modo randomico utilizzando l'algoritmo di Fisher-Yates.
 * @param array L'array da mescolare (non viene mutato l'originale se clonato prima).
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Distribuisce equamente le squadre in un numero specificato di gironi.
 * Se le squadre non sono perfettamente divisibili, le squadre in avanzo vengono
 * distribuite una ad una a partire dal primo girone.
 *
 * @param teams L'array di squadre (Teams)
 * @param numGroups Il numero di gironi desiderato
 * @returns Array di Group pronti per essere salvati (i teams sono azzerati nei punteggi)
 */
export const generateRandomGroups = (teams: Team[], numGroups: number): Group[] => {
  if (numGroups <= 0) return [];
  if (teams.length === 0) return [];

  // Mescola l'array di squadre in modo randomico
  const shuffledTeams = shuffleArray(teams);

  // Inizializza i gironi
  const groups: Group[] = Array.from({ length: numGroups }, (_, index) => {
    // Genera un nome per il girone (Girone A, Girone B, ecc.)
    const groupName = `Girone ${String.fromCharCode(65 + index)}`;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      name: groupName,
      teams: [],
    };
  });

  // Distribuisci le squadre una alla volta nei gironi (Round Robin distribution per bilanciare i resti)
  shuffledTeams.forEach((team, index) => {
    const groupIndex = index % numGroups;

    // Azzeriamo i punteggi per sicurezza (per il nuovo torneo)
    const freshTeam: Team = {
      ...team,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      totalPointsScored: 0,
      totalPointsConceded: 0,
    };

    groups[groupIndex].teams.push(freshTeam);
  });

  return groups;
};

/**
 * Calcola il numero di nodi base (potenza di 2 successiva o uguale) necessari per un tabellone a eliminazione diretta.
 */
const getNextPowerOfTwo = (n: number): number => {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

/**
 * Genera l'albero del tabellone a eliminazione diretta (Knockout Stage).
 * Gestisce automaticamente i "Bye" se il numero di squadre non è una potenza di 2.
 * Ritorna un array di Match pronti per essere inseriti nello store.
 *
 * @param qualifiers Array delle squadre qualificate
 * @param hasThirdPlaceMatch Flag per generare la "Finalina" per il 3° e 4° posto
 * @returns Array di Match
 */
export const generateKnockoutBracket = (
  qualifiers: Team[],
  hasThirdPlaceMatch: boolean = false
) => {
  const numTeams = qualifiers.length;
  if (numTeams === 0) return [];

  const bracketSize = getNextPowerOfTwo(numTeams);
  const numByes = bracketSize - numTeams;

  // Nomi delle fasi
  const getPhaseName = (size: number): import('../store/useTournamentStore').PhaseType => {
    if (size === 2) return 'finals';
    if (size === 4) return 'semi_finals';
    if (size === 8) return 'quarter_finals';
    if (size === 16) return 'round_16';
    return 'finals'; // Default fallback, but generally the app only supports up to 16/32
  };

  const bracketMatches: import('../store/useTournamentStore').Match[] = [];
  const phasesTree: string[][] = [];

  // 1. Creiamo la struttura del tabellone vuota (dall'ultima fase alla prima)
  let currentRoundSize = 2; // Partiamo dalla finale (2 squadre)
  while (currentRoundSize <= bracketSize) {
    const phaseName = getPhaseName(currentRoundSize);
    const numMatchesInPhase = currentRoundSize / 2;
    const currentPhaseIds: string[] = [];

    for (let i = 0; i < numMatchesInPhase; i++) {
      const matchId = `match_${phaseName}_${i}_${Math.random().toString(36).substring(7)}`;
      currentPhaseIds.push(matchId);

      bracketMatches.push({
        id: matchId,
        phaseType: phaseName,
        team1Id: null,
        team2Id: null,
        team1Score: [0],
        team2Score: [0],
        isFinished: false,
        legIndex: 0 // Usato per ordinare, 0 in eliminazione diretta
      });
    }

    phasesTree.push(currentPhaseIds);
    currentRoundSize *= 2;
  }

  // 2. Colleghiamo i match (nextMatchId e nextMatchSlot)
  // phasesTree[0] = final, phasesTree[1] = semi_finals, ecc.
  for (let pIndex = 1; pIndex < phasesTree.length; pIndex++) {
    const currentPhaseIds = phasesTree[pIndex];
    const nextPhaseIds = phasesTree[pIndex - 1]; // "next" temporalmente, che nell'albero è quello precedente

    for (let i = 0; i < currentPhaseIds.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const nextMatchId = nextPhaseIds[nextMatchIndex];
      const slotIndex = (i % 2 === 0) ? 'team1' : 'team2';

      const matchObj = bracketMatches.find(m => m.id === currentPhaseIds[i]);
      if (matchObj) {
        matchObj.nextMatchId = nextMatchId;
        matchObj.nextMatchSlot = slotIndex;
      }
    }
  }

  // Seleziona l'id della prima fase (es. quarti se 8 squadre)
  const firstPhaseIds = phasesTree[phasesTree.length - 1];

  // 3. Distribuisci le squadre qualificate e i Bye
  // Posizionamento stile "tennis": Teste di serie opposte
  // Semplificato: Team 1 (index 0) vs Team N (index numTeams -1)
  // Per gestire i Bye, mettiamo i Bye alle teste di serie più alte (i primi indici)
  let qIndex = 0;
  let bIndex = 0;

  for (let i = 0; i < firstPhaseIds.length; i++) {
    const match = bracketMatches.find(m => m.id === firstPhaseIds[i]);
    if (match) {
        // Assegna il primo slot
        match.team1Id = qualifiers[qIndex]?.id || null;
        qIndex++;

        // Assegna il secondo slot (avversario o Bye)
        // I Bye vanno ai team più forti.
        if (bIndex < numByes) {
            match.team2Id = 'dummy_bye'; // Segnaposto per il Bye
            bIndex++;
            // Se c'è un bye, il match è automaticamente finito e il team1 passa
            match.isFinished = true;
            // Esegui l'avanzamento fittizio del team1 al turno successivo
            if (match.nextMatchId && match.nextMatchSlot) {
                const nextMatch = bracketMatches.find(m => m.id === match.nextMatchId);
                if (nextMatch) {
                   if (match.nextMatchSlot === 'team1') nextMatch.team1Id = match.team1Id;
                   else nextMatch.team2Id = match.team1Id;
                }
            }
        } else {
            // Se non c'è bye, prendi l'ultima squadra dal fondo per incrociare (1° vs ultimo)
            match.team2Id = qualifiers[numTeams - 1 - (i - numByes)]?.id || null;
        }
    }
  }

  // 4. Gestione della Finalina (3° / 4° posto)
  if (hasThirdPlaceMatch && bracketSize >= 4) { // Ha senso solo se abbiamo almeno le semifinali
      const semiFinalsIds = phasesTree[1]; // Indice 0 è finale, indice 1 è semifinale
      if (semiFinalsIds && semiFinalsIds.length === 2) {
          const finalinaId = `match_third_place_${Math.random().toString(36).substring(7)}`;

          bracketMatches.push({
            id: finalinaId,
            phaseType: 'finals', // Tecnicamente è una finale di consolazione
            team1Id: null, // Saranno riempiti quando le semifinali finiscono
            team2Id: null,
            team1Score: [0],
            team2Score: [0],
            isFinished: false,
            legIndex: 1 // Indice 1 per distinguerla dalla finale vera
          });

          // In una vera app modificheresti updateMatchScoreRealtime per gestire
          // chi perde la semifinale e mandarlo in `finalinaId`, ma qui creiamo la struttura base.
          // Impostiamo un flag custom o usiamo il campo nextMatchId in modo speculare,
          // ma per l'algoritmo di generazione puro basta l'entry.
      }
  }

  return bracketMatches;
};
