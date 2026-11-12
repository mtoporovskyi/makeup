export interface ProductPrice {
  readonly name: string;
  readonly price: number;
}

export interface ProductListing {
  readonly products: ProductPrice[];
  readonly unavailableProducts: string[];
}

export interface ProductRow {
  readonly name: string;
  readonly prices: readonly string[];
  readonly outOfStock: string;
}
