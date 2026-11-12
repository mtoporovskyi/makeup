import type { PriceDecimalInputTestCase } from '../../../src/interfaces/priceTestCases.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier desktop/mobile run (2026-11-12): 0 passed, 16 failed.
 * Observed keyboard behavior adopted as expected: trailing dot preserves the integer; comma clears its field.
 * WEB/MOB IDs:
 * - 00044, 00045: dot paste caused HTTP 422/not-found instead of safe rejection.
 * - 00029, 00031, 00039, 00046, 00047: UI price 10473 exceeded max 8354 after input checks.
 * - 00037: recovery returned price 1350 below min 2405.
 * Amounts describe that run, not fixed test data.
 */
const keyboardSeparatorCases: readonly PriceDecimalInputTestCase[] = [
  {
    id: '00031',
    summary: 'ignores a trailing dot key in min, preserves the range and accepts valid input afterward',
    field: 'min',
    separator: '.',
    tags: ['@edgeCase', '@decimal', '@keyboard', '@recovery', '@min', '@dotDecimal'],
  },
  {
    id: '00039',
    summary: 'ignores a trailing dot key in max, preserves the range and accepts valid input afterward',
    field: 'max',
    separator: '.',
    tags: ['@edgeCase', '@decimal', '@keyboard', '@recovery', '@max', '@dotDecimal'],
  },
  {
    id: '00029',
    summary: 'clears min after a comma key, preserves max and accepts valid input afterward',
    field: 'min',
    separator: ',',
    tags: ['@negative', '@decimal', '@keyboard', '@recovery', '@min', '@commaDecimal'],
  },
  {
    id: '00037',
    summary: 'clears max after a comma key, preserves min and accepts valid input afterward',
    field: 'max',
    separator: ',',
    tags: ['@negative', '@decimal', '@keyboard', '@recovery', '@max', '@commaDecimal'],
  },
];

const clipboardDecimalCases: readonly PriceDecimalInputTestCase[] = [
  {
    id: '00044',
    summary: 'rejects a pasted dot decimal in min, preserves max and recovers',
    field: 'min',
    separator: '.',
    tags: ['@negative', '@decimal', '@clipboard', '@recovery', '@min', '@dotDecimal'],
  },
  {
    id: '00045',
    summary: 'rejects a pasted dot decimal in max, preserves min and recovers',
    field: 'max',
    separator: '.',
    tags: ['@negative', '@decimal', '@clipboard', '@recovery', '@max', '@dotDecimal'],
  },
  {
    id: '00046',
    summary: 'rejects a pasted comma decimal in min, preserves max and recovers',
    field: 'min',
    separator: ',',
    tags: ['@negative', '@decimal', '@clipboard', '@recovery', '@min', '@commaDecimal'],
  },
  {
    id: '00047',
    summary: 'rejects a pasted comma decimal in max, preserves min and recovers',
    field: 'max',
    separator: ',',
    tags: ['@negative', '@decimal', '@clipboard', '@recovery', '@max', '@commaDecimal'],
  },
];

for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: decimal keyboard input (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@validation'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      for (const priceFieldTestCase of keyboardSeparatorCases) {
        test(
          `[${testPlatform.prefix}-${priceFieldTestCase.id}] ${priceFieldTestCase.summary}`,
          { tag: [...priceFieldTestCase.tags] },
          async function ({ category, priceSamples }, testInfo) {
            const priceSelection = PriceHelper.getSelectionAfterTypedSeparator(
              priceSamples.narrowingPriceRange,
              priceFieldTestCase.field,
              priceFieldTestCase.separator,
            );
            await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
            await category.priceFilter.appendPriceInputUsingKeyboard(
              priceFieldTestCase.field,
              priceFieldTestCase.separator,
            );
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
            await category.priceFilter.waitForSelection(priceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();
            const productListing = await category.getProductListing();
            await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
            PriceAssertions.assertPrices(productListing.products, priceSelection);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();

            await category.priceFilter.setMinMaxPrices(priceSamples.replacementRange);
            const productListingAfterValidInput = await category.getProductListing();
            await PriceReportHelper.attachProductListing(
              testInfo,
              priceSamples.replacementRange,
              productListingAfterValidInput,
            );
            PriceAssertions.assertPrices(productListingAfterValidInput.products, priceSamples.replacementRange);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.replacementRange);
            await category.priceFilter.closeMobilePanelIfOpen();
          },
        );
      }
    },
  );

  test.describe(
    `Price filter: decimal clipboard input (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@validation'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      for (const priceFieldTestCase of clipboardDecimalCases) {
        test(
          `[${testPlatform.prefix}-${priceFieldTestCase.id}] ${priceFieldTestCase.summary}`,
          { tag: [...priceFieldTestCase.tags] },
          async function ({ category, priceSamples }, testInfo) {
            const priceSelection = PriceHelper.getOppositeSelection(
              priceSamples.narrowingPriceRange,
              priceFieldTestCase.field,
            );
            const decimalPriceAmount = PriceHelper.getDecimalAmount(
              priceSamples.narrowingPriceRange,
              priceFieldTestCase.field,
            );
            const inputText = decimalPriceAmount.toString().replace('.', priceFieldTestCase.separator);
            await category.priceFilter.setMinMaxPrices(priceSelection);
            await category.priceFilter.enterValue(priceFieldTestCase.field, inputText, 'clipboard');
            await PriceAssertions.assertRejectedInput(category.priceFilter, priceFieldTestCase.field);
            await category.priceFilter.waitForSelection(priceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();
            const productListing = await category.getProductListing();
            await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
            PriceAssertions.assertPrices(productListing.products, priceSelection);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
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
