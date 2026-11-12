import type { CategoryPage } from '../pages/categoryPage.js';
import type { PriceSamples } from './prices.js';
import type { ProductPrice } from './products.js';

export interface CategoryOptions {
  categoryUrl: string;
}

export interface CategoryFixtures {
  category: CategoryPage;
  initialProducts: readonly ProductPrice[];
  priceSamples: PriceSamples;
}
