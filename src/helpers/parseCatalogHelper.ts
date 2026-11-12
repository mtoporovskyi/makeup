import { ParsePriceHelper } from './parsePriceHelper.js';
import type { CatalogPageData, CatalogProduct } from '../interfaces/catalog.js';
import type { JsonObject, JsonValue } from '../interfaces/json.js';

export class ParseCatalogHelper {
  private constructor() {}

  /**
   * Validates a catalog response and extracts current prices of main product entries.
   *
   * @param value - Decoded JSON from the observed catalog endpoint.
   * @param url - Response URL retained for pagination and diagnostics.
   * @returns Page metadata and priced/unpriced main products.
   * @throws Error for unsupported blocks or an invalid response contract.
   */
  static parsePage(value: JsonValue, url: string): CatalogPageData {
    const catalogResponseBody = ParseCatalogHelper.readObject(value, 'catalog response');

    if (catalogResponseBody.type !== 'products-list') {
      throw new Error(`Expected a products-list response at ${url}.`);
    }

    const catalogEntries = ParseCatalogHelper.readArray(catalogResponseBody.products, 'products');
    const products: CatalogProduct[] = [];
    const unavailableProducts: string[] = [];
    const ignoredBlocks: string[] = [];

    for (const value of catalogEntries) {
      const catalogEntry = ParseCatalogHelper.readObject(value, 'catalog entry');
      ParseCatalogHelper.readEntry(catalogEntry, products, unavailableProducts, ignoredBlocks);
    }

    return {
      url,
      offset: ParseCatalogHelper.readInteger(catalogResponseBody.offset, 'offset'),
      perPage: ParseCatalogHelper.readInteger(catalogResponseBody.perPage, 'perPage', 1),
      total: ParseCatalogHelper.readInteger(catalogResponseBody.total, 'total'),
      itemCount: products.length + unavailableProducts.length,
      products,
      unavailableProducts,
      ignoredBlocks,
    };
  }

  /**
   * Separates observed non-product blocks and validates each main product entry.
   */
  private static readEntry(
    catalogEntry: JsonObject,
    products: CatalogProduct[],
    unavailableProducts: string[],
    ignoredBlocks: string[],
  ): void {
    const entryType = ParseCatalogHelper.readString(catalogEntry.type, 'entry.type');

    if (entryType === 'action' || entryType === 'quote-slider') {
      ignoredBlocks.push(entryType);
      return;
    }

    if (entryType !== 'product') {
      throw new Error(`Unsupported catalog entry type: ${entryType}.`);
    }

    ParseCatalogHelper.readProduct(catalogEntry, products, unavailableProducts);
  }

  /**
   * Reads a main product, separating the confirmed unavailable-price placeholder contract.
   * Zero is unpriced only when the product is out of stock and has no default variant.
   */
  private static readProduct(
    catalogEntry: JsonObject,
    products: CatalogProduct[],
    unavailableProducts: string[],
  ): void {
    const name = ParseCatalogHelper.readString(catalogEntry.title, 'product.title');
    const id = ParseCatalogHelper.readInteger(catalogEntry.id, 'product.id', 1);
    const price = catalogEntry.price;

    if (catalogEntry.inStock === false && (price === null || price === undefined)) {
      unavailableProducts.push(name);
      return;
    }

    const currentPriceDetails = ParseCatalogHelper.readObject(price, `price for ${name}`);

    if (currentPriceDetails.currency !== 'UAH' || typeof currentPriceDetails.current !== 'number') {
      throw new Error(`Unsupported current API price for ${name}: ${JSON.stringify(currentPriceDetails)}.`);
    }

    const hasNoDefaultVariant = catalogEntry.defaultVariant === null || catalogEntry.defaultVariant === undefined;

    if (catalogEntry.inStock === false && hasNoDefaultVariant && currentPriceDetails.current === 0) {
      unavailableProducts.push(name);
      return;
    }

    products.push({
      id,
      name,
      price: ParsePriceHelper.parsePrice(String(currentPriceDetails.current)),
    });
  }

  /**
   * Requires a JSON object before accessing domain fields.
   */
  private static readObject(value: JsonValue | undefined, fieldName: string): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Expected an object in catalog field ${fieldName}.`);
    }

    return value;
  }

  /**
   * Requires a JSON array for the main catalog entries.
   */
  private static readArray(value: JsonValue | undefined, fieldName: string): JsonValue[] {
    if (!Array.isArray(value)) {
      throw new Error(`Expected an array in catalog field ${fieldName}.`);
    }

    return value;
  }

  /**
   * Requires a nonblank string used as a product name or block discriminator.
   */
  private static readString(value: JsonValue | undefined, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Expected a nonblank string in catalog field ${fieldName}.`);
    }

    return value.trim();
  }

  /**
   * Requires safe integer metadata with a caller-supplied inclusive lower limit.
   */
  private static readInteger(value: JsonValue | undefined, fieldName: string, minimum = 0): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
      throw new Error(`Invalid catalog field ${fieldName}: ${JSON.stringify(value)}.`);
    }

    return value;
  }
}
