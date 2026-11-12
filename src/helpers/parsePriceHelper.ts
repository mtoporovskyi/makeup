import { BaseHelper } from './baseHelper.js';
import type { PricePreset } from '../interfaces/prices.js';
import type { ProductListing, ProductPrice, ProductRow } from '../interfaces/products.js';

export class ParsePriceHelper extends BaseHelper {
  private constructor() {
    super();
  }

  /**
   * Separates priced cards from explicitly unpriced out-of-stock cards.
   *
   * @param productRows - Raw details of the loaded main-listing cards.
   * @returns Parsed prices and names of explicitly unavailable products.
   * @throws Error when a priced card is incomplete or its price is ambiguous.
   */
  static parseProductListing(productRows: readonly ProductRow[]): ProductListing {
    const productListing: ProductListing = { products: [], unavailableProducts: [] };
    for (const productRow of productRows) {
      if (ParsePriceHelper.isUnavailableRow(productRow)) {
        productListing.unavailableProducts.push(productRow.name);
      } else {
        productListing.products.push(ParsePriceHelper.parseProductRow(productRow));
      }
    }
    return productListing;
  }

  /**
   * Parses one current UI price in UAH, including currency and decimal formatting.
   *
   * @param priceText - Displayed price text from a product card or populated field.
   * @returns A nonnegative UAH amount within the supported numeric range.
   * @throws Error for ambiguous text, unsupported precision or an invalid amount.
   */
  static parsePrice(priceText: string): number {
    const normalizedPriceText = ParsePriceHelper.normalizePrice(priceText);
    ParsePriceHelper.validatePriceFormat(normalizedPriceText, priceText);
    const price = Number(normalizedPriceText);
    ParsePriceHelper.validatePriceAmount(price, priceText);
    return price;
  }

  /**
   * Extracts numeric boundaries from a displayed price-preset label.
   *
   * @param label - UI text containing an open-ended or two-sided price range.
   * @returns The original label and its expected price selection.
   * @throws Error for missing amounts, unsupported amount counts or reversed bounds.
   */
  static parsePreset(label: string): PricePreset {
    const matchedPriceTexts = label.match(/\d[\d\s\u00a0\u202f]*(?:[.,]\d+)?(?=\s*₴)/gu);
    const prices = matchedPriceTexts?.map((amount) => ParsePriceHelper.parsePrice(amount)) ?? [];
    const firstBoundaryPrice = ParsePriceHelper.getRequiredItem(prices, 0, `Missing preset boundary: ${label}`);

    if (/^Менше\s/u.test(label) && prices.length === 1) {
      return { label, selection: { max: firstBoundaryPrice } };
    }

    if (/^Більше\s/u.test(label) && prices.length === 1) {
      return { label, selection: { min: firstBoundaryPrice } };
    }

    const secondBoundaryPrice = prices[1];

    if (prices.length !== 2 || secondBoundaryPrice === undefined || firstBoundaryPrice > secondBoundaryPrice) {
      throw new Error(`Unsupported price preset: ${label}`);
    }

    return { label, selection: { min: firstBoundaryPrice, max: secondBoundaryPrice } };
  }

  /**
   * Recognizes a named, unpriced card with the exact out-of-stock UI label.
   */
  private static isUnavailableRow(productRow: ProductRow): boolean {
    return Boolean(productRow.name) && productRow.prices.length === 0 && productRow.outOfStock === 'Немає в наявності';
  }

  /**
   * Converts a named card with exactly one current price into a priced product.
   *
   * @param productRow - Raw card details after unavailable cards have been separated.
   * @returns The product name and parsed current UAH price.
   * @throws Error for a missing name, zero or multiple prices, or unsupported price text.
   */
  private static parseProductRow(productRow: ProductRow): ProductPrice {
    const { name, prices, outOfStock } = productRow;
    const priceText = prices[0];

    if (!name || prices.length !== 1 || priceText === undefined) {
      throw new Error(`Changed product-card UI contract: ${JSON.stringify({ name, prices, outOfStock })}.`);
    }

    return { name, price: ParsePriceHelper.parsePrice(priceText) };
  }

  /**
   * Removes UAH currency/grouping whitespace and normalizes a decimal comma.
   */
  private static normalizePrice(priceText: string): string {
    return priceText
      .trim()
      .replace(/(?:грн\.?|₴|UAH)\s*$/iu, '')
      .replace(/[\s\u00a0\u202f]/gu, '')
      .replace(',', '.');
  }

  /**
   * Requires one unsigned numeric amount with at most two decimal places.
   *
   * @param normalizedPriceText - Price text after currency and grouping normalization.
   * @param originalPriceText - Original UI text included in a failure.
   * @throws Error when the normalized text is not one supported price.
   */
  private static validatePriceFormat(normalizedPriceText: string, originalPriceText: string): void {
    if (!/^\d+(?:\.\d{1,2})?$/u.test(normalizedPriceText)) {
      throw new Error(`Expected one unambiguous UAH price, received ${JSON.stringify(originalPriceText)}.`);
    }
  }

  /**
   * Checks that a parsed UAH amount is finite, nonnegative and within the safe range.
   *
   * @param price - Parsed numeric amount in UAH.
   * @param originalPriceText - Original UI text included in a failure.
   * @throws Error for negative, nonfinite or excessively large amounts.
   */
  private static validatePriceAmount(price: number, originalPriceText: string): void {
    if (!Number.isFinite(price) || price < 0 || price > Number.MAX_SAFE_INTEGER / 100) {
      throw new Error(`Price is outside the supported UAH range: ${JSON.stringify(originalPriceText)}.`);
    }
  }
}
