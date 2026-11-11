import { brandWide, product, v } from "@/lib/products/build";
import type { Source } from "@/lib/products/types";

const src = (id: string, path: string): Source => ({
  id,
  url: `https://www.evenflofeeding.com/products/${path}`,
  publisher: "Evenflo Feeding",
  kind: "manufacturer-page",
  accessedOn: "2026-10-28",
});

export const evenfloSources: Source[] = [
  src("evenflo-advanced-double", "advanced-double-electric-breast-pump"),
  src("evenflo-deluxe-advanced-double", "deluxe-advanced-double-electric-breast-pump"),
  src("evenflo-advanced-single", "advanced-single-electric-breast-pump"),
  src("evenflo-advanced-manual", "advanced-manual-breast-pump"),
  src("evenflo-pocket", "pocket-double-electric-breast-pump"),
];

const DOUBLE_CLOSED = "Closed system design helps prevent milk back up in tubing and motor to keep parts clean, dry, and functioning properly.";
const FAMILY_PARTS = "All Evenflo Feeding Advanced Breast Pumps have interchangeable parts, flanges, collection bottles";
const flangeBottle = (sourceId: string) =>
  v(["flanges-and-bottles" as const], sourceId, "Includes two flange sizes to help you have a more comfortable, effective pumping session.", brandWide(sourceId, FAMILY_PARTS));

// The Advanced and Deluxe Advanced pages share identical feature copy and do not
// state how the two differ, so neither is recorded as a variant of the other.
export const evenfloProducts = [
  product({
    id: "evenflo-advanced-double-electric",
    brand: "Evenflo",
    model: "Advanced Double Electric",
    sourceIds: ["evenflo-advanced-double"],
    mechanism: v("electric", "evenflo-advanced-double", "Advanced Double Electric Breast Pump"),
    collection: flangeBottle("evenflo-advanced-double"),
    pumping: v("single-or-double", "evenflo-advanced-double", "Closed system, pump single or double mode"),
    powerSources: v(["mains", "aa-batteries"], "evenflo-advanced-double", "This full-time use breast pump uses an AC adapter or 6 AA batteries."),
    closedSystem: v(true, "evenflo-advanced-double", DOUBLE_CLOSED),
    features: v(["Independent speed and suction controls"], "evenflo-advanced-double", "Independent speed and suction controls"),
  }),
  product({
    id: "evenflo-deluxe-advanced-double-electric",
    brand: "Evenflo",
    model: "Deluxe Advanced Double Electric",
    sourceIds: ["evenflo-deluxe-advanced-double"],
    mechanism: v("electric", "evenflo-deluxe-advanced-double", "Deluxe Advanced Double Electric Breast Pump"),
    collection: flangeBottle("evenflo-deluxe-advanced-double"),
    pumping: v("single-or-double", "evenflo-deluxe-advanced-double", "Closed system, pump single or double mode"),
    powerSources: v(["mains", "aa-batteries"], "evenflo-deluxe-advanced-double", "This full-time use breast pump uses an AC adapter or 6 AA batteries."),
    closedSystem: v(true, "evenflo-deluxe-advanced-double", DOUBLE_CLOSED),
    features: v(["Independent speed and suction controls"], "evenflo-deluxe-advanced-double", "Independent speed and suction controls"),
  }),
  product({
    id: "evenflo-advanced-single-electric",
    brand: "Evenflo",
    model: "Advanced Single Electric",
    sourceIds: ["evenflo-advanced-single"],
    mechanism: v("electric", "evenflo-advanced-single", "Advanced Single Electric Breast Pump"),
    collection: v(["flanges-and-bottles"], "evenflo-advanced-single", "Includes multiple flange sizes (28.0mm & 30.5mm)"),
    pumping: v("single", "evenflo-advanced-single", "Advanced Single Electric Breast Pump"),
    powerSources: v(["mains", "aa-batteries"], "evenflo-advanced-single", "This portable pump has multiple power options‚ AC Adapter, AA Batteries (sold separately)"),
    closedSystem: v(true, "evenflo-advanced-single", "Closed system design helps prevent milk back up in pump motor keeping parts clean, dry and functioning properly."),
    features: v(["Designed for occasional use"], "evenflo-advanced-single", "Designed for Occasional-Use Pumping"),
  }),
  product({
    id: "evenflo-advanced-manual",
    brand: "Evenflo",
    model: "Advanced Manual",
    sourceIds: ["evenflo-advanced-manual"],
    mechanism: v("manual", "evenflo-advanced-manual", "Advanced Manual Breast Pump"),
    collection: v(["flanges-and-bottles"], "evenflo-advanced-manual", "Includes multiple flange sizes (24.5mm & 30.5mm)"),
    features: v(["Designed for occasional use"], "evenflo-advanced-manual", "Designed for occasional-use pumping"),
  }),
  product({
    id: "evenflo-pocket-double-electric",
    brand: "Evenflo",
    model: "Pocket Portable Double Electric",
    sourceIds: ["evenflo-pocket"],
    mechanism: v("electric", "evenflo-pocket", "Pocket Portable Double Electric Breast Pump"),
    collection: flangeBottle("evenflo-pocket"),
    pumping: v("double", "evenflo-pocket", "Pocket Portable Double Electric Breast Pump"),
    powerSources: v(["built-in-battery"], "evenflo-pocket", "Compact and portable with rechargeable battery"),
    portability: v(["pocket-or-bag-sized", "clip-or-lanyard"], "evenflo-pocket", "The new, full-time use breast pump fits in any bag and clips to your waistband."),
    suctionLevels: v("9 suction levels, 6 speeds, 3 memory presets", "evenflo-pocket", "Pump your way with 9 suction levels, 6 speed settings, and 3 memory presents"),
    closedSystem: v(true, "evenflo-pocket", DOUBLE_CLOSED),
  }),
];
