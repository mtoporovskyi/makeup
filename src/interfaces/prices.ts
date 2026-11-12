export interface PriceRange {
  readonly min: number;
  readonly max: number;
}

export type PriceSelection = Partial<PriceRange>;

export type PriceBoundary = keyof PriceRange;

export type PriceInputMethod = 'fill' | 'keyboard' | 'clipboard';

export type PriceInputFormat = 'leading zeros' | 'surrounding spaces';

export interface PricePreset {
  readonly label: string;
  readonly selection: PriceSelection;
}

export interface PriceSamples {
  readonly narrowingPriceRange: PriceRange;
  readonly replacementRange: PriceRange;
  readonly observedBoundaryPrice: number;
}
