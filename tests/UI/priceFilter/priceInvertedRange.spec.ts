import type { PriceFieldTestCase } from '../../../src/interfaces/priceTestCases.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier desktop run (2026-11-12): 0 passed, 2 failed after fill() and blur.
 * WEB-00040 retained max 849 below min 8354; WEB-00041 retained min 8354 above max 849.
 * API returned HTTP 200; tests stopped before price/recovery checks.
 * Clearing the edited inverted bound remains a proposed requirement; mobile was not reviewed.
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
