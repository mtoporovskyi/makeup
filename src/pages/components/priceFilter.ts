import type { Locator, Page } from '@playwright/test';
import { ParsePriceHelper } from '../../helpers/parsePriceHelper.js';
import type { Waiter } from '../../helpers/waiter.js';
import type { PriceBoundary, PriceInputMethod, PricePreset, PriceSelection } from '../../interfaces/prices.js';

export class PriceFilter {
  readonly minInput: Locator;
  readonly maxInput: Locator;
  private readonly panel: Locator;
  private readonly openButton: Locator;
  private readonly applyButton: Locator;
  private readonly clearButton: Locator;
  private readonly resetButton: Locator;
  private readonly presetButtons: Locator;

  constructor(
    private readonly page: Page,
    results: Locator,
    private readonly waiter: Waiter,
  ) {
    const mainContent = page.getByRole('main');
    this.panel = mainContent.getByRole('complementary', { includeHidden: true });
    this.openButton = mainContent.getByRole('button', { name: /Фільтр$/u });
    this.applyButton = this.panel.getByRole('button', { name: 'Застосувати', exact: true });
    this.clearButton = this.panel.getByRole('button', { name: 'Очистити', exact: true });
    this.resetButton = results.getByRole('button', { name: 'Зняти фільтри', exact: true });
    this.presetButtons = this.panel.getByRole('button', { name: /^(?:Менше|Більше|\d).*₴$/u });
    this.minInput = this.panel.locator('.PriceSelector__field').filter({ hasText: /^Від$/u }).getByRole('textbox');
    this.maxInput = this.panel.locator('.PriceSelector__field').filter({ hasText: /^До$/u }).getByRole('textbox');
  }

  /**
   * Opens the mobile filter panel only when hidden; always waits for both price fields.
   * On desktop, waits for the existing sidebar fields without opening a panel.
   */
  async openMobilePanelIfNeeded(): Promise<void> {
    if (!(await this.panel.isVisible())) {
      await this.openButton.click();
    }

    await this.waiter.waitForVisible(this.minInput, this.maxInput);
  }

  /**
   * Closes an open mobile panel with Apply; the desktop sidebar remains visible.
   */
  async closeMobilePanelIfOpen(): Promise<void> {
    if (await this.applyButton.isVisible()) {
      await this.applyButton.click();
      await this.waiter.waitForHidden(this.panel);
    }
  }

  /**
   * Reads populated price fields as UAH amounts, omitting empty boundaries.
   *
   * @returns The numeric selection currently displayed in the open panel.
   * @throws Error when a populated field is not a supported UAH price.
   */
  async readPriceInputValues(): Promise<PriceSelection> {
    const [minInputText, maxInputText] = await Promise.all([this.minInput.inputValue(), this.maxInput.inputValue()]);
    return {
      ...(minInputText === '' ? {} : { min: ParsePriceHelper.parsePrice(minInputText) }),
      ...(maxInputText === '' ? {} : { max: ParsePriceHelper.parsePrice(maxInputText) }),
    };
  }

  /**
   * Sets the minimum (Від) and maximum (До) prices, then closes the mobile panel.
   * Opens the filter and commits changed fields sequentially in a safe order.
   *
   * @param priceSelection - min populates Від; max populates До. An omitted bound clears its field.
   */
  async setMinMaxPrices(priceSelection: PriceSelection): Promise<void> {
    await this.openMobilePanelIfNeeded();
    const currentPriceSelection = await this.readPriceInputValues();
    const boundaryUpdateOrder = this.getBoundaryUpdateOrder(currentPriceSelection, priceSelection);
    for (const boundary of boundaryUpdateOrder) {
      await this.updateBoundary(boundary, priceSelection[boundary]);
    }
    await this.closeMobilePanelIfOpen();
  }

  /**
   * Opens the filter and parses every displayed preset, leaving the panel open.
   *
   * @returns Preset labels and their expected numeric boundaries.
   * @throws Error when a label cannot be interpreted as a supported price range.
   */
  async readPresets(): Promise<PricePreset[]> {
    await this.openMobilePanelIfNeeded();
    return (await this.presetButtons.allTextContents()).map((label) => ParsePriceHelper.parsePreset(label.trim()));
  }

  /**
   * Applies a displayed price preset, waits for its bounds and closes the mobile panel.
   *
   * @param pricePreset - A label and expected boundaries previously read from the UI.
   */
  async applyPricePreset(pricePreset: PricePreset): Promise<void> {
    await this.openMobilePanelIfNeeded();
    await this.panel.getByRole('button', { name: pricePreset.label, exact: true }).click();
    await this.waiter.waitForPriceSelection(pricePreset.selection);
    await this.closeMobilePanelIfOpen();
  }

  /**
   * Enters raw text using the requested input method and commits it by moving focus.
   * The calling test verifies how the application validates the submitted value.
   *
   * @param boundary - min targets the Від field; max targets the До field, including clipboard paste.
   * @param inputText - Raw text, including invalid values used by validation scenarios.
   * @param inputMethod - Direct fill, keyboard typing or a real clipboard paste.
   */
  async enterValue(boundary: PriceBoundary, inputText: string, inputMethod: PriceInputMethod): Promise<void> {
    await this.openMobilePanelIfNeeded();
    const priceInput = boundary === 'min' ? this.minInput : this.maxInput;
    await this.writeInput(priceInput, inputText, inputMethod);
    await this.commitInput(priceInput, boundary);
  }

  /**
   * Appends keystrokes to a prepared price field and commits the edit by moving focus.
   *
   * @param boundary - min targets the Від field; max targets the До field.
   * @param inputText - Characters to type after the field's existing value.
   */
  async appendPriceInputUsingKeyboard(boundary: PriceBoundary, inputText: string): Promise<void> {
    await this.openMobilePanelIfNeeded();
    const priceInput = boundary === 'min' ? this.minInput : this.maxInput;
    await priceInput.press('ControlOrMeta+A');
    await priceInput.press('ArrowRight');
    await priceInput.pressSequentially(inputText);
    await this.commitInput(priceInput, boundary);
  }

  /**
   * Waits for a test-supplied expected range after a raw input commit.
   *
   * @param priceSelection - Boundaries expected after application-side validation.
   */
  async waitForSelection(priceSelection: PriceSelection): Promise<void> {
    await this.waiter.waitForPriceSelection(priceSelection);
  }

  /**
   * Clears selected price bounds through the visible desktop or mobile reset control.
   */
  async resetPriceFilter(): Promise<void> {
    if (await this.openButton.isVisible()) {
      await this.openMobilePanelIfNeeded();
      await this.clearButton.click();
      await this.waiter.waitForHidden(this.panel);
    } else {
      await this.resetButton.click();
    }

    await this.waiter.waitForPriceSelection({});
  }

  /**
   * Chooses max first when raising min would temporarily invert the existing range.
   *
   * @param currentPriceSelection - Boundaries currently displayed in the UI.
   * @param priceSelection - Desired final boundaries.
   * @returns The safe order for committing the two fields.
   */
  private getBoundaryUpdateOrder(
    currentPriceSelection: PriceSelection,
    priceSelection: PriceSelection,
  ): readonly PriceBoundary[] {
    return priceSelection.min !== undefined &&
      currentPriceSelection.max !== undefined &&
      priceSelection.min > currentPriceSelection.max
      ? ['max', 'min']
      : ['min', 'max'];
  }

  /**
   * Writes raw text using fill, sequential key presses or browser clipboard permissions.
   *
   * @param priceInput - Prepared field to populate.
   * @param inputText - Text to enter before committing the field.
   * @param inputMethod - Input mechanism exercised by the test.
   */
  private async writeInput(priceInput: Locator, inputText: string, inputMethod: PriceInputMethod): Promise<void> {
    if (inputMethod === 'fill') {
      await priceInput.fill(inputText);
      return;
    }

    await priceInput.fill('');

    if (inputMethod === 'keyboard') {
      await priceInput.pressSequentially(inputText);
      return;
    }

    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.page.evaluate((text) => navigator.clipboard.writeText(text), inputText);
    await priceInput.press('ControlOrMeta+V');
  }

  /**
   * Commits a changed boundary and waits for its corresponding result update.
   *
   * @param boundary - Field to update.
   * @param priceAmount - New amount; undefined clears the field.
   */
  private async updateBoundary(boundary: PriceBoundary, priceAmount: number | undefined): Promise<void> {
    const priceInput = boundary === 'min' ? this.minInput : this.maxInput;
    const inputText = priceAmount?.toString() ?? '';

    if ((await priceInput.inputValue()) === inputText) {
      return;
    }

    const currentPriceSelection = await this.readPriceInputValues();
    const nextPriceSelection = this.getNextSelection(currentPriceSelection, boundary, priceAmount);
    await priceInput.fill(inputText);
    await this.commitInput(priceInput, boundary);
    await this.waiter.waitForPriceSelection(nextPriceSelection);
  }

  /**
   * Blurs the edited field without leaving focus in the other price field.
   * Leaving min backwards avoids an extra max blur overwriting a later edit.
   *
   * @param priceInput - Field whose current text should be committed.
   * @param boundary - Determines Shift+Tab for min or Tab for max.
   */
  private async commitInput(priceInput: Locator, boundary: PriceBoundary): Promise<void> {
    await priceInput.press(boundary === 'min' ? 'Shift+Tab' : 'Tab');
  }

  /**
   * Copies the current range with one boundary replaced or removed.
   *
   * @param currentPriceSelection - Selection before the field is committed.
   * @param boundary - Boundary being changed.
   * @param priceAmount - New value; undefined removes the boundary from the copy.
   * @returns The selection expected after this individual field update.
   */
  private getNextSelection(
    currentPriceSelection: PriceSelection,
    boundary: PriceBoundary,
    priceAmount: number | undefined,
  ): PriceSelection {
    const nextPriceSelection = { ...currentPriceSelection };

    if (priceAmount === undefined) {
      delete nextPriceSelection[boundary];
    } else {
      nextPriceSelection[boundary] = priceAmount;
    }

    return nextPriceSelection;
  }
}
