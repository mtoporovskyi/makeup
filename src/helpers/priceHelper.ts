import { BaseHelper } from './baseHelper.js';
import type {
  PriceBoundary,
  PriceInputFormat,
  PricePreset,
  PriceRange,
  PriceSamples,
  PriceSelection,
} from '../interfaces/prices.js';
import type { ProductPrice } from '../interfaces/products.js';

export class PriceHelper extends BaseHelper {
  private constructor() {
    super();
  }

  /**
   * Derives narrowing ranges and an exact boundary from current unfiltered UI prices.
   *
   * @param prices - Observed product prices before applying a filter.
   * @returns Two meaningful ranges and one observed price for an inclusive-boundary test.
   * @throws Error when UI prices cannot form a narrowing range and a meaningful range change.
   */
  static choosePriceSamples(prices: readonly number[]): PriceSamples {
    const sortedDistinctPrices = PriceHelper.getDistinctWholePrices(prices);
    const priceSamples = PriceHelper.createPriceSamples(sortedDistinctPrices);
    PriceHelper.validateNarrowingPriceRange(sortedDistinctPrices, priceSamples.narrowingPriceRange);
    PriceHelper.validateRangeChange(sortedDistinctPrices, priceSamples);
    return priceSamples;
  }

  /**
   * Selects a compact range from nearby observed prices for complete pagination coverage.
   *
   * @param prices - Current unfiltered UI prices; no amounts or result counts are fixed.
   * @returns A middle observed price and the second distinct price above it.
   * @throws Error when the UI cannot supply those distinct bounds.
   */
  static choosePaginationRange(prices: readonly number[]): PriceRange {
    const sortedDistinctPrices = PriceHelper.getDistinctWholePrices(prices);
    const middlePriceIndex = Math.floor(sortedDistinctPrices.length / 2);
    return {
      min: PriceHelper.getRequiredSample(sortedDistinctPrices, middlePriceIndex),
      max: PriceHelper.getRequiredSample(sortedDistinctPrices, middlePriceIndex + 2),
    };
  }

  /**
   * Finds products whose current prices violate the inclusive selection.
   *
   * @param products - Prepared products with numeric current prices.
   * @param range - Expected bounds; defaults are zero and an unrestricted upper bound.
   * @returns Products below the minimum or above the maximum.
   */
  static pricesOutsideRange(products: readonly ProductPrice[], range: PriceSelection): ProductPrice[] {
    return products.filter(({ price }) => price < (range.min ?? 0) || price > (range.max ?? Infinity));
  }

  /**
   * Returns the price preset at the requested index, failing if it is missing.
   *
   * @param pricePresets - Presets read from the current filter panel.
   * @param index - Zero-based position; negative positions count from the end.
   * @returns The preset at the requested position.
   * @throws Error when that position is unavailable.
   */
  static getPricePresetByIndex(pricePresets: readonly PricePreset[], index: number): PricePreset {
    return PriceHelper.getRequiredItem(pricePresets, index, `Missing price preset at position ${index}.`);
  }

  /**
   * Builds a formatted integer string for positive input scenarios.
   *
   * @param amount - UI-derived amount to enter.
   * @param format - Leading zeros or surrounding spaces; omitted keeps the plain amount.
   * @returns The amount in the requested input format.
   */
  static formatInput(amount: number, format?: PriceInputFormat): string {
    if (format === 'leading zeros') {
      return `000${amount}`;
    }

    if (format === 'surrounding spaces') {
      return ` ${amount} `;
    }

    return amount.toString();
  }

  /**
   * Builds the selection to apply before testing the other field's input validation.
   *
   * @param range - UI-derived min/max values, possibly swapped for an inverted-range scenario.
   * @param boundary - Field under test: min (Від) or max (До); this field is omitted from the result.
   * @returns Only max when testing min, or only min when testing max.
   */
  static getOppositeSelection(range: PriceRange, boundary: PriceBoundary): PriceSelection {
    return boundary === 'min' ? { max: range.max } : { min: range.min };
  }

  /**
   * Builds expected bounds after a trailing separator: a dot is ignored and a comma clears its field.
   *
   * @param range - Both valid boundaries populated before the key is pressed.
   * @param boundary - Field receiving the separator key at the end of its current value.
   * @param separator - Keyboard character whose input behavior is being checked.
   * @returns The unchanged range for a dot or only the opposite boundary for a comma.
   */
  static getSelectionAfterTypedSeparator(
    range: PriceRange,
    boundary: PriceBoundary,
    separator: '.' | ',',
  ): PriceSelection {
    if (separator === ',') {
      return PriceHelper.getOppositeSelection(range, boundary);
    }

    return range;
  }

  /**
   * Moves a whole-UAH boundary half a unit toward the interior of the range.
   *
   * @param range - UI-derived whole-UAH range used by decimal scenarios.
   * @param boundary - The lower or upper field being tested.
   * @returns The lower bound plus 0.5 or the upper bound minus 0.5.
   */
  static getDecimalAmount(range: PriceRange, boundary: PriceBoundary): number {
    return range[boundary] + (boundary === 'min' ? 0.5 : -0.5);
  }

  /**
   * Returns unique positive integer prices in ascending order for range sampling.
   */
  private static getDistinctWholePrices(prices: readonly number[]): number[] {
    return [...new Set(prices)]
      .filter((price) => Number.isInteger(price) && price > 0)
      .sort((left, right) => left - right);
  }

  /**
   * Requires distinct observed boundaries with excluded prices on both sides.
   *
   * @param prices - Sorted distinct positive whole-UAH prices from the initial UI.
   * @param range - Proposed narrowing price range whose boundaries come from those prices.
   * @throws Error when the range is collapsed, reversed or does not narrow both sides.
   */
  private static validateNarrowingPriceRange(prices: readonly number[], range: PriceRange): void {
    const hasLowerPrices = prices.some((price) => price < range.min);
    const hasHigherPrices = prices.some((price) => price > range.max);

    if (range.min >= range.max || !hasLowerPrices || !hasHigherPrices) {
      throw new Error(
        'Insufficient UI data: cannot form distinct price boundaries with observed prices ' +
          `below and above the range. ${JSON.stringify({ prices, range })}`,
      );
    }
  }

  /**
   * Requires the second range to exclude an observed price included by the first.
   *
   * @param prices - Observed prices used to select both ranges.
   * @param priceSamples - Proposed initial range and replacement range.
   * @throws Error when the replacement is collapsed, reversed or excludes no initial prices.
   */
  private static validateRangeChange(prices: readonly number[], priceSamples: PriceSamples): void {
    const { narrowingPriceRange, replacementRange } = priceSamples;
    const excludesInitialPrice = prices.some(
      (price) =>
        price >= narrowingPriceRange.min &&
        price <= narrowingPriceRange.max &&
        (price < replacementRange.min || price > replacementRange.max),
    );

    if (replacementRange.min >= replacementRange.max || !excludesInitialPrice) {
      throw new Error(
        'Insufficient UI data: cannot form a replacement range that excludes a price ' +
          `included by the initial range. ${JSON.stringify({ prices, priceSamples })}`,
      );
    }
  }

  /**
   * Selects bounds that exclude observed prices on both sides, a replacement and an exact-match price.
   *
   * @param prices - Sorted distinct positive integers used to propose the ranges.
   * @returns UI-derived ranges and an inclusive-boundary sample.
   */
  private static createPriceSamples(prices: readonly number[]): PriceSamples {
    const narrowingMinPrice = PriceHelper.getRequiredSample(prices, 1);
    const middleObservedPrice = PriceHelper.getRequiredSample(prices, Math.floor(prices.length / 2));
    const narrowingMaxPrice = PriceHelper.getRequiredSample(prices, prices.length - 2);
    const highestObservedPrice = PriceHelper.getRequiredSample(prices, prices.length - 1);
    return {
      narrowingPriceRange: { min: narrowingMinPrice, max: narrowingMaxPrice },
      replacementRange: { min: middleObservedPrice, max: highestObservedPrice },
      observedBoundaryPrice: middleObservedPrice,
    };
  }

  /**
   * Reads a sample price with a clear error for an unavailable position.
   *
   * @param prices - Observed prices used to build test ranges.
   * @param index - Zero-based position in the sample.
   * @returns The price at that position.
   * @throws Error when the sample does not contain the requested position.
   */
  private static getRequiredSample(prices: readonly number[], index: number): number {
    return PriceHelper.getRequiredItem(
      prices,
      index,
      `Insufficient UI data: no price at sample index ${index} among ` +
        `${prices.length} distinct positive whole-UAH prices.`,
    );
  }
}
