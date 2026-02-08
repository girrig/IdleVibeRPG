import { SKILL_DEFINITIONS } from "../../../core/SkillRegistry";
import { UI_COLORS, GAME_CONFIG } from "../../../core/Constants";

export class CharacterSkillsPanel {
  static render(container, char) {
    const skillsSection = document.createElement("div");
    skillsSection.className = "char-detail-section char-skills-section";
    skillsSection.innerHTML = `
        <div class="section-title">Skills</div>
        <div class="skills-grid-detail">
             ${Object.entries(char.skills)
               .map(([id, skill]) => ({
                 id,
                 skill,
                 name: id.charAt(0).toUpperCase() + id.slice(1),
               }))
               .sort((a, b) => a.name.localeCompare(b.name))
               .map(({ id, skill, name }) => {
                 const xpNeeded = skill.level * GAME_CONFIG.XP_PER_LEVEL;
                 const percent = Math.min((skill.xp / xpNeeded) * 100, 100);
                 const def = SKILL_DEFINITIONS[id.toUpperCase()];
                 const color = def ? def.color : UI_COLORS.PURCHASED; // Fallback green -> PURCHASED

                 return `
                <div class="skill-row-compact" title="${skill.xp} / ${xpNeeded} XP">
                    <div class="skill-info-compact">
                    <span class="skill-name-compact">${name}</span>
                    <span class="skill-lvl-compact">Lv ${skill.level}</span>
                    </div>
                    <div class="skill-bar-bg-compact">
                    <div class="skill-bar-fill-compact ${id}" style="width: ${percent}%; background-color: ${color}"></div>
                    </div>
                </div>
                `;
               })
               .join("")}
        </div>
    `;
    container.appendChild(skillsSection);
  }

  static update(container, char) {
    // Re-render essentially if needed, or specific DOM updates
    const skillsSection = container.querySelector(".char-skills-section");
    if (skillsSection) {
      // For now, full re-render is easiest as skill list is small
      const parent = skillsSection.parentNode;
      skillsSection.remove();
      CharacterSkillsPanel.render(parent, char);
    }
  }
}
