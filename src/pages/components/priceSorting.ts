import type { Locator, Page, Response } from '@playwright/test';
import type { PriceSortOption } from '../../interfaces/catalog.js';
import type { PriceRange } from '../../interfaces/prices.js';
import type { Waiter } from '../../helpers/waiter.js';

export class PriceSorting {
  readonly selectedOption: Locator;
  private readonly desktopSortingButton: Locator;
  private readonly mobileSortingButton: Locator;
  private readonly mobileCloseButton: Locator;
  private readonly mobilePanel: Locator;
  private readonly visibleSortingOptions: Locator;
  private readonly cheapestOption: Locator;
  private readonly mostExpensiveOption: Locator;

  constructor(
    page: Page,
    results: Locator,
    private readonly waiter: Waiter,
  ) {
    const desktopSortingMenu = results.locator('.SortingMenu__sorting');
    this.desktopSortingButton = desktopSortingMenu.locator('.SortingMenu__button');
    this.mobileSortingButton = page.getByRole('main').getByRole('button', { name: /Сортування$/u });
    this.mobilePanel = page.locator('#SortingList');
    this.mobileCloseButton = this.mobilePanel.getByRole('button', {
      name: 'makeup-close-light-outline',
      exact: true,
    });
    this.visibleSortingOptions = desktopSortingMenu
      .locator('.SortingMenu__options')
      .or(this.mobilePanel)
      .filter({ visible: true });
    this.selectedOption = desktopSortingMenu
      .locator('.SortingMenu__title')
      .or(this.mobilePanel.locator('.SortingListContent__isSelected'))
      .filter({ visible: true });
    this.cheapestOption = this.visibleSortingOptions.getByRole('button', {
      name: /^Від найдешевших(?:\s|$)/u,
    });
    this.mostExpensiveOption = this.visibleSortingOptions.getByRole('button', {
      name: /^Від найдорожчих(?:\s|$)/u,
    });
  }

  /**
   * Opens the visible desktop menu or mobile sorting sheet for interaction or checks.
   */
  async openSortingMenu(): Promise<void> {
    if (await this.desktopSortingButton.isVisible()) {
      await this.desktopSortingButton.click();
    } else {
      await this.mobileSortingButton.click();
    }

    await this.waiter.waitForVisible(this.visibleSortingOptions);
  }

  /**
   * Closes the prepared sorting menu without changing the selected option.
   */
  async closeSortingMenu(): Promise<void> {
    if (await this.mobileCloseButton.isVisible()) {
      await this.mobileCloseButton.click();
      await this.waiter.waitForHidden(this.mobilePanel);
    } else if (await this.visibleSortingOptions.isVisible()) {
      await this.desktopSortingButton.click();
      await this.waiter.waitForHidden(this.visibleSortingOptions);
    }
  }

  /**
   * Selects price sorting through UI and captures its exact filtered first-page response.
   *
   * @param priceSortOption - Direction and observed query value for the selected price sort.
   * @param priceSelection - Price boundaries already applied through UI.
   * @returns The browser response associated with the committed sorting action.
   */
  async selectPriceSortingAndCaptureResponse(
    priceSortOption: PriceSortOption,
    priceSelection: PriceRange,
  ): Promise<Response> {
    await this.openSortingMenu();
    const sortOptionButton = priceSortOption.direction === 'ascending' ? this.cheapestOption : this.mostExpensiveOption;
    const [response] = await Promise.all([
      this.waiter.waitForSortingResponse(priceSortOption, priceSelection),
      sortOptionButton.click(),
    ]);
    await this.waiter.waitForSorting(priceSortOption);
    return response;
  }
}
