import { describe, it, expect } from 'vitest';
import { shuffleArray, generateRandomGroups, generateKnockoutBracket } from './tournamentLogic';
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

    describe('generateKnockoutBracket', () => {
        const createDummyTeams = (count: number): Team[] => {
            return Array.from({length: count}, (_, i) => ({
                id: `t${i}`,
                name: `Team ${i}`,
                players: [`P1-${i}`, `P2-${i}`],
                points: 0,
                setsWon: 0,
                setsLost: 0,
                totalPointsScored: 0,
                totalPointsConceded: 0
            }));
        };

        it('should generate a perfect 4-team bracket', () => {
            const teams = createDummyTeams(4);
            const matches = generateKnockoutBracket(teams);

            // 4 teams -> 2 semis + 1 final = 3 matches
            expect(matches.length).toBe(3);

            const finals = matches.filter(m => m.phaseType === 'finals');
            const semis = matches.filter(m => m.phaseType === 'semi_finals');

            expect(finals.length).toBe(1);
            expect(semis.length).toBe(2);

            // All teams should be placed in semis (no byes)
            expect(semis[0].team1Id).toBe('t0');
            expect(semis[0].team2Id).toBe('t3'); // 1st vs 4th
            expect(semis[1].team1Id).toBe('t1');
            expect(semis[1].team2Id).toBe('t2'); // 2nd vs 3rd

            // Semis should link to final
            expect(semis[0].nextMatchId).toBe(finals[0].id);
            expect(semis[1].nextMatchId).toBe(finals[0].id);
        });

        it('should handle 6 teams (not power of 2) with Byes', () => {
            const teams = createDummyTeams(6);
            const matches = generateKnockoutBracket(teams);

            // Next power of 2 is 8. Bracket size 8 means: 4 quarters + 2 semis + 1 final = 7 matches
            expect(matches.length).toBe(7);

            const quarters = matches.filter(m => m.phaseType === 'quarter_finals');
            expect(quarters.length).toBe(4);

            // 8 slots - 6 teams = 2 Byes
            // The top 2 seeds (t0 and t1) should get the Byes
            expect(quarters[0].team1Id).toBe('t0');
            expect(quarters[0].team2Id).toBe('dummy_bye');
            expect(quarters[0].isFinished).toBe(true); // Automatically finishes

            expect(quarters[1].team1Id).toBe('t1');
            expect(quarters[1].team2Id).toBe('dummy_bye');
            expect(quarters[1].isFinished).toBe(true);

            // Remaining 4 teams should face each other
            expect(quarters[2].team1Id).toBe('t2');
            expect(quarters[2].team2Id).toBe('t5');
            expect(quarters[2].isFinished).toBe(false);

            expect(quarters[3].team1Id).toBe('t3');
            expect(quarters[3].team2Id).toBe('t4');
            expect(quarters[3].isFinished).toBe(false);

            // Top seeds should automatically advance to semis
            const semis = matches.filter(m => m.phaseType === 'semi_finals');
            expect(semis[0].team1Id).toBe('t0'); // t0 advances
            expect(semis[0].team2Id).toBe('t1'); // Wait, check the indexing. Next match slot logic
        });

        it('should include 3rd place match if requested', () => {
            const teams = createDummyTeams(4);
            const matches = generateKnockoutBracket(teams, true);

            // 2 semis + 1 final + 1 third_place = 4 matches
            expect(matches.length).toBe(4);

            const finals = matches.filter(m => m.phaseType === 'finals');
            expect(finals.length).toBe(2); // One main final, one 3rd place final

            // 3rd place match has legIndex 1
            const thirdPlaceMatch = finals.find(m => m.legIndex === 1);
            expect(thirdPlaceMatch).toBeDefined();
        });

        it('should handle zero teams', () => {
             const matches = generateKnockoutBracket([]);
             expect(matches).toEqual([]);
        });
    });
});
