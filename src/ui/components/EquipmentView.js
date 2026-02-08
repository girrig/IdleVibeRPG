import { gameState } from "../../core/GameState";
import { ICONS } from "../../core/Icons";
import { InventoryView } from "./InventoryView";

export class EquipmentView {
  constructor() {
    this.container = null;
    this.selectedCharIndex = 0;
  }

  render(container, selectedCharIndex) {
    this.container = container;
    this.selectedCharIndex = selectedCharIndex || 0;
    container.className = "mw-content equipment-view-container";

    // Initial Skeleton Render
    const char = gameState.characters[this.selectedCharIndex];

    container.innerHTML = `
        <div class="equipment-layout">
            <div class="equip-main-area">
                <!-- Left Column: Armor -->
                <div class="equip-column left">
                    <div class="equip-slot-lg" data-slot="head">
                        <span class="slot-icon">${ICONS.equipSlots.head}</span>
                        <span class="slot-label">Head</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="chest">
                        <span class="slot-icon">${ICONS.equipSlots.chest}</span>
                        <span class="slot-label">Chest</span>
                    </div>
                     <div class="equip-slot-lg" data-slot="belt">
                        <span class="slot-icon">${ICONS.equipSlots.belt}</span>
                        <span class="slot-label">Belt</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="gloves">
                        <span class="slot-icon">${ICONS.equipSlots.gloves}</span>
                        <span class="slot-label">Gloves</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="legs">
                        <span class="slot-icon">${ICONS.equipSlots.legs}</span>
                        <span class="slot-label">Legs</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="feet">
                        <span class="slot-icon">${ICONS.equipSlots.feet}</span>
                        <span class="slot-label">Feet</span>
                    </div>
                </div>

                <!-- Center: Avatar -->
                <div class="equip-center">
                     <div class="equip-avatar-display">
                        <div class="equip-avatar-img" style="font-size: 128px; display: flex; justify-content: center; align-items: center;">${ICONS.equipSlots.avatar}</div>
                     </div>
                     <div class="equip-char-name">${char ? char.name : "Hero"}</div>
                </div>

                <!-- Right Column: Weapons & Jewelry -->
                <div class="equip-column right">
                    <div class="equip-slot-lg" data-slot="mainHand">
                        <span class="slot-icon">${ICONS.equipSlots.mainHand}</span>
                        <span class="slot-label">Main Hand</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="offHand">
                        <span class="slot-icon">${ICONS.equipSlots.offHand}</span>
                        <span class="slot-label">Off Hand</span>
                    </div>
                    <div class="equip-row-dual">
                        <div class="equip-slot-lg" data-slot="ring1">
                            <span class="slot-icon">${ICONS.equipSlots.ring}</span>
                            <span class="slot-label">Ring 1</span>
                        </div>
                        <div class="equip-slot-lg" data-slot="ring2">
                            <span class="slot-icon">${ICONS.equipSlots.ring}</span>
                            <span class="slot-label">Ring 2</span>
                        </div>
                    </div>
                    <div class="equip-row-dual">
                         <div class="equip-slot-lg" data-slot="trinket1">
                            <span class="slot-icon">${ICONS.equipSlots.trinket}</span>
                            <span class="slot-label">Trinket 1</span>
                        </div>
                         <div class="equip-slot-lg" data-slot="trinket2">
                            <span class="slot-icon">${ICONS.equipSlots.trinket}</span>
                            <span class="slot-label">Trinket 2</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Far Right: Inventory Panel -->
            <div class="equip-inv-panel">
                <div class="equip-inv-header">Inventory</div>
                <!-- Reusing .inventory-grid class for styling consistency -->
                <div class="inventory-grid"></div>
            </div>
        </div>
    `;

    this.update();
  }

  update() {
    if (!this.container) return;

    // Update Character Name (if changed)
    const char = gameState.characters[this.selectedCharIndex];
    if (char) {
      const nameEl = this.container.querySelector(".equip-char-name");
      if (nameEl && nameEl.innerText !== char.name) {
        nameEl.innerText = char.name;
      }
    }

    // Update Inventory Grid (Reused Logic)
    this.updateInventoryGrid();
  }

  updateInventoryGrid() {
    const grid = this.container.querySelector(".inventory-grid");
    if (!grid) return;
    InventoryView.reconcileGrid(grid, gameState.inventory.items);
  }
}
