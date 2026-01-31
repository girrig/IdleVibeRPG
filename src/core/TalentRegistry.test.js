import { describe, it, expect, vi } from 'vitest';
import { TALENT_DEFINITIONS, getTalentDefinition } from './TalentRegistry';

describe('TalentRegistry', () => {
    it('should retrieve a talent definition by id', () => {
        const talent = getTalentDefinition('mining_1');
        expect(talent).toBeDefined();
        expect(talent.id).toBe('mining_1');
        expect(talent.name).toBe('Sharp Pick');
    });

    it('should return undefined for non-existent talent', () => {
        const talent = getTalentDefinition('non_existent_talent');
        expect(talent).toBeUndefined();
    });

    describe('Talent Definitions', () => {
        Object.values(TALENT_DEFINITIONS).forEach((talent) => {
            it(`should have valid structure for ${talent.id}`, () => {
                expect(talent.id).toBeDefined();
                expect(talent.name).toBeDefined();
                expect(talent.description).toBeDefined();
                expect(talent.icon).toBeDefined();
                expect(talent.cost).toBeGreaterThan(0);
                expect(talent.position).toBeDefined();
                expect(typeof talent.position.row).toBe('number');
                expect(typeof talent.position.col).toBe('number');
            });
        });
    });

    describe('Talent Effects', () => {
        it('str_3 (Giant\'s Strength) should add and remove strength', () => {
            const talent = TALENT_DEFINITIONS['str_3'];
            const char = { stats: { strength: 10 } };

            talent.effect(char);
            expect(char.stats.strength).toBe(25); // 10 + 15

            talent.removeEffect(char);
            expect(char.stats.strength).toBe(10); // 25 - 15
        });

        it('str_4 (Titan\'s Grip) should add and remove strength', () => {
            const talent = TALENT_DEFINITIONS['str_4'];
            const char = { stats: { strength: 10 } };

            talent.effect(char);
            expect(char.stats.strength).toBe(30); // 10 + 20

            talent.removeEffect(char);
            expect(char.stats.strength).toBe(10); // 30 - 20
        });

        it('all talents should have no-op or valid effects', () => {
            Object.values(TALENT_DEFINITIONS).forEach((talent) => {
                const char = { stats: { strength: 10 } };
                // Should not throw when effect is called
                expect(() => talent.effect(char)).not.toThrow();

                // If removeEffect exists, it should not throw
                if (talent.removeEffect) {
                    expect(() => talent.removeEffect(char)).not.toThrow();
                }
            });
        });
    });
});
