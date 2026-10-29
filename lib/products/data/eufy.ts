import { product, unknown, v } from "@/lib/products/build";
import type { Source } from "@/lib/products/types";

const src = (id: string, path: string): Source => ({
  id,
  url: `https://www.eufy.com/products/${path}`,
  publisher: "eufy (Anker)",
  kind: "manufacturer-page",
  accessedOn: "2026-10-28",
});

export const eufySources: Source[] = [
  src("eufy-s2-pro", "t600p181-eufy-wearable-breast-pump-s2-pro"),
  src("eufy-s2", "t600p18a-eufy-wearable-breast-pump-s2"),
];

// The pages also carry a multi-product comparison table; its battery and
// capacity rows cannot be tied to one model reliably, so they are not used.
const TABLE_NOTE = "Only listed in a multi-product comparison table that does not identify the column unambiguously.";

export const eufyProducts = [
  product({
    id: "eufy-s2-pro",
    brand: "eufy",
    model: "Wearable Breast Pump S2 Pro",
    sourceIds: ["eufy-s2-pro"],
    category: v("wearable", "eufy-s2-pro", "eufy Wearable Breast Pump S2 Pro"),
    batteryLife: unknown(TABLE_NOTE),
    maxSuction: v({ amount: 300, unit: "mmHg", comparator: "eq" }, "eufy-s2-pro", "360° wrap-around warmth and 300 mmHg suction"),
    noise: v({ amount: 46, unit: "dB", comparator: "eq" }, "eufy-s2-pro", "whisper-quiet 46 dB operation"),
    handsFree: v(true, "eufy-s2-pro", "eufy Wearable Breast Pump S2 Pro"),
    cleaning: v("5 parts to clean", "eufy-s2-pro", "With just 5 parts to clean"),
    capacity: unknown(TABLE_NOTE),
    features: v(["HeatFlow 2.0 warming, heats in 15 seconds, 7 settings"], "eufy-s2-pro", "Heating up in just 15 seconds with 7 precise settings"),
  }),
  product({
    id: "eufy-s2",
    brand: "eufy",
    model: "Wearable Breast Pump S2",
    sourceIds: ["eufy-s2"],
    category: v("wearable", "eufy-s2", "eufy Wearable Breast Pump S2"),
    batteryLife: unknown(TABLE_NOTE),
    maxSuction: v({ amount: 300, unit: "mmHg", comparator: "eq" }, "eufy-s2", "360° wrap-around warmth and 300mmHg suction"),
    noise: v({ amount: 46, unit: "dB", comparator: "eq" }, "eufy-s2", "whisper-quiet 46dB operation"),
    handsFree: v(true, "eufy-s2", "eufy Wearable Breast Pump S2"),
    cleaning: v("5 parts to clean", "eufy-s2", "With just 5 parts to clean"),
    capacity: unknown(TABLE_NOTE),
    features: v(["HeatFlow 2.0 warming, heats in 10 seconds, 7 settings"], "eufy-s2", "Heating up in just 10 seconds with 7 precise settings"),
  }),
];
