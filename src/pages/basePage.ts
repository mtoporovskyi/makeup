import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  private readonly consentButton: Locator;

  protected constructor(protected readonly page: Page) {
    this.consentButton = page.getByRole('button', { name: 'Погоджуюсь', exact: true });
  }

  /**
   * Navigates to a test-supplied URL and runs the page-specific preparation hook.
   *
   * @param url - Absolute URL or path relative to the configured baseURL.
   */
  async open(url: string): Promise<void> {
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.prepareAfterNavigation(response?.status());
  }

  /**
   * Accepts the initial consent banner after the page is ready for interaction.
   * The caller must prepare a fresh context where the banner is available.
   */
  protected async acceptInitialConsent(): Promise<void> {
    await this.consentButton.click();
  }

  /**
   * Prepares a concrete page after navigation using its own readiness criteria.
   *
   * @param initialStatus - Initial navigation status for readiness diagnostics.
   */
  protected abstract prepareAfterNavigation(initialStatus: number | undefined): Promise<void>;
}
