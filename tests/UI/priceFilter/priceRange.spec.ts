import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test, expect } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Records range-suite results from the saved desktop run on November 12, 2026: 2 passed, 2 failed.
 * Tests require nonempty main results and every displayed current price within the inclusive UI-derived bounds.
 * Amounts and product names below describe that run and are not fixed test inputs.
 *
 * Recorded failures:
 * - WEB-00004: after applying only max 8354, Tiziana Terenzi Kirke had current UI price 10473.
 * - WEB-00005: after applying min 849 and max 8354, the same current UI price 10473 exceeded the maximum.
 * Both cases committed the requested bounds and failed at assertPrices before the final input-field checks.
 * WEB-00003 (minimum only) and WEB-00006 (equal bounds and inclusive-price matching) passed.
 *
 * Catalog requests returned HTTP 200; API price.current and defaultVariant.price.current were also 10473.
 * Kirke has a conditional multi-item discount, so the filter's pricing contract needs product clarification.
 * These are candidate contract mismatches under the current displayed-price checks.
 * Diagnosis used saved traces, screenshots and the HTML report; no new live run or mobile verification was performed.
 */
for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: ranges (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@range'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      test(
        `[${testPlatform.prefix}-00003] filters by the lower boundary only`,
        { tag: ['@positive', '@min'] },
        async function ({ category, priceSamples, initialProducts }, testInfo) {
          const priceSelection = { min: priceSamples.narrowingPriceRange.min };
          expect(
            PriceHelper.pricesOutsideRange(initialProducts, priceSelection).length,
            `Insufficient UI data: minimum ${priceSelection.min} must exclude an initial product price`,
          ).toBeGreaterThan(0);
          await category.priceFilter.setMinMaxPrices(priceSelection);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSelection);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00004] filters by the upper boundary only`,
        { tag: ['@positive', '@max'] },
        async function ({ category, priceSamples, initialProducts }, testInfo) {
          const priceSelection = { max: priceSamples.narrowingPriceRange.max };
          expect(
            PriceHelper.pricesOutsideRange(initialProducts, priceSelection).length,
            `Insufficient UI data: maximum ${priceSelection.max} must exclude an initial product price`,
          ).toBeGreaterThan(0);
          await category.priceFilter.setMinMaxPrices(priceSelection);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSelection);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00005] filters by both boundaries`,
        { tag: ['@positive', '@bothBounds'] },
        async function ({ category, priceSamples, initialProducts }, testInfo) {
          expect(
            initialProducts.some(({ price }) => price < priceSamples.narrowingPriceRange.min),
            `Insufficient UI data: an initial price must be below the selected minimum ${priceSamples.narrowingPriceRange.min}`,
          ).toBe(true);
          expect(
            initialProducts.some(({ price }) => price > priceSamples.narrowingPriceRange.max),
            `Insufficient UI data: an initial price must be above the selected maximum ${priceSamples.narrowingPriceRange.max}`,
          ).toBe(true);
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSamples.narrowingPriceRange, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSamples.narrowingPriceRange);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00006] includes an observed price when both boundaries equal it`,
        { tag: ['@edgeCase', '@inclusiveBoundary'] },
        async function ({ category, priceSamples }, testInfo) {
          const priceSelection = {
            min: priceSamples.observedBoundaryPrice,
            max: priceSamples.observedBoundaryPrice,
          };
          await category.priceFilter.setMinMaxPrices(priceSelection);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSelection);
          const products = productListing.products;
          expect(
            products.every(({ price }) => price === priceSamples.observedBoundaryPrice),
            `Equal bounds must return only current prices equal to ${priceSamples.observedBoundaryPrice}`,
          ).toBe(true);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );
    },
  );
}
