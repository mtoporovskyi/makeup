import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test, expect } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Records state-suite results from the saved desktop run on November 12, 2026: 1 passed, 1 failed.
 * Amounts and product names below describe that run and are not fixed test inputs.
 *
 * Recorded failures:
 * - WEB-00002: after applying the initial range 849–8354, Tiziana Terenzi Kirke had current UI price 10473.
 *   The initial assertPrices check failed because that price exceeded the selected maximum.
 *   Initial input-field checks, the replacement-range precondition and the range replacement were not reached.
 *   This failure does not establish whether replacing an applied range works.
 * WEB-00001 (empty initial fields and finite, nonnegative current product prices) passed.
 *
 * The catalog request committed both bounds and returned HTTP 200;
 * API price.current and defaultVariant.price.current were also 10473.
 * The filter's pricing contract needs product clarification, as noted in the other range-failure summaries.
 * Diagnosis used saved traces, screenshots and the HTML report; no new live run or mobile verification was performed.
 */
for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: state (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@state'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      test(
        `[${testPlatform.prefix}-00001] shows empty price fields and current product prices initially`,
        { tag: ['@positive', '@initialState'] },
        async function ({ category, initialProducts }) {
          expect(
            initialProducts.length,
            'The unfiltered main listing must contain products with current prices',
          ).toBeGreaterThan(0);
          expect(
            initialProducts.every(({ price }) => Number.isFinite(price) && price >= 0),
            'Every initial current product price must be finite and nonnegative',
          ).toBe(true);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, {});
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00002] replaces an applied range with the latest boundaries`,
        { tag: ['@positive', '@rangeChange'] },
        async function ({ category, priceSamples }, testInfo) {
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListingBeforeRangeChange = await category.getProductListing();
          await PriceReportHelper.attachProductListing(
            testInfo,
            priceSamples.narrowingPriceRange,
            productListingBeforeRangeChange,
          );
          PriceAssertions.assertPrices(productListingBeforeRangeChange.products, priceSamples.narrowingPriceRange);
          const productsBeforeRangeChange = productListingBeforeRangeChange.products;
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
          await category.priceFilter.closeMobilePanelIfOpen();
          expect(
            PriceHelper.pricesOutsideRange(productsBeforeRangeChange, priceSamples.replacementRange).length,
            `The replacement range ${JSON.stringify(priceSamples.replacementRange)} must exclude a price from the initial filtered results`,
          ).toBeGreaterThan(0);
          await category.priceFilter.setMinMaxPrices(priceSamples.replacementRange);
          const productListingAfterRangeChange = await category.getProductListing();
          await PriceReportHelper.attachProductListing(
            testInfo,
            priceSamples.replacementRange,
            productListingAfterRangeChange,
          );
          PriceAssertions.assertPrices(productListingAfterRangeChange.products, priceSamples.replacementRange);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.replacementRange);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );
    },
  );
}
