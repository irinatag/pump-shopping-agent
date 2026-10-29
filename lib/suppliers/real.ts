import type { ListingObservation, RealSupplier } from "@/lib/suppliers/types";

export const realSuppliers: RealSupplier[] = [
  {
    id: "aeroflow",
    name: "Aeroflow Breastpumps",
    provenance: "real",
    website: "https://aeroflowbreastpumps.com",
    listings: {
      status: "collected",
      method:
        "Names and product URLs only, from pages robots.txt allows (the /breast-pumps/ listing and sitemap.xml). No prices: displayed retail prices are not insurance costs.",
    },
  },
  {
    id: "yummy-mummy",
    name: "Yummy Mummy",
    provenance: "real",
    website: "https://yummymummystore.com",
    listings: {
      status: "not-collected",
      reason:
        "Terms of service prohibit copying site content without prior written consent, and robots.txt disallows the insurer/region listing pages.",
    },
  },
];

const OBSERVED_ON = "2026-10-28";
const LISTING_PAGE = "https://aeroflowbreastpumps.com/breast-pumps/";
const SITEMAP = "https://aeroflowbreastpumps.com/media/sitemap/sitemap.xml";
const AEROFLOW = "https://aeroflowbreastpumps.com/";

/** Shown on page 1 of the Aeroflow listing; name is verbatim from that page. */
const onListingPage = (productId: string, slug: string, listingName: string): ListingObservation => ({
  supplierId: "aeroflow",
  productId,
  listingName,
  listingUrl: AEROFLOW + slug,
  observedOn: OBSERVED_ON,
  evidence: { kind: "listing-page", sourceUrl: LISTING_PAGE, quote: listingName },
});

/** Product URL present in Aeroflow's sitemap; listing name derived from the slug. */
const inSitemap = (productId: string, slug: string, listingName: string): ListingObservation => ({
  supplierId: "aeroflow",
  productId,
  listingName,
  listingUrl: AEROFLOW + slug,
  observedOn: OBSERVED_ON,
  evidence: { kind: "sitemap", sourceUrl: SITEMAP },
});

export const listingObservations: ListingObservation[] = [
  onListingPage("babybuddha-3", "baby-buddha-3-0-breast-pump", "BabyBuddha 3.0 Breast Pump"),
  onListingPage("eufy-s2-pro", "eufy-s2-pro-wearable-breast-pump", "Eufy S2 Pro Wearable Breast Pump"),
  onListingPage("eufy-s2", "eufy-s2-wearable-breast-pump", "Eufy S2 Wearable Breast Pump"),
  onListingPage("lansinoh-discreetduo-flow", "lansinoh-discreet-duo-flow-wearable-breast-pump", "Lansinoh DiscreetDuo™ Flow Wearable Breast Pump"),
  onListingPage("medela-freestyle-mini-hands-free", "medela-freestyle-mini-hands-free-breast-pump", "Medela Freestyle™ Mini Hands-free Breast Pump"),
  onListingPage("medela-melody-inbra", "medela-melody-inbra-wearable-breast-pump", "Medela Melody InBra™ Wearable Breast Pump"),
  onListingPage("medela-motion-inbra", "medela-motion-inbra-wearable-breast-pump", "Medela Motion InBra™ Wearable Breast Pump"),
  onListingPage("medela-pump-in-style-pro-plus-hands-free", "medela-pump-in-style-pro-plus-hands-free-breast-pump", "Medela Pump In Style® Pro+ Hands-free Breast Pump"),
  onListingPage("medela-pump-in-style-pro-plus-traditional", "medela-pump-in-style-pro-plus-traditional-breast-pump", "Medela Pump In Style® Pro+ Traditional Breast Pump"),
  onListingPage("medela-pump-in-style-pro", "medela-pump-in-style-pro-breast-pump", "Medela Pump in Style® Pro Breast Pump"),
  onListingPage("momcozy-m5-smart", "momcozy-m5-smart-wearable-breast-pump", "Momcozy M5 Smart Wearable Breast Pump"),
  onListingPage("momcozy-wellness-1", "momcozy-wellness-1-warm-massage-wearable-breast-pump", "Momcozy Wellness 1 Warm-Massage Wearable Breast Pump"),
  onListingPage("motif-aura-glow", "motif-aura-glow-wearable-breast-pump", "Motif Aura Glow® Wearable Breast Pump"),
  onListingPage("motif-roam", "motif-roam-breast-pump", "Motif Roam® Breast Pump"),
  onListingPage("spectra-s1-plus", "spectra-s1-plus-double-electric-breast-pump", "Spectra S1 Plus Breast Pump"),
  onListingPage("willow-go", "willow-go-wearable-double-electric-breast-pump", "Willow Go Wearable Breast Pump"),
  onListingPage("zomee-fit", "zomee-fit-wearable-breast-pump", "Zomee Fit Wearable Breast Pump"),
  onListingPage("zomee-mothers-nature-h1", "zomee-mothers-nature-h1-breast-pump", "Zomee Mother’s Nature™ H1 Breast Pump"),

  inSitemap("ameda-mya-joy-plus", "ameda-mya-joy-plus-double-electric-breast-pump", "Ameda Mya Joy Plus Double Electric Breast Pump"),
  inSitemap("babybuddha-wearable", "baby-buddha-wearable-breast-pump", "BabyBuddha Wearable Breast Pump"),
  inSitemap("elvie-curve", "elvie-curve-manual-breast-pump", "Elvie Curve Manual Breast Pump"),
  inSitemap("elvie-pump", "elvie-pump-double-electric-breast-pump", "Elvie Pump Double Electric Breast Pump"),
  inSitemap("elvie-stride", "elvie-stride-double-electric-breast-pump", "Elvie Stride Double Electric Breast Pump"),
  inSitemap("evenflo-advanced-double-electric", "evenflo-advanced-double-electric-breast-pump", "Evenflo Advanced Double Electric Breast Pump"),
  inSitemap("evenflo-advanced-manual", "evenflo-advanced-manual-breast-pump", "Evenflo Advanced Manual Breast Pump"),
  inSitemap("evenflo-deluxe-advanced-double-electric", "evenflo-deluxe-advanced-double-electric-breast-pump", "Evenflo Deluxe Advanced Double Electric Breast Pump"),
  inSitemap("evenflo-advanced-single-electric", "evenflo-single-electric-breast-pump", "Evenflo Single Electric Breast Pump"),
  inSitemap("lansinoh-manual", "lansinoh-manual-breast-pump", "Lansinoh Manual Breast Pump"),
  inSitemap("lansinoh-naturalwave", "lansinoh-natural-wave-breast-pump", "Lansinoh NaturalWave Breast Pump"),
  inSitemap("lansinoh-thrive-2-in-1", "lansinoh-thrive-2-in-1-breast-pump", "Lansinoh Thrive 2-in-1 Breast Pump"),
  inSitemap("lansinoh-wearable", "lansinoh-wearable-breast-pump", "Lansinoh Wearable Breast Pump"),
  inSitemap("medela-freestyle-hands-free", "medela-freestyle-hands-free-double-electric-breast-pump", "Medela Freestyle Hands-free Double Electric Breast Pump"),
  inSitemap("medela-harmony", "medela-harmony-manual-breast-pump", "Medela Harmony Manual Breast Pump"),
  inSitemap("medela-symphony-plus", "medela-symphony-plus-bpump-rental-only", "Medela Symphony PLUS Breast Pump (Rental Only)"),
  inSitemap("momcozy-air-1", "momcozy-air-1-ultra-slim-wearable-breast-pump", "Momcozy Air 1 Ultra-Slim Wearable Breast Pump"),
  inSitemap("momcozy-m6-mobile-style", "momcozy-m6-mobile-style-hands-free-breast-pump", "Momcozy M6 Mobile Style Hands-Free Breast Pump"),
  inSitemap("momcozy-m9-mobile-flow", "momcozy-m9-mobile-flow-hands-free-breast-pump", "Momcozy M9 Mobile Flow Hands-Free Breast Pump"),
  inSitemap("momcozy-s12-pro-quick", "momcozy-s12-pro-quick-wearable-breast-pump", "Momcozy S12 Pro Quick Wearable Breast Pump"),
  inSitemap("momcozy-s9-pro", "momcozy-s9-pro-wearable-breast-pump", "Momcozy S9 Pro Wearable Breast Pump"),
  inSitemap("motif-duo", "motif-duo-double-electric-breast-pump", "Motif Duo Double Electric Breast Pump"),
  inSitemap("motif-luna", "motif-luna-double-electric-breast-pump", "Motif Luna Double Electric Breast Pump"),
  inSitemap("motif-luna-with-battery", "motif-luna-with-battery-double-electric-breast-pump", "Motif Luna with Battery Double Electric Breast Pump"),
  inSitemap("motif-manual-silicone", "motif-manual-silicone-breast-pump", "Motif Manual Silicone Breast Pump"),
  inSitemap("spectra-9-plus", "spectra-9-plus-double-electric-breast-pump", "Spectra 9 Plus Double Electric Breast Pump"),
  inSitemap("spectra-premier-wearable", "spectra-premier-wearable-breast-pump", "Spectra Premier Wearable Breast Pump"),
  inSitemap("spectra-s2-plus", "spectra-s2-plus-double-electric-breast-pump", "Spectra S2 Plus Double Electric Breast Pump"),
  inSitemap("spectra-synergy-gold", "spectra-synergy-gold-double-electric-breast-pump", "Spectra Synergy Gold Double Electric Breast Pump"),
  inSitemap("spectra-synergy-gold-portable", "spectra-synergy-gold-portable-double-electric-breast-pump", "Spectra Synergy Gold Portable Double Electric Breast Pump"),
  inSitemap("willow-360", "willow-360-wearable-breast-pump", "Willow 360 Wearable Breast Pump"),
  inSitemap("willow-silicone-wearable", "willow-silicone-wearable-manual-breast-pump", "Willow Silicone Wearable Manual Breast Pump"),
  inSitemap("willow-sync", "willow-sync-wearable-breast-pump", "Willow Sync Wearable Breast Pump"),
  inSitemap("willow-wave", "willow-wave-wearable-manual-breast-pump", "Willow Wave Wearable Manual Breast Pump"),
  inSitemap("zomee-z2", "zomee-z2-double-electric-breast-pump", "Zomee Z2 Double Electric Breast Pump"),
];
