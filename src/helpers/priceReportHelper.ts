import type { TestInfo } from '@playwright/test';
import type { PriceSelection } from '../interfaces/prices.js';
import type { ProductListing } from '../interfaces/products.js';
import type { CatalogPageData } from '../interfaces/catalog.js';

export class PriceReportHelper {
  private constructor() {}

  /**
   * Attaches the selected bounds and prepared UI listing to the test report.
   *
   * @param testInfo - Report context of the currently running test.
   * @param priceSelection - Boundaries associated with this listing.
   * @param productListing - Parsed current prices and explicitly unavailable products.
   */
  static async attachProductListing(
    testInfo: TestInfo,
    priceSelection: PriceSelection,
    productListing: ProductListing,
  ): Promise<void> {
    await testInfo.attach('filtered-ui-prices', {
      body: JSON.stringify({ selection: priceSelection, ...productListing }, null, 2),
      contentType: 'application/json',
    });
  }

  /**
   * Attaches all visited offsets and every current API price for hybrid pagination coverage.
   *
   * @param testInfo - Report context of the running E2E scenario.
   * @param priceSelection - UI-derived price bounds used by every page request.
   * @param capturedUiPages - Captured first-page response checked through UI.
   * @param remainingApiPages - Remaining pages fetched through the same browser request context.
   */
  static async attachCatalogCoverage(
    testInfo: TestInfo,
    priceSelection: PriceSelection,
    capturedUiPages: readonly CatalogPageData[],
    remainingApiPages: readonly CatalogPageData[],
  ): Promise<void> {
    await testInfo.attach('catalog-price-coverage', {
      body: JSON.stringify(
        { selection: priceSelection, uiPages: capturedUiPages, apiPages: remainingApiPages },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  }
}
