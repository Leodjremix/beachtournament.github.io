import { describe, it, expect } from 'vitest';
import { shuffleArray, generateRandomGroups } from './tournamentLogic';
import type { Team } from '../store/useTournamentStore';

describe('tournamentLogic', () => {
    describe('shuffleArray', () => {
        it('should return an array of the same length', () => {
            const arr = [1, 2, 3, 4, 5];
            const shuffled = shuffleArray(arr);
            expect(shuffled.length).toBe(arr.length);
        });

        it('should contain the same elements', () => {
             const arr = ['a', 'b', 'c'];
             const shuffled = shuffleArray(arr);
             expect(shuffled).toContain('a');
             expect(shuffled).toContain('b');
             expect(shuffled).toContain('c');
        });
    });

    describe('generateRandomGroups', () => {
        const createDummyTeams = (count: number): Team[] => {
            return Array.from({length: count}, (_, i) => ({
                id: `t${i}`,
                name: `Team ${i}`,
                players: [`P1-${i}`, `P2-${i}`],
                points: 10,
                setsWon: 5,
                setsLost: 2,
                totalPointsScored: 100,
                totalPointsConceded: 80
            }));
        };

        it('should handle zero groups', () => {
            const teams = createDummyTeams(5);
            expect(generateRandomGroups(teams, 0)).toEqual([]);
        });

        it('should distribute teams perfectly evenly if divisible', () => {
            const teams = createDummyTeams(8);
            const groups = generateRandomGroups(teams, 2);

            expect(groups.length).toBe(2);
            expect(groups[0].teams.length).toBe(4);
            expect(groups[1].teams.length).toBe(4);
        });

        it('should distribute teams with 1 extra remainder correctly', () => {
             const teams = createDummyTeams(9);
             const groups = generateRandomGroups(teams, 2);

             // First group should have 5, second should have 4
             expect(groups.length).toBe(2);
             expect(groups[0].teams.length).toBe(5);
             expect(groups[1].teams.length).toBe(4);
        });

        it('should distribute teams with 2 extra remainders correctly', () => {
             const teams = createDummyTeams(11);
             const groups = generateRandomGroups(teams, 3);

             // 11 % 3 = 2. Group 0 gets +1, Group 1 gets +1, Group 2 gets +0.
             // So 4, 4, 3
             expect(groups.length).toBe(3);
             expect(groups[0].teams.length).toBe(4);
             expect(groups[1].teams.length).toBe(4);
             expect(groups[2].teams.length).toBe(3);
        });

        it('should reset team stats', () => {
             const teams = createDummyTeams(2);
             const groups = generateRandomGroups(teams, 1);

             const teamInGroup = groups[0].teams[0];
             expect(teamInGroup.points).toBe(0);
             expect(teamInGroup.setsWon).toBe(0);
             expect(teamInGroup.setsLost).toBe(0);
             expect(teamInGroup.totalPointsScored).toBe(0);
             expect(teamInGroup.totalPointsConceded).toBe(0);
        });
    });
});
