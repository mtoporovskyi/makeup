import type { PriceBoundary, PriceInputFormat, PriceInputMethod } from './prices.js';

export interface PriceFieldTestCase {
  readonly id: string;
  readonly summary: string;
  readonly field: PriceBoundary;
  readonly tags: readonly string[];
}

export interface PriceInputTestCase extends PriceFieldTestCase {
  readonly method: PriceInputMethod;
  readonly format?: PriceInputFormat;
}

export interface PriceInvalidInputTestCase extends PriceFieldTestCase {
  readonly value: string;
}

export interface PriceDecimalInputTestCase extends PriceFieldTestCase {
  readonly separator: '.' | ',';
}
