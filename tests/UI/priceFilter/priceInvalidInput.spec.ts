import type { PriceInvalidInputTestCase } from '../../../src/interfaces/priceTestCases.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier clipboard run (2026-11-12): 0 passed, 24 failed across desktop/mobile.
 * WEB/MOB IDs:
 * - 00024–00027: input rejection passed; price 10473 exceeded preserved max 8354.
 * - 00032–00035: rejection passed; the same price violation occurred during recovery.
 * - 00028, 00036: pasted -1 remained in the field.
 * - 00030, 00038: overflow became Infinity and caused HTTP 422/not-found.
 * Negative/overflow rejection and conditional-discount pricing need product clarification.
 */
const invalidPriceCases: readonly PriceInvalidInputTestCase[] = [
  {
    id: '00024',
    summary: 'rejects pasted letters in min, preserves the other boundary and recovers',
    field: 'min',
    value: 'abc',
    tags: ['@negative', '@recovery', '@min', '@letters'],
  },
  {
    id: '00025',
    summary: 'rejects pasted special characters in min, preserves the other boundary and recovers',
    field: 'min',
    value: '!@#',
    tags: ['@negative', '@recovery', '@min', '@specialCharacters'],
  },
  {
    id: '00026',
    summary: 'rejects pasted mixed digits and letters in min, preserves the other boundary and recovers',
    field: 'min',
    value: '123abc',
    tags: ['@negative', '@recovery', '@min', '@mixedInput'],
  },
  {
    id: '00027',
    summary: 'rejects pasted whitespace in min, preserves the other boundary and recovers',
    field: 'min',
    value: '   ',
    tags: ['@negative', '@recovery', '@min', '@whitespace'],
  },
  {
    id: '00028',
    summary: 'rejects pasted negative amount in min, preserves the other boundary and recovers',
    field: 'min',
    value: '-1',
    tags: ['@negative', '@recovery', '@min', '@negativeAmount'],
  },
  {
    id: '00030',
    summary: 'rejects pasted unrepresentable amount in min, preserves the other boundary and recovers',
    field: 'min',
    value: '9'.repeat(309),
    tags: ['@negative', '@recovery', '@min', '@overflow'],
  },
  {
    id: '00032',
    summary: 'rejects pasted letters in max, preserves the other boundary and recovers',
    field: 'max',
    value: 'abc',
    tags: ['@negative', '@recovery', '@max', '@letters'],
  },
  {
    id: '00033',
    summary: 'rejects pasted special characters in max, preserves the other boundary and recovers',
    field: 'max',
    value: '!@#',
    tags: ['@negative', '@recovery', '@max', '@specialCharacters'],
  },
  {
    id: '00034',
    summary: 'rejects pasted mixed digits and letters in max, preserves the other boundary and recovers',
    field: 'max',
    value: '123abc',
    tags: ['@negative', '@recovery', '@max', '@mixedInput'],
  },
  {
    id: '00035',
    summary: 'rejects pasted whitespace in max, preserves the other boundary and recovers',
    field: 'max',
    value: '   ',
    tags: ['@negative', '@recovery', '@max', '@whitespace'],
  },
  {
    id: '00036',
    summary: 'rejects pasted negative amount in max, preserves the other boundary and recovers',
    field: 'max',
    value: '-1',
    tags: ['@negative', '@recovery', '@max', '@negativeAmount'],
  },
  {
    id: '00038',
    summary: 'rejects pasted unrepresentable amount in max, preserves the other boundary and recovers',
    field: 'max',
    value: '9'.repeat(309),
    tags: ['@negative', '@recovery', '@max', '@overflow'],
  },
];

for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: invalid clipboard input (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@validation', '@clipboard'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      for (const priceFieldTestCase of invalidPriceCases) {
        test(
          `[${testPlatform.prefix}-${priceFieldTestCase.id}] ${priceFieldTestCase.summary}`,
          { tag: [...priceFieldTestCase.tags] },
          async function ({ category, priceSamples }, testInfo) {
            const preservedPriceSelection = PriceHelper.getOppositeSelection(
              priceSamples.narrowingPriceRange,
              priceFieldTestCase.field,
            );
            await category.priceFilter.setMinMaxPrices(preservedPriceSelection);
            await category.priceFilter.enterValue(priceFieldTestCase.field, priceFieldTestCase.value, 'clipboard');
            await PriceAssertions.assertRejectedInput(category.priceFilter, priceFieldTestCase.field);
            await category.priceFilter.waitForSelection(preservedPriceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();
            const productListing = await category.getProductListing();
            await PriceReportHelper.attachProductListing(testInfo, preservedPriceSelection, productListing);
            PriceAssertions.assertPrices(productListing.products, preservedPriceSelection);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, preservedPriceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();

            await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
            const productListingAfterValidInput = await category.getProductListing();
            await PriceReportHelper.attachProductListing(
              testInfo,
              priceSamples.narrowingPriceRange,
              productListingAfterValidInput,
            );
            PriceAssertions.assertPrices(productListingAfterValidInput.products, priceSamples.narrowingPriceRange);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
            await category.priceFilter.closeMobilePanelIfOpen();
          },
        );
      }
    },
  );
}
