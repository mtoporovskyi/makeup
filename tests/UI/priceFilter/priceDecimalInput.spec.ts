import type { PriceDecimalInputTestCase } from '../../../src/interfaces/priceTestCases.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Documents the expected keyboard/clipboard behavior and failures observed on November 12, 2026.
 *
 * UI investigation found that a trailing dot key leaves the integer unchanged, while a comma key
 * clears the populated field. These observations were adopted as expected behavior.
 * Pasted decimals must be rejected safely, preserving the other bound and category results.
 * HTTP 422 followed by a not-found page remains a failing regression.
 *
 * Recorded failures (amounts are diagnostic examples, not fixed test data):
 * - WEB-00044/MOB-00044: pasted min 849.5 caused HTTP 422 ("Price from must be an integer.") and not-found UI.
 * - WEB-00045/MOB-00045: pasted max 8353.5 caused HTTP 422 ("Price to must be an integer.") and not-found UI.
 *   Both pairs failed because the edited field disappeared instead of being cleared safely.
 * - WEB-00031/MOB-00031, WEB-00039/MOB-00039 and WEB-00047/MOB-00047 passed input checks, then failed
 *   because a current UI price of 10473 exceeded the selected maximum of 8354.
 * - WEB-00029/MOB-00029 and WEB-00046/MOB-00046 failed on the same 10473 > 8354 price violation with min cleared.
 * - WEB-00037/MOB-00037 passed comma-key checks, then failed during valid-input recovery:
 *   a current UI price of 1350 was below the replacement range's minimum of 2405.
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
