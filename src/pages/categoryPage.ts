import type { Locator, Page } from '@playwright/test';
import { BasePage } from './basePage.js';
import { PriceFilter } from './components/priceFilter.js';
import { ProductCard } from './components/productCard.js';
import { PriceSorting } from './components/priceSorting.js';
import { ParsePriceHelper } from '../helpers/parsePriceHelper.js';
import { Waiter } from '../helpers/waiter.js';
import type { ProductListing, ProductRow } from '../interfaces/products.js';
import type { WaiterLocators } from '../interfaces/waiter.js';

export class CategoryPage extends BasePage {
  readonly productResults: Locator;
  readonly productCards: Locator;
  readonly priceFilter: PriceFilter;
  readonly priceSorting: PriceSorting;
  private readonly waiter: Waiter;
  private readonly firstProductCard: Locator;

  constructor(page: Page) {
    super(page);
    this.productResults = page.getByRole('main').locator('.Products__products');
    this.productCards = this.productResults.locator('.Products__cards > .ProductCard__cardContainer');
    this.firstProductCard = this.productCards.first();
    const waiterLocators: WaiterLocators = {
      heading: page.getByRole('heading', { name: 'Парфумерія', level: 1, exact: true }),
      resultsGrid: this.productResults.locator('.Products__cards'),
      loadingGrid: this.productResults.locator('.ProductSkeleton__grid'),
      priceTag: this.productResults.getByRole('button', { name: /^(?:від|до)\s+-?\d/u }),
    };
    this.waiter = new Waiter(page, waiterLocators);
    this.priceFilter = new PriceFilter(page, this.productResults, this.waiter);
    this.priceSorting = new PriceSorting(page, this.productResults, this.waiter);
  }

  /**
   * Prepares the category heading, initial consent and results after base navigation.
   * The test context must be fresh so the initial consent banner is available.
   *
   * @param initialStatus - Initial HTTP status included in readiness diagnostics.
   */
  protected override async prepareAfterNavigation(initialStatus: number | undefined): Promise<void> {
    await this.waiter.waitForCategoryReady(initialStatus);

    // Fresh test contexts have no consent cookie. This client-rendered banner also confirms hydration.
    await this.acceptInitialConsent();
    await this.waiter.waitForResults();
  }

  /**
   * Waits for results, scrolls the first card into view and reads all loaded main cards.
   *
   * @returns Parsed current prices and explicitly unavailable product names.
   * @throws Error when a card does not match the supported UI price contract.
   */
  async getProductListing(): Promise<ProductListing> {
    await this.waiter.waitForResults();

    if ((await this.productCards.count()) > 0) {
      await this.firstProductCard.scrollIntoViewIfNeeded();
    }

    const productRows = await this.readProductRows();
    return ParsePriceHelper.parseProductListing(productRows);
  }

  /**
   * Reads the prepared main-listing cards in parallel through ProductCard locators.
   *
   * @returns One raw detail row per currently loaded main-result card.
   */
  private async readProductRows(): Promise<ProductRow[]> {
    const productCards = await this.productCards.all();
    return Promise.all(productCards.map((card) => new ProductCard(card).readDetails()));
  }
}
