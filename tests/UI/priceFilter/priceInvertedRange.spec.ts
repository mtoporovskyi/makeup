import type { PriceFieldTestCase } from '../../../src/interfaces/priceTestCases.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Records inverted-range failures from the saved desktop run on November 12, 2026: 0 passed, 2 failed.
 * These scenarios use explicit fill() followed by blur; keyboard and clipboard behavior was not verified.
 * The proposed contract requires clearing the edited boundary when min exceeds max, preserving the
 * other boundary and category results. This rejection rule still needs product confirmation.
 *
 * Recorded failures (amounts describe that run and are not fixed test inputs):
 * - WEB-00040: min 8354 was selected before entering max 849. The max field retained "849" instead of clearing.
 * - WEB-00041: max 849 was selected before entering min 8354. The min field retained "8354" instead of clearing.
 * Both requests sent priceFrom=8354 and priceTo=849; the catalog API returned HTTP 200.
 * The UI retained both inverted bounds and displayed results. Tests stopped at assertRejectedInput,
 * so subsequent selection, product-price and valid-input recovery checks were not reached.
 * Findings come from saved traces and screenshots; no new live run or mobile verification was performed.
 */
const invertedPriceCases: readonly PriceFieldTestCase[] = [
  {
    id: '00040',
    summary: 'rejects an upper boundary below the selected lower boundary and recovers',
    field: 'max',
    tags: ['@negative', '@invertedRange', '@recovery', '@max'],
  },
  {
    id: '00041',
    summary: 'rejects a lower boundary above the selected upper boundary and recovers',
    field: 'min',
    tags: ['@negative', '@invertedRange', '@recovery', '@min'],
  },
];

for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: inverted range (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@validation'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      for (const priceFieldTestCase of invertedPriceCases) {
        test(
          `[${testPlatform.prefix}-${priceFieldTestCase.id}] ${priceFieldTestCase.summary}`,
          { tag: [...priceFieldTestCase.tags] },
          async function ({ category, priceSamples }, testInfo) {
            const invertedPriceRange = {
              min: priceSamples.narrowingPriceRange.max,
              max: priceSamples.narrowingPriceRange.min,
            };
            const preservedPriceSelection = PriceHelper.getOppositeSelection(
              invertedPriceRange,
              priceFieldTestCase.field,
            );
            await category.priceFilter.setMinMaxPrices(preservedPriceSelection);
            await category.priceFilter.enterValue(
              priceFieldTestCase.field,
              invertedPriceRange[priceFieldTestCase.field].toString(),
              'fill',
            );
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
