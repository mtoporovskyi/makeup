import { test as base } from '@playwright/test';
import { CategoryPage } from '../pages/categoryPage.js';
import { PriceHelper } from '../helpers/priceHelper.js';
import type { CategoryFixtures, CategoryOptions } from '../interfaces/categoryFixtures.js';

export const test = base.extend<CategoryFixtures & CategoryOptions>({
  categoryUrl: ['', { option: true }],
  category: async ({ page, categoryUrl }, use) => {
    if (categoryUrl.trim() === '') {
      throw new Error('Set categoryUrl with test.use({ categoryUrl }) in the spec file.');
    }

    const category = new CategoryPage(page);
    await category.open(categoryUrl);
    await use(category);
  },
  initialProducts: async ({ category }, use, testInfo) => {
    const productListing = await category.getProductListing();
    await testInfo.attach('initial-ui-prices', {
      body: JSON.stringify(productListing, null, 2),
      contentType: 'application/json',
    });
    await use(productListing.products);
  },
  priceSamples: async ({ initialProducts }, use, testInfo) => {
    const priceSamples = PriceHelper.choosePriceSamples(initialProducts.map(({ price }) => price));
    await testInfo.attach('ui-derived-price-samples', {
      body: JSON.stringify(priceSamples, null, 2),
      contentType: 'application/json',
    });
    await use(priceSamples);
  },
});

export { expect } from '@playwright/test';
