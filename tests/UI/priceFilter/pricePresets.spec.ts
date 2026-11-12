import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test, expect } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier desktop run (2026-11-12): 1 passed, 3 failed.
 * WEB-00011: preset 100–250 returned prices 266 and 357; later presets were not reached.
 * WEB-00012: manual range 849–8354 returned price 10473 after the first preset passed.
 * WEB-00013: the same initial-range failure blocked open-ended preset selection.
 * WEB-00014 passed. Pricing semantics need clarification; mobile was not reviewed.
 */
for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: presets (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@presets'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      test(
        `[${testPlatform.prefix}-00011] applies every displayed price preset and replaces the previous preset`,
        { tag: ['@positive', '@allPresets'] },
        async function ({ category }, testInfo) {
          test.slow(true, 'Applies and checks every currently displayed price preset in sequence');
          const pricePresets = await category.priceFilter.readPresets();
          expect(
            pricePresets.length,
            'At least two price presets must be available to verify preset replacement',
          ).toBeGreaterThan(1);
          expect(
            new Set(pricePresets.map(({ label }) => label)).size,
            'Price preset labels must be unique for exact button selection',
          ).toBe(pricePresets.length);

          for (const pricePreset of pricePresets) {
            await category.priceFilter.applyPricePreset(pricePreset);
            const productListing = await category.getProductListing();
            await PriceReportHelper.attachProductListing(testInfo, pricePreset.selection, productListing);
            PriceAssertions.assertPrices(productListing.products, pricePreset.selection);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, pricePreset.selection);
            await category.priceFilter.closeMobilePanelIfOpen();
          }
        },
      );

      test(
        `[${testPlatform.prefix}-00012] replaces a preset with manually entered boundaries`,
        { tag: ['@positive', '@presetToInput'] },
        async function ({ category, priceSamples }, testInfo) {
          const pricePresets = await category.priceFilter.readPresets();
          const pricePreset = PriceHelper.getPricePresetByIndex(pricePresets, 0);
          await category.priceFilter.applyPricePreset(pricePreset);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, pricePreset.selection, productListing);
          PriceAssertions.assertPrices(productListing.products, pricePreset.selection);

          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListingAfterManualRange = await category.getProductListing();
          await PriceReportHelper.attachProductListing(
            testInfo,
            priceSamples.narrowingPriceRange,
            productListingAfterManualRange,
          );
          PriceAssertions.assertPrices(productListingAfterManualRange.products, priceSamples.narrowingPriceRange);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSamples.narrowingPriceRange);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00013] replaces manually entered boundaries with an open-ended preset`,
        { tag: ['@positive', '@inputToPreset', '@openEnded'] },
        async function ({ category, priceSamples }, testInfo) {
          await category.priceFilter.setMinMaxPrices(priceSamples.narrowingPriceRange);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSamples.narrowingPriceRange, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSamples.narrowingPriceRange);

          const pricePresets = await category.priceFilter.readPresets();
          const pricePreset = PriceHelper.getPricePresetByIndex(pricePresets, -1);
          expect(
            pricePreset.selection.max,
            `Preset "${pricePreset.label}" must have no upper bound to verify an open-ended selection`,
          ).toBeUndefined();
          await category.priceFilter.applyPricePreset(pricePreset);
          const productListingAfterPreset = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, pricePreset.selection, productListingAfterPreset);
          PriceAssertions.assertPrices(productListingAfterPreset.products, pricePreset.selection);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, pricePreset.selection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );

      test(
        `[${testPlatform.prefix}-00014] resets a selected preset through the visible reset control`,
        { tag: ['@positive', '@resetButton'] },
        async function ({ category }, testInfo) {
          const pricePresets = await category.priceFilter.readPresets();
          const pricePreset = PriceHelper.getPricePresetByIndex(pricePresets, 0);
          await category.priceFilter.applyPricePreset(pricePreset);
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, pricePreset.selection, productListing);
          PriceAssertions.assertPrices(productListing.products, pricePreset.selection);

          await category.priceFilter.resetPriceFilter();
          const productListingAfterReset = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, {}, productListingAfterReset);
          PriceAssertions.assertPrices(productListingAfterReset.products, {});
          const products = productListingAfterReset.products;
          expect(
            PriceHelper.pricesOutsideRange(products, pricePreset.selection).length,
            `Resetting preset "${pricePreset.label}" must restore prices outside its previous bounds`,
          ).toBeGreaterThan(0);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, {});
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );
    },
  );
}
