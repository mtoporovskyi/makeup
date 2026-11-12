import type { PriceInputTestCase } from '../../../src/interfaces/priceTestCases.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import { test } from '../../../src/fixtures/categoryFixtures.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';

/**
 * Earlier desktop run (2026-11-12): 5 passed, 4 failed.
 * WEB-00019–00022: Kirke current UI/API price 10473 exceeded max 8354.
 * WEB-00015–00018 and WEB-00023 passed; mobile was not reviewed.
 * Conditional-discount pricing needs product clarification.
 */
const priceInputCases: readonly PriceInputTestCase[] = [
  {
    id: '00015',
    summary: 'applies the min boundary entered using keyboard',
    field: 'min',
    method: 'keyboard',
    tags: ['@positive', '@min', '@keyboard'],
  },
  {
    id: '00016',
    summary: 'applies the min boundary entered using clipboard',
    field: 'min',
    method: 'clipboard',
    tags: ['@positive', '@min', '@clipboard'],
  },
  {
    id: '00017',
    summary: 'applies the min boundary with leading zeros',
    field: 'min',
    method: 'fill',
    format: 'leading zeros',
    tags: ['@positive', '@formatting', '@min', '@leadingZeros'],
  },
  {
    id: '00018',
    summary: 'applies the min boundary with surrounding spaces',
    field: 'min',
    method: 'fill',
    format: 'surrounding spaces',
    tags: ['@positive', '@formatting', '@min', '@surroundingSpaces'],
  },
  {
    id: '00019',
    summary: 'applies the max boundary entered using keyboard',
    field: 'max',
    method: 'keyboard',
    tags: ['@positive', '@max', '@keyboard'],
  },
  {
    id: '00020',
    summary: 'applies the max boundary entered using clipboard',
    field: 'max',
    method: 'clipboard',
    tags: ['@positive', '@max', '@clipboard'],
  },
  {
    id: '00021',
    summary: 'applies the max boundary with leading zeros',
    field: 'max',
    method: 'fill',
    format: 'leading zeros',
    tags: ['@positive', '@formatting', '@max', '@leadingZeros'],
  },
  {
    id: '00022',
    summary: 'applies the max boundary with surrounding spaces',
    field: 'max',
    method: 'fill',
    format: 'surrounding spaces',
    tags: ['@positive', '@formatting', '@max', '@surroundingSpaces'],
  },
];

for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: manual input (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@input'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      for (const priceFieldTestCase of priceInputCases) {
        test(
          `[${testPlatform.prefix}-${priceFieldTestCase.id}] ${priceFieldTestCase.summary}`,
          { tag: [...priceFieldTestCase.tags] },
          async function ({ category, priceSamples }, testInfo) {
            const priceAmount = priceSamples.narrowingPriceRange[priceFieldTestCase.field];
            const inputText = PriceHelper.formatInput(priceAmount, priceFieldTestCase.format);
            const priceSelection = { [priceFieldTestCase.field]: priceAmount };
            await category.priceFilter.enterValue(priceFieldTestCase.field, inputText, priceFieldTestCase.method);
            await category.priceFilter.waitForSelection(priceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();
            const productListing = await category.getProductListing();
            await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
            PriceAssertions.assertPrices(productListing.products, priceSelection);
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();
          },
        );
      }

      test(
        `[${testPlatform.prefix}-00023] normalizes a zero lower boundary to the unrestricted range`,
        { tag: ['@edgeCase', '@zeroBoundary', '@min'] },
        async function ({ category }, testInfo) {
          const priceSelection = {};
          await category.priceFilter.enterValue('min', '0', 'fill');
          await category.priceFilter.waitForSelection(priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
          const productListing = await category.getProductListing();
          await PriceReportHelper.attachProductListing(testInfo, priceSelection, productListing);
          PriceAssertions.assertPrices(productListing.products, priceSelection);
          await category.priceFilter.openMobilePanelIfNeeded();
          await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
          await category.priceFilter.closeMobilePanelIfOpen();
        },
      );
    },
  );
}
