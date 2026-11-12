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
 * Records sorting-suite results from the saved desktop run on November 12, 2026: 0 passed, 2 failed.
 * Both cases applied the UI-derived range 2240–2407 and failed on current prices in the first UI page.
 * Amounts and product names below describe that run and are not fixed test inputs.
 *
 * Recorded failures:
 * - WEB-00042 (ascending): Shiseido Ginza Night Eau De Parfum Intense cost 1898,
 *   La Sultane de Saba Malaisie Champaka Fleurs Tropicales cost 2507,
 *   and Sol de Janeiro Cheirosa '59 cost 1510; all three prices were outside the selected range.
 * - WEB-00043 (descending): Rabanne Fame Intense cost 3238, above the selected maximum 2407.
 *
 * Catalog requests retained the selected bounds and sort and returned HTTP 200.
 * Both cases fetched all 14 pages (498 items, perPage 36, offsets 0–468) and passed complete-coverage checks.
 * The first-page API price.current and defaultVariant.price.current matched the reported out-of-range UI prices.
 * First-page ordering, UI/response matching, selected controls, per-page query/API-price assertions
 * and global ordering were not reached after the first-page assertPrices failure.
 * These are candidate pricing-contract mismatches; variant/discount semantics need product clarification.
 * This run does not establish whether ascending or descending current-price ordering is correct.
 * Diagnosis used saved traces, screenshots and the HTML report; no new live run or mobile verification was performed.
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
