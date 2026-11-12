import type { APIRequestContext, APIResponse, Response } from '@playwright/test';
import { BaseApi } from './baseApi.js';
import { ParseCatalogHelper } from '../helpers/parseCatalogHelper.js';
import type { CatalogPageData } from '../interfaces/catalog.js';

export class CatalogClient extends BaseApi {
  private static readonly requestConcurrency = 4;

  constructor(request: APIRequestContext) {
    super(request);
  }

  /**
   * Parses the exact browser/API response without replacing displayed prices with variants.
   *
   * @param response - Response captured from UI navigation or a remaining-page request.
   * @returns Validated pagination metadata and current API prices.
   * @throws Error for an unsuccessful HTTP response or invalid catalog JSON.
   */
  static async getResponse(response: Response | APIResponse): Promise<CatalogPageData> {
    const responseJson = await CatalogClient.getResponseJson(response);
    return ParseCatalogHelper.parsePage(responseJson, response.url());
  }

  /**
   * Fetches every page after the first UI page, in bounded parallel batches.
   *
   * @param firstPageData - Actual UI response supplying the endpoint, filters and page size.
   * @returns All remaining catalog pages; no page-count cap is applied.
   */
  async getRemainingPages(firstPageData: CatalogPageData): Promise<CatalogPageData[]> {
    const pageCount = Math.ceil(firstPageData.total / firstPageData.perPage);
    const remainingPageOffsets = Array.from(
      { length: Math.max(pageCount - 1, 0) },
      (_, index) => (index + 1) * firstPageData.perPage,
    );
    const remainingCatalogPages: CatalogPageData[] = [];

    for (
      let batchStartIndex = 0;
      batchStartIndex < remainingPageOffsets.length;
      batchStartIndex += CatalogClient.requestConcurrency
    ) {
      const offsetBatch = remainingPageOffsets.slice(
        batchStartIndex,
        batchStartIndex + CatalogClient.requestConcurrency,
      );
      remainingCatalogPages.push(
        ...(await Promise.all(offsetBatch.map((offset) => this.getPage(firstPageData.url, offset)))),
      );
    }

    return remainingCatalogPages;
  }

  /**
   * Changes only the offset of the observed request, retaining all filters and sort parameters.
   */
  private async getPage(templateUrl: string, offset: number): Promise<CatalogPageData> {
    const url = new URL(templateUrl);
    url.searchParams.set('offset', String(offset));
    return CatalogClient.getResponse(await this.get(url.toString()));
  }
}
