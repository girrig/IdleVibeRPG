import { describe, it, expect, beforeEach } from 'vitest';
import { sourceRegistry } from './SourceRegistry';

describe('SourceRegistry', () => {
    beforeEach(() => {
        // Reset if possible, or just rely on idempotency
        // The registry is a singleton exported instance.
        // We can re-initialize it safely as logic says `if (this.initialized) return;`
        // To test initialization logic, we might need to access the class or reset the flag, 
        // but since it's an instance export, we test the public API.
    });

    it('should initialize and populate sources', () => {
        sourceRegistry.initialize();
        expect(sourceRegistry.initialized).toBe(true);
        expect(Object.keys(sourceRegistry.sources).length).toBeGreaterThan(0);
    });

    it('should retrieve correct source for mining items', () => {
        const copper = sourceRegistry.getSource('copper_ore');
        expect(copper).toBeDefined();
        expect(copper.type).toBe('SKILL');
        expect(copper.skillId).toBe('MINING');
        expect(copper.target).toBe('copper_ore');
        expect(copper.reqLevel).toBe(1);

        const gold = sourceRegistry.getSource('gold_ore');
        expect(gold.reqLevel).toBe(20);
    });

    it('should retrieve correct source for mob drops (Fighting)', () => {
        // Fighting sources are keyed by DROP, not mob name
        const bone = sourceRegistry.getSource('rat_bones');
        expect(bone).toBeDefined();
        expect(bone.skillId).toBe('FIGHTING');
        expect(bone.target).toBe('rat'); // The mob needed
    });

    it('should return undefined for unknown items', () => {
        expect(sourceRegistry.getSource('invalid_item_id')).toBeUndefined();
    });
});
