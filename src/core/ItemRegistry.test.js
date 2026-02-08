import { describe, it, expect } from 'vitest';
import { ITEM_DEFINITIONS, getItemDefinition } from './ItemRegistry';
import { ICONS } from './Icons';

describe('ItemRegistry', () => {
    it('should return valid definition for known item', () => {
        const def = getItemDefinition('copper_ore');
        expect(def.name).toBe('Copper Ore');
        expect(def.category).toBe('Ore');
        expect(def.value).toBe(5);
    });

    it('should return default structure for unknown item', () => {
        const id = 'unknown_thing';
        const def = getItemDefinition(id);
        expect(def.name).toBe(id);
        expect(def.icon).toBe(ICONS.misc.unknown);
        expect(def.value).toBeUndefined();
    });

    it('all defined items should have required fields', () => {
        Object.entries(ITEM_DEFINITIONS).forEach(([id, def]) => {
            expect(def.name).toBeDefined();
            expect(def.icon).toBeDefined();
            expect(def.category).toBeDefined();
            // Value is optional? Code implies it usually exists but let's check basic structure
        });
    });
});
