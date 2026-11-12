import { expect } from '@playwright/test';
import type { CatalogPageData, PriceSortOption } from '../interfaces/catalog.js';
import type { PriceRange } from '../interfaces/prices.js';
import type { ProductPrice } from '../interfaces/products.js';

export class CatalogAssertions {
  private constructor() {}

  /**
   * Requires another page so a hybrid scenario actually exercises remaining-page API coverage.
   */
  static assertMultiplePages(firstPageData: CatalogPageData): void {
    expect(
      firstPageData.total,
      `Insufficient UI-derived data: the selected range must contain a second page at ${firstPageData.url}`,
    ).toBeGreaterThan(firstPageData.perPage);
  }

  /**
   * Checks that every expected offset was covered exactly once with consistent metadata.
   *
   * @param catalogPages - First-page browser response plus responses for all subsequent API pages.
   * @param firstPageData - Baseline response defining page size and total main-product count.
   */
  static assertCompleteCoverage(catalogPages: readonly CatalogPageData[], firstPageData: CatalogPageData): void {
    const pagesByOffset = [...catalogPages].sort((left, right) => left.offset - right.offset);
    expect(pagesByOffset, `Every catalog page must be covered exactly once at ${firstPageData.url}`).toHaveLength(
      Math.ceil(firstPageData.total / firstPageData.perPage),
    );
    let totalItemCount = 0;

    for (const [index, catalogPageData] of pagesByOffset.entries()) {
      expect(catalogPageData.offset, `Missing or repeated offset: ${catalogPageData.url}`).toBe(
        index * firstPageData.perPage,
      );
      expect(catalogPageData.perPage, `Page size changed: ${catalogPageData.url}`).toBe(firstPageData.perPage);
      expect(catalogPageData.total, `Catalog total changed during pagination: ${catalogPageData.url}`).toBe(
        firstPageData.total,
      );
      expect(catalogPageData.itemCount, `Incomplete main-product page: ${catalogPageData.url}`).toBe(
        Math.min(firstPageData.perPage, firstPageData.total - catalogPageData.offset),
      );
      totalItemCount += catalogPageData.itemCount;
    }

    expect(totalItemCount, `Combined page item counts must match the catalog total at ${firstPageData.url}`).toBe(
      firstPageData.total,
    );
  }

  /**
   * Verifies price and sorting query parameters on each exact response URL.
   */
  static assertQuery(catalogPageData: CatalogPageData, selection: PriceRange, sort: PriceSortOption): void {
    const queryParameters = new URL(catalogPageData.url).searchParams;
    expect(
      queryParameters.get('priceFrom'),
      `Request must retain the selected minimum price: ${catalogPageData.url}`,
    ).toBe(String(selection.min));
    expect(
      queryParameters.get('priceTo'),
      `Request must retain the selected maximum price: ${catalogPageData.url}`,
    ).toBe(String(selection.max));
    expect(queryParameters.get('sort'), `Request must retain the selected sorting: ${catalogPageData.url}`).toBe(
      sort.value,
    );
    expect(queryParameters.get('offset'), `Request offset must match the response offset: ${catalogPageData.url}`).toBe(
      String(catalogPageData.offset),
    );
  }

  /**
   * Confirms that the API price field used for later pages matches current UI card prices.
   *
   * @param products - Current displayed main-card prices read by the test.
   * @param response - The exact response rendered by those cards.
   */
  static assertUiMatchesResponse(products: readonly ProductPrice[], response: CatalogPageData): void {
    expect(products, `UI and current API prices differ at ${response.url}`).toEqual(
      response.products.map(({ name, price }) => ({ name, price })),
    );
  }
}
