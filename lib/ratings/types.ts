// Domain C — consumer ratings. Review-based (and one design-based) opinions, kept apart from
// manufacturer facts in lib/products. Never used to set or override a product attribute.
// Values are carried exactly as supplied by the research package; rules: its report, section R5.

/** One row of PUMPPATH_CONSUMER_RATINGS.csv. Mention counts are integers; every other column is verbatim text. */
export interface ConsumerRating {
  /** Line in the CSV (header = line 1). */
  csvLine: number;
  productId: string;
  brand: string;
  model: string;
  noiseRating: string;
  noiseConfidence: string;
  noiseQuietMentions?: number;
  noiseModerateMentions?: number;
  noiseLoudMentions?: number;
  noiseReviewStatus: string;
  manufacturerDecibelClaim: string;
  noiseSources: string;
  cleaningRating: string;
  cleaningConfidence: string;
  cleaningEasyMentions?: number;
  cleaningHardMentions?: number;
  cleaningComplaintShare: string;
  cleaningBasis: string;
  cleaningReviewStatus: string;
  cleaningSources: string;
  /** Duplicate of the catalog's dishwasher label, for reference only; the catalog attribute is canonical. */
  dishwasherSafety_manufacturerFact: string;
  cleaningRatingSource: string;
  noiseRatingSource: string;
  reviewSetCaveats: string;
  countsHandChecked: string;
  evidenceOrigin: string;
  ratingRules: string;
  notes: string;
}

export interface ConsumerRatingsPackage {
  package: { id: string; baseline: string; researchSha256: string; ratingsSha256: string; catalogExportSha256: string };
  ratings: ConsumerRating[];
}
