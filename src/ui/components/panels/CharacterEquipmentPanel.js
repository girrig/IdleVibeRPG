import { ITEM_DEFINITIONS } from "../../../core/ItemRegistry";
import { ICONS } from "../../../core/Icons";

export class CharacterEquipmentPanel {
  static render(container, char) {
    const equipSection = document.createElement("div");
    equipSection.className = "char-detail-section char-equip-section";

    // Split Layout Container
    equipSection.innerHTML = `
         <div class="section-title">Equipment</div>
         <div class="equip-split-layout">
            
            <!-- LEFT GROUP: Main Equipment (Pyramidish) -->
            <div class="equip-main-group">
                <!-- Row 1: Head -->
                <div class="equip-row">
                    <div class="mini-slot" data-slot="head" title="Head">🧢</div>
                </div>
                <!-- Row 2: Main Hand | Chest | Off Hand -->
                <div class="equip-row">
                    <div class="mini-slot" data-slot="mainHand" title="Main Hand">⚔️</div>
                    <div class="mini-slot" data-slot="chest" title="Chest">👕</div>
                    <div class="mini-slot" data-slot="offHand" title="Off Hand">🛡️</div>
                </div>
                <!-- Row 3: Gloves | Legs | Belt -->
                <div class="equip-row">
                    <div class="mini-slot" data-slot="gloves" title="Gloves">🧤</div>
                    <div class="mini-slot" data-slot="legs" title="Legs">👖</div>
                    <div class="mini-slot" data-slot="belt" title="Belt">🥋</div>
                </div>
                <!-- Row 4: Feet -->
                <div class="equip-row">
                     <div class="mini-slot" data-slot="feet" title="Feet">👢</div>
                </div>
            </div>

            <!-- RIGHT GROUP: Jewelry Column -->
            <div class="equip-jewelry-group">
                 <div class="mini-slot" data-slot="ring1" title="Ring 1">💍</div>
                 <div class="mini-slot" data-slot="ring2" title="Ring 2">💍</div>
                 <div class="mini-slot" data-slot="trinket1" title="Trinket 1">🧿</div>
                 <div class="mini-slot" data-slot="trinket2" title="Trinket 2">🧿</div>
            </div>

        </div>
    `;
    container.appendChild(equipSection);

    // Initial update
    this.update(container, char);
  }

  static update(container, char) {
    if (!char) return;

    const equipSection = container.querySelector(".char-equip-section");
    if (!equipSection) return;

    // Update Slots
    const slots = equipSection.querySelectorAll(".mini-slot");
    slots.forEach((slot) => {
      const slotName = slot.dataset.slot;
      const equippedItemId = char.equipment[slotName];

      if (equippedItemId) {
        const itemDef = ITEM_DEFINITIONS[equippedItemId];
        if (itemDef) {
          slot.innerText = itemDef.icon;
          slot.title = itemDef.name;
          slot.classList.add("equipped");
        }
      } else {
        // Reset to default icon
        const defaultIcons = {
          head: ICONS.equipSlots.head,
          chest: ICONS.equipSlots.chest,
          belt: ICONS.equipSlots.belt,
          gloves: ICONS.equipSlots.gloves,
          legs: ICONS.equipSlots.legs,
          feet: ICONS.equipSlots.feet,
          mainHand: ICONS.equipSlots.mainHand,
          offHand: ICONS.equipSlots.offHand,
          ring1: ICONS.equipSlots.ring,
          ring2: ICONS.equipSlots.ring,
          trinket1: ICONS.equipSlots.trinket,
          trinket2: ICONS.equipSlots.trinket,
        };
        const defaultLabels = {
          head: "Head",
          chest: "Chest",
          belt: "Belt",
          gloves: "Gloves",
          legs: "Legs",
          feet: "Feet",
          mainHand: "Main Hand",
          offHand: "Off Hand",
          ring1: "Ring 1",
          ring2: "Ring 2",
          trinket1: "Trinket 1",
          trinket2: "Trinket 2",
        };

        slot.innerText = defaultIcons[slotName] || ICONS.misc.locked;
        slot.title = defaultLabels[slotName];
        slot.classList.remove("equipped");
      }
    });
  }
}
