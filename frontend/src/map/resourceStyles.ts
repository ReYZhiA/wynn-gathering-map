import type { GatheringProfession } from "../types/gatheringNode";

const WOOD_RESOURCES = new Set([
  "OAK",
  "BIRCH",
  "WILLOW",
  "ACACIA",
  "SPRUCE",
  "JUNGLE",
  "DARK",
  "DARK_OAK",
  "LIGHT",
  "LIGHT_OAK",
  "PINE",
  "AVO",
  "SKY",
  "MAPLE",
  "REDWOOD",
  "DERNIC_TREE",
  "DERNIC_WOOD",
]);

const ORE_RESOURCES = new Set([
  "COPPER",
  "GRANITE",
  "GOLD",
  "SANDSTONE",
  "IRON",
  "SILVER",
  "COBALT",
  "KANDERSTONE",
  "DIAMOND",
  "VOIDSTONE",
  "DERNIC",
  "DERNIC_ORE",
  "MOLTEN",
  "MOLTEN_EEL",
  "TITANIUM",
  "CINNABAR",
]);

const CROP_RESOURCES = new Set([
  "WHEAT",
  "BARLEY",
  "OAT",
  "OATS",
  "MALT",
  "HOPS",
  "RYE",
  "MILLET",
  "DECAY",
  "DECAY_ROOT",
  "RICE",
  "SORGHUM",
  "HEMP",
  "JUTE",
  "HEATHER",
  "DERNIC_CROPS",
  "DERNIC_CROP",
]);

const FISH_RESOURCES = new Set([
  "GUDGEON",
  "TROUT",
  "SALMON",
  "CARP",
  "ICEFISH",
  "PIRANHA",
  "KOI",
  "GYLIA",
  "GYLIA_FISH",
  "BASS",
  "SUNFISH",
  "STARFISH",
  "STURGEON",
  "MAHSEER",
  "DERNIC_FISH",
]);

export function getGatheringProfession(resource: string): GatheringProfession {
  const normalized = resource.trim().toUpperCase();
  if (WOOD_RESOURCES.has(normalized)) return "WOODCUTTING";
  if (ORE_RESOURCES.has(normalized)) return "MINING";
  if (CROP_RESOURCES.has(normalized)) return "FARMING";
  if (FISH_RESOURCES.has(normalized)) return "FISHING";
  return "UNKNOWN";
}

export function getMarkerFill(resource: string): string {
  switch (getGatheringProfession(resource)) {
    case "FARMING":
      return "#f2b84b";
    case "FISHING":
      return "#48c6d9";
    case "MINING":
      return "#7ca6d8";
    case "WOODCUTTING":
      return "#4f9f5f";
    default:
      return "#f5f7fb";
  }
}

export function getGatheringProfessionLabel(profession: GatheringProfession): string {
  switch (profession) {
    case "FARMING":
      return "Farming";
    case "FISHING":
      return "Fishing";
    case "MINING":
      return "Mining";
    case "WOODCUTTING":
      return "Woodcutting";
    default:
      return "Unknown";
  }
}
