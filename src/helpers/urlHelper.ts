export class UrlHelper {
  private constructor() {}

  /**
   * Parses the URL fragment as parameters used by the catalog UI.
   *
   * @param url - Current browser URL supplied by a Playwright URL assertion.
   * @returns Hash parameters without the leading hash character.
   */
  static getHashParameters(url: URL): URLSearchParams {
    return new URLSearchParams(url.hash.slice(1));
  }

  /**
   * Checks whether the catalog hash points to the first page.
   * An omitted offset represents the first page, just like an explicit zero.
   */
  static isFirstCatalogPage(url: URL): boolean {
    return (UrlHelper.getHashParameters(url).get('offset') ?? '0') === '0';
  }
}
