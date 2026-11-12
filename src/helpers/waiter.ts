import { expect } from '@playwright/test';
import type { Locator, Page, Response } from '@playwright/test';
import type { PriceRange, PriceSelection } from '../interfaces/prices.js';
import type { PriceSortOption } from '../interfaces/catalog.js';
import type { WaiterLocators } from '../interfaces/waiter.js';
import { UrlHelper } from './urlHelper.js';

export class Waiter {
  constructor(
    private readonly page: Page,
    private readonly locators: WaiterLocators,
  ) {}

  /**
   * Waits for all supplied locators to become visible in parallel.
   *
   * @param locators - Elements required by the next UI interaction.
   */
  async waitForVisible(...locators: readonly Locator[]): Promise<void> {
    await Promise.all(
      locators.map((locator) =>
        expect(locator, `Required UI element must become visible: ${locator.toString()}`).toBeVisible(),
      ),
    );
  }

  /**
   * Waits until the supplied element is hidden or detached.
   *
   * @param locator - Element whose disappearance completes an interaction.
   */
  async waitForHidden(locator: Locator): Promise<void> {
    await expect(locator, `UI element must become hidden after the interaction: ${locator.toString()}`).toBeHidden();
  }

  /**
   * Waits for the category heading and includes navigation status in failure diagnostics.
   *
   * @param initialStatus - Initial HTTP status, including a possible transient WAF response.
   */
  async waitForCategoryReady(initialStatus: number | undefined): Promise<void> {
    await expect(
      this.locators.heading,
      `Category UI did not load (initial HTTP ${initialStatus ?? 'no response'}). ` +
        'Check the screenshot/trace for WAF or network blocking.',
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Waits for the loading skeleton to disappear and the main results grid to be visible.
   */
  async waitForResults(): Promise<void> {
    await this.waitForLoadingToFinish();
    await this.waitForVisible(this.locators.resultsGrid);
  }

  /**
   * Waits for the selected hash, matching UI tag and completed results update.
   * These checks synchronize the UI; product-price assertions verify filtering separately.
   *
   * @param priceSelection - Expected committed price boundaries.
   */
  async waitForPriceSelection(priceSelection: PriceSelection): Promise<void> {
    const expectedPriceTagText = [
      priceSelection.min === undefined ? '' : `від ${priceSelection.min}`,
      priceSelection.max === undefined ? '' : `до ${priceSelection.max}`,
    ]
      .filter(Boolean)
      .join(' ');

    await Promise.all([
      expect(this.page, `Price filter URL must match committed bounds ${JSON.stringify(priceSelection)}`).toHaveURL(
        (url) => {
          const hashParameters = UrlHelper.getHashParameters(url);
          return (
            hashParameters.get('price_from') === (priceSelection.min?.toString() ?? null) &&
            hashParameters.get('price_to') === (priceSelection.max?.toString() ?? null)
          );
        },
      ),
      expectedPriceTagText
        ? expect(this.locators.priceTag, 'Active price tag must display the committed price bounds').toContainText(
            expectedPriceTagText,
          )
        : expect(
            this.locators.priceTag,
            'Active price tag must be removed when both price bounds are cleared',
          ).toHaveCount(0),
    ]);
    await this.waitForLoadingToFinish();
  }

  /**
   * Registers a response listener for the requested sort, price bounds and first offset.
   */
  waitForSortingResponse(priceSortOption: PriceSortOption, priceSelection: PriceRange): Promise<Response> {
    return this.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        /\/shop\/v1\/categories\/\d+\/products\/$/u.test(url.pathname) &&
        url.searchParams.get('sort') === priceSortOption.value &&
        url.searchParams.get('priceFrom') === String(priceSelection.min) &&
        url.searchParams.get('priceTo') === String(priceSelection.max) &&
        url.searchParams.get('offset') === '0'
      );
    });
  }

  /**
   * Waits for the committed sorting hash and completed results rendering.
   */
  async waitForSorting(priceSortOption: PriceSortOption): Promise<void> {
    await expect(this.page, `Sorting URL must reflect the selected option ${priceSortOption.value}`).toHaveURL(
      (url) => UrlHelper.getHashParameters(url).get('sort') === priceSortOption.value,
    );
    await this.waitForResults();
  }

  /**
   * Waits until no results-loading skeleton remains.
   */
  private async waitForLoadingToFinish(): Promise<void> {
    await expect(
      this.locators.loadingGrid,
      'Results loading skeletons must disappear before reading product cards',
    ).toHaveCount(0);
  }
}
