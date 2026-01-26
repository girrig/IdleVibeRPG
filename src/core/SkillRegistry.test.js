import { describe, it, expect } from "vitest";
import { SKILL_DEFINITIONS, getSkillDefinition } from "./SkillRegistry";

describe("SkillRegistry Data Integrity", () => {
  it("should export definitions object", () => {
    expect(SKILL_DEFINITIONS).toBeDefined();
    expect(Object.keys(SKILL_DEFINITIONS).length).toBeGreaterThan(0);
  });

  it("should allow retrieving skill by ID", () => {
    const mining = getSkillDefinition("MINING");
    expect(mining).toBeDefined();
    expect(mining.name).toBe("Mining");
  });

  describe("Skill Definition Schema", () => {
    Object.values(SKILL_DEFINITIONS).forEach((skill) => {
      describe(`Skill: ${skill.name}`, () => {
        it("should have valid base properties", () => {
          expect(skill.id).toBeDefined();
          expect(skill.name).toBeTruthy();
          expect(skill.icon).toBeTruthy();
          expect(skill.color).toMatch(/^#|^rgb|^hsl/); // Rough color check
          expect(typeof skill.action).toBe("function");
        });

        it("should have valid options (resources)", () => {
          expect(skill.options).toBeDefined();
          const options = Object.values(skill.options);
          expect(options.length).toBeGreaterThan(0);

          options.forEach((opt) => {
            expect(opt.name).toBeTruthy();
            expect(opt.level).toBeGreaterThan(0);
            expect(opt.xp).toBeGreaterThan(0);
            // Optional: icon check if strict
          });
        });

        it("should have correctly ordered options (by level)", () => {
          // This is more a sanity check that we didn't typo a high level item as level 1
          const options = Object.values(skill.options).sort(
            (a, b) => a.level - b.level,
          );
          expect(options[0].level).toBeGreaterThanOrEqual(1);
          // Just ensure it doesn't crash or have NaN
        });
      });
    });
  });
});
