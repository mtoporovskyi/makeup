import { BaseAssertions } from './baseAssertions.js';
import { expect } from '@playwright/test';
import { PriceHelper } from '../helpers/priceHelper.js';
import type { PriceBoundary, PriceSelection } from '../interfaces/prices.js';
import type { ProductPrice } from '../interfaces/products.js';
import type { PriceFilter } from '../pages/components/priceFilter.js';
import type { CatalogPageData, PriceSortDirection } from '../interfaces/catalog.js';

export class PriceAssertions extends BaseAssertions {
  private constructor() {
    super();
  }

  /**
   * Checks a nonempty UI price collection against inclusive price boundaries.
   *
   * @param products - Parsed current prices read from the main product listing.
   * @param priceSelection - Expected bounds; omitted bounds leave that side unrestricted.
   */
  static assertPrices(products: readonly ProductPrice[], priceSelection: PriceSelection): void {
    this.assertNotEmpty(products, 'An empty result must not pass the price check');
    this.assertEmpty(
      PriceHelper.pricesOutsideRange(products, priceSelection),
      `Current UI prices must stay within inclusive bounds ${JSON.stringify(priceSelection)}`,
    );
  }

  /**
   * Checks current API prices and includes the exact page URL in a range failure.
   */
  static assertApiPrices(catalogPageData: CatalogPageData, priceSelection: PriceSelection): void {
    this.assertNotEmpty(catalogPageData.products, `No current API prices at ${catalogPageData.url}`);
    this.assertEmpty(
      PriceHelper.pricesOutsideRange(catalogPageData.products, priceSelection),
      `Current API prices must stay within inclusive bounds ${JSON.stringify(priceSelection)} at ${catalogPageData.url}`,
    );
  }

  /**
   * Checks monotonic current prices in the requested direction, including page boundaries.
   *
   * @param products - Prepared prices in rendered or paginated response order.
   * @param sortDirection - Ascending or descending order selected through UI.
   */
  static assertSortedPrices(products: readonly ProductPrice[], sortDirection: PriceSortDirection): void {
    this.assertNotEmpty(products, 'An empty result must not pass the sorting check');
    const prices = products.map(({ price }) => price);
    const expectedSortedPrices = [...prices].sort((left, right) =>
      sortDirection === 'ascending' ? left - right : right - left,
    );
    expect(prices, `Current prices must be ${sortDirection}`).toEqual(expectedSortedPrices);
  }

  /**
   * Checks both price fields after the test has opened the filter panel.
   *
   * @param priceFilter - Filter with its input fields already available.
   * @param priceSelection - Expected bounds; an omitted bound requires an empty field.
   */
  static async assertSelectedRange(priceFilter: PriceFilter, priceSelection: PriceSelection): Promise<void> {
    await Promise.all([
      this.assertInputValue(
        priceFilter.minInput,
        priceSelection.min?.toString() ?? '',
        'Minimum price field must match the selected lower bound or be empty when unrestricted',
      ),
      this.assertInputValue(
        priceFilter.maxInput,
        priceSelection.max?.toString() ?? '',
        'Maximum price field must match the selected upper bound or be empty when unrestricted',
      ),
    ]);
  }

  /**
   * Checks that invalid input leaves the edited field empty.
   *
   * @param priceFilter - Filter panel prepared by the test.
   * @param boundary - The field that received invalid input.
   */
  static async assertRejectedInput(priceFilter: PriceFilter, boundary: PriceBoundary): Promise<void> {
    const priceInput = boundary === 'min' ? priceFilter.minInput : priceFilter.maxInput;
    await this.assertInputValue(priceInput, '', `Rejected input must leave the ${boundary} price field empty`);
  }
}
