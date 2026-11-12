import type { Locator } from '@playwright/test';

export interface WaiterLocators {
  readonly heading: Locator;
  readonly resultsGrid: Locator;
  readonly loadingGrid: Locator;
  readonly priceTag: Locator;
}
