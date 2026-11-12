import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

export abstract class BaseAssertions {
  protected constructor() {}

  /**
   * Checks that a prepared collection contains at least one item.
   *
   * @param values - Collection supplied by the calling assertion.
   * @param message - Business context included in a failure.
   */
  protected static assertNotEmpty(values: { readonly length: number }, message: string): void {
    expect(values.length, message).toBeGreaterThan(0);
  }

  /**
   * Checks that a prepared collection contains no items.
   *
   * @param values - Collection of unexpected items.
   * @param message - Business context included in a failure.
   */
  protected static assertEmpty(values: { readonly length: number }, message: string): void {
    expect(values, message).toHaveLength(0);
  }

  /**
   * Checks a prepared input against an exact value or regular expression.
   *
   * @param inputLocator - Input locator prepared by the test.
   * @param expectedValue - Expected text or allowed text pattern.
   * @param message - Business context included in a failure.
   */
  protected static async assertInputValue(
    inputLocator: Locator,
    expectedValue: string | RegExp,
    message: string,
  ): Promise<void> {
    await expect(inputLocator, message).toHaveValue(expectedValue);
  }
}
