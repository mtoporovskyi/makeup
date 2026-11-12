import { test, expect } from '../../../src/fixtures/categoryFixtures.js';
import { CatalogClient } from '../../../src/api/catalogClient.js';
import { CatalogAssertions } from '../../../src/assertions/catalogAssertions.js';
import { PriceAssertions } from '../../../src/assertions/priceAssertions.js';
import { PriceHelper } from '../../../src/helpers/priceHelper.js';
import { PriceReportHelper } from '../../../src/helpers/priceReportHelper.js';
import { UrlHelper } from '../../../src/helpers/urlHelper.js';
import { categoryData } from '../../../src/data/categoryData.js';
import { testPlatforms } from '../../../src/data/testPlatforms.js';
import type { PriceSortOption } from '../../../src/interfaces/catalog.js';

/**
 * Earlier desktop run (2026-11-12): 0 passed, 2 failed for range 2240–2407.
 * WEB-00042: first-page UI prices 1898, 2507 and 1510 were outside the range.
 * WEB-00043: first-page UI price 3238 exceeded max 2407.
 * Both passed coverage checks for 14 pages/498 items; ordering and UI/API matching were not reached.
 * API current prices matched the outliers. Pricing semantics need clarification; mobile was not reviewed.
 */
const priceSortOptions = [
  {
    caseId: '00042',
    summary: 'checks the first UI page and all subsequent API pages with cheapest products first',
    direction: 'ascending',
    value: 'priceAsc',
    label: 'Від найдешевших',
    tag: '@priceAscending',
  },
  {
    caseId: '00043',
    summary: 'checks the first UI page and all subsequent API pages with most expensive products first',
    direction: 'descending',
    value: 'priceDesc',
    label: 'Від найдорожчих',
    tag: '@priceDescending',
  },
] as const satisfies readonly PriceSortOption[];

for (const testPlatform of testPlatforms) {
  test.describe(
    `Price filter: sorting and complete pagination (${testPlatform.prefix})`,
    { tag: [testPlatform.tag, '@e2e', '@priceFilter', '@sorting', '@pagination', '@api'] },
    function () {
      test.use({ categoryUrl: categoryData.perfumeryUrl });

      for (const priceSortOption of priceSortOptions) {
        test(
          `[${testPlatform.prefix}-${priceSortOption.caseId}] ${priceSortOption.summary}`,
          { tag: ['@positive', priceSortOption.tag] },
          async function ({ category, initialProducts, page }, testInfo) {
            test.slow(true, 'Checks the first UI page and every remaining API page');
            const priceSelection = PriceHelper.choosePaginationRange(initialProducts.map(({ price }) => price));
            await category.priceFilter.setMinMaxPrices(priceSelection);

            const sortingResponse = await category.priceSorting.selectPriceSortingAndCaptureResponse(
              priceSortOption,
              priceSelection,
            );
            const firstPageData = await CatalogClient.getResponse(sortingResponse);
            const firstPageProductListing = await category.getProductListing();
            await PriceReportHelper.attachProductListing(testInfo, priceSelection, firstPageProductListing);

            CatalogAssertions.assertMultiplePages(firstPageData);

            const catalogClient = new CatalogClient(page.request);
            const remainingApiPages = await catalogClient.getRemainingPages(firstPageData);

            const allCatalogPages = [firstPageData, ...remainingApiPages];
            await PriceReportHelper.attachCatalogCoverage(testInfo, priceSelection, [firstPageData], remainingApiPages);

            CatalogAssertions.assertCompleteCoverage(allCatalogPages, firstPageData);

            PriceAssertions.assertPrices(firstPageProductListing.products, priceSelection);
            PriceAssertions.assertSortedPrices(firstPageProductListing.products, priceSortOption.direction);
            CatalogAssertions.assertUiMatchesResponse(firstPageProductListing.products, firstPageData);
            await category.priceSorting.openSortingMenu();
            await expect(
              category.priceSorting.selectedOption,
              'The sorting control must display the option selected by the test',
            ).toContainText(priceSortOption.label);
            await category.priceSorting.closeSortingMenu();
            await expect(page, 'Selecting a sorting option must leave the UI on the first catalog page').toHaveURL(
              (url) => UrlHelper.isFirstCatalogPage(url),
            );
            await category.priceFilter.openMobilePanelIfNeeded();
            await PriceAssertions.assertSelectedRange(category.priceFilter, priceSelection);
            await category.priceFilter.closeMobilePanelIfOpen();

            for (const catalogPageData of allCatalogPages) {
              CatalogAssertions.assertQuery(catalogPageData, priceSelection, priceSortOption);
              PriceAssertions.assertApiPrices(catalogPageData, priceSelection);
            }

            PriceAssertions.assertSortedPrices(
              [...allCatalogPages]
                .sort((left, right) => left.offset - right.offset)
                .flatMap(({ products }) => products),
              priceSortOption.direction,
            );
          },
        );
      }
    },
  );
}
