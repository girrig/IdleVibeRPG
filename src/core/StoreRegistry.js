import { ICONS } from "./Icons.js";

export const STORE_DEFINITIONS = {
  general_store: {
    name: "General Store",
    icon: ICONS.stores.general_store,
    description: "Buy basic resources here.",
    items: [
      { id: "copper_ore", price: 5 },
      { id: "iron_ore", price: 10 },
      { id: "coal", price: 8 },
      { id: "oak_log", price: 3 },
      { id: "willow_log", price: 6 },
    ],
  },
  blacksmith: {
    name: "Blacksmith",
    icon: ICONS.stores.blacksmith,
    description: "Get your metal bars here!",
    items: [
      { id: "copper_bar", price: 15 },
      { id: "iron_bar", price: 25 },
    ],
  },
};

export function getStoreDefinition(id) {
  return STORE_DEFINITIONS[id];
}
