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
