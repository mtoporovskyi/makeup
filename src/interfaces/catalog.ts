import type { ProductPrice } from './products.js';

export type PriceSortDirection = 'ascending' | 'descending';

export interface PriceSortOption {
  readonly caseId: string;
  readonly summary: string;
  readonly direction: PriceSortDirection;
  readonly value: 'priceAsc' | 'priceDesc';
  readonly label: string;
  readonly tag: string;
}

export interface CatalogProduct extends ProductPrice {
  readonly id: number;
}

export interface CatalogPageData {
  readonly url: string;
  readonly offset: number;
  readonly perPage: number;
  readonly total: number;
  readonly itemCount: number;
  readonly products: readonly CatalogProduct[];
  readonly unavailableProducts: readonly string[];
  readonly ignoredBlocks: readonly string[];
}
