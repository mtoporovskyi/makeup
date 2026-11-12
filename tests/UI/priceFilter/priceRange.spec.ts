import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test, expect } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier desktop run (2026-11-12): 2 passed, 2 failed.
 * WEB-00004 and WEB-00005: Kirke price 10473 exceeded max 8354; final field checks were not reached.
 * WEB-00003 and WEB-00006 passed. API current prices matched UI.
 * Conditional-discount pricing needs clarification; mobile was not reviewed.
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
