import type { Locator } from '@playwright/test';
import type { ProductRow } from '../../interfaces/products.js';

export class ProductCard {
  private readonly title: Locator;
  private readonly currentPrices: Locator;
  private readonly outOfStock: Locator;

  constructor(card: Locator) {
    this.title = card.locator('.ProductCard__title');
    this.currentPrices = card.locator('.Price__priceCurrent');
    this.outOfStock = card.getByText('Немає в наявності', { exact: true });
  }

  /**
   * Reads raw title, current-price texts and availability status in parallel.
   *
   * @returns Card name, current-price texts and status; absent prices/status remain empty.
   */
  async readDetails(): Promise<ProductRow> {
    const [productName, currentPriceTexts, availabilityTexts] = await Promise.all([
      this.title.innerText(),
      this.currentPrices.allInnerTexts(),
      this.outOfStock.allInnerTexts(),
    ]);

    return {
      name: productName.trim(),
      prices: currentPriceTexts,
      outOfStock: availabilityTexts.join(' ').trim(),
    };
  }
}
