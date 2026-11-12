import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test, expect } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier desktop run (2026-11-12): 0 passed, 4 failed.
 * WEB-00007–00010: initial range 849–8354 returned Kirke price 10473.
 * All failed before reset/clearing, so those actions were not verified.
 * Pricing semantics need clarification; mobile was not reviewed.
 */
for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: reset and clearing (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@reset'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      test(
        `[${testPlatform.prefix}-00007] resets the price filter through the visible reset control`,
        { tag: ['@positive', '@resetButton'] },
        async function ({ category, priceSamples }, testInfo) {
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSamples.narrowingPriceRange, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSamples.narrowingPriceRange);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
          await category.priceFilter.closeMobilePanelIfOpen();
          await category.priceFilter.resetPriceFilter();
          const productListingAfterReset = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, {}, productListingAfterReset);
          PriceAssertions.assertPrices(productListingAfterReset.products, {});
          const products = productListingAfterReset.products;
          expect(
            PriceHelper.pricesOutsideRange(products, priceSamples.narrowingPriceRange).length,
            `Reset must restore prices outside the previous range ${JSON.stringify(priceSamples.narrowingPriceRange)}`,
          ).toBeGreaterThan(0);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, {});
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00008] restores the unrestricted range by clearing both fields`,
        { tag: ['@positive', '@clear', '@bothBounds'] },
        async function ({ category, priceSamples }, testInfo) {
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSamples.narrowingPriceRange, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSamples.narrowingPriceRange);
          await category.priceFilter.setMinMaxPrices({});
          const productListingAfterClearingBothBounds = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, {}, productListingAfterClearingBothBounds);
          PriceAssertions.assertPrices(productListingAfterClearingBothBounds.products, {});
          const products = productListingAfterClearingBothBounds.products;
          expect(
            PriceHelper.pricesOutsideRange(products, priceSamples.narrowingPriceRange).length,
            `Clearing both bounds must restore prices outside the previous range ${JSON.stringify(priceSamples.narrowingPriceRange)}`,
          ).toBeGreaterThan(0);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, {});
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00009] clears the lower boundary while preserving the upper boundary`,
        { tag: ['@positive', '@clear', '@min'] },
        async function ({ category, priceSamples }, testInfo) {
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSamples.narrowingPriceRange, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSamples.narrowingPriceRange);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
          await category.priceFilter.closeMobilePanelIfOpen();

          const priceSelection = { max: priceSamples.narrowingPriceRange.max };
          await category.priceFilter.setMinMaxPrices(priceSelection);
          const productListingAfterClearingMin = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListingAfterClearingMin);
          PriceAssertions.assertPrices(productListingAfterClearingMin.products, priceSelection);
          const products = productListingAfterClearingMin.products;
          expect(
            products.some(({ price }) => price < priceSamples.narrowingPriceRange.min),
            `Clearing min must restore prices below the previous minimum ${priceSamples.narrowingPriceRange.min}`,
          ).toBe(true);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00010] clears the upper boundary while preserving the lower boundary`,
        { tag: ['@positive', '@clear', '@max'] },
        async function ({ category, priceSamples }, testInfo) {
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSamples.narrowingPriceRange, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSamples.narrowingPriceRange);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
          await category.priceFilter.closeMobilePanelIfOpen();

          const priceSelection = { min: priceSamples.narrowingPriceRange.min };
          await category.priceFilter.setMinMaxPrices(priceSelection);
          const productListingAfterClearingMax = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListingAfterClearingMax);
          PriceAssertions.assertPrices(productListingAfterClearingMax.products, priceSelection);
          const products = productListingAfterClearingMax.products;
          expect(
            products.some(({ price }) => price > priceSamples.narrowingPriceRange.max),
            `Clearing max must restore prices above the previous maximum ${priceSamples.narrowingPriceRange.max}`,
          ).toBe(true);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );
    },
  );
}
