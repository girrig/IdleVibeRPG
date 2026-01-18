import { gameState } from "../../core/GameState";
import { InventoryView } from "./InventoryView";

export class EquipmentView {
  static render(container, selectedCharIndex) {
    container.className = "mw-content equipment-view-container";
    const char = gameState.characters[selectedCharIndex];

    container.innerHTML = `
        <div class="equipment-layout">
            <!-- Left Column: Armor -->
            <div class="equip-column left">
                <div class="equip-slot-lg" data-slot="head">
                    <span class="slot-icon">🧢</span>
                    <span class="slot-label">Head</span>
                </div>
                <div class="equip-slot-lg" data-slot="chest">
                    <span class="slot-icon">👕</span>
                    <span class="slot-label">Chest</span>
                </div>
                 <div class="equip-slot-lg" data-slot="belt">
                    <span class="slot-icon">🥋</span>
                    <span class="slot-label">Belt</span>
                </div>
                <div class="equip-slot-lg" data-slot="gloves">
                    <span class="slot-icon">🧤</span>
                    <span class="slot-label">Gloves</span>
                </div>
                <div class="equip-slot-lg" data-slot="legs">
                    <span class="slot-icon">👖</span>
                    <span class="slot-label">Legs</span>
                </div>
                <div class="equip-slot-lg" data-slot="feet">
                    <span class="slot-icon">👢</span>
                    <span class="slot-label">Feet</span>
                </div>
            </div>

            <!-- Center: Avatar -->
            <div class="equip-center">
                 <div class="equip-avatar-display">
                    <div class="equip-avatar-img" style="font-size: 128px; display: flex; justify-content: center; align-items: center;">👤</div>
                 </div>
                 <div class="equip-char-name">${char ? char.name : "Hero"}</div>
            </div>

            <!-- Right Column: Weapons & Jewelry -->
            <div class="equip-column right">
                <div class="equip-slot-lg" data-slot="mainHand">
                    <span class="slot-icon">⚔️</span>
                    <span class="slot-label">Main Hand</span>
                </div>
                <div class="equip-slot-lg" data-slot="offHand">
                    <span class="slot-icon">🛡️</span>
                    <span class="slot-label">Off Hand</span>
                </div>
                <div class="equip-row-dual">
                    <div class="equip-slot-lg" data-slot="ring1">
                        <span class="slot-icon">💍</span>
                        <span class="slot-label">Ring 1</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="ring2">
                        <span class="slot-icon">💍</span>
                        <span class="slot-label">Ring 2</span>
                    </div>
                </div>
                <div class="equip-row-dual">
                     <div class="equip-slot-lg" data-slot="trinket1">
                        <span class="slot-icon">🧿</span>
                        <span class="slot-label">Trinket 1</span>
                    </div>
                     <div class="equip-slot-lg" data-slot="trinket2">
                        <span class="slot-icon">🧿</span>
                        <span class="slot-label">Trinket 2</span>
                    </div>
                </div>
            </div>

            <!-- Far Right: Inventory Panel -->
            <div class="equip-inv-panel">
                <div class="equip-inv-header">Inventory</div>
                <div class="equip-inv-grid">
                    ${InventoryView.getInventoryHTML()}
                </div>
            </div>
        </div>
    `;
  }
}
