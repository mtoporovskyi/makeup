# MAKEUP price filter tests

TypeScript and Playwright E2E tests for the Ukrainian perfume category on makeup.com.ua. Tests use current UI prices and run in Chromium at desktop **1920×1080** and mobile **414×896** viewports. Sorting scenarios check the first page through the UI and every remaining page through the API.

## Setup

Requires Node.js **22.14+ within 22.x**, npm, and access to makeup.com.ua. Use `nvm use` to select the version in `.nvmrc` if you use nvm.

```bash
npm ci
npx playwright install chromium
```

On Linux, install system dependencies too: `npx playwright install --with-deps chromium`.

## Commands

| Command                  | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `npm run check`          | Check formatting, lint, and TypeScript types               |
| `npm test`               | Run both viewport projects                                 |
| `npm run test:desktop`   | Run desktop tests                                          |
| `npm run test:mobile`    | Run mobile tests                                           |
| `npm run test:stability` | Repeat both projects three times, one worker, zero retries |
| `npm run report`         | Open the latest HTML report                                |

Local test runs open a visible Chromium window by default. When the `CI` environment variable is set, tests run headless. This applies to both viewport projects and stability runs.

Run a specific case or tagged group:

```bash
npm test -- --grep 'WEB-00001'
npm test -- --grep '@validation'
```

## Reports and CI

- HTML report: `playwright-report/`.
- Failure screenshots and traces: `reports/`.
- Open a trace: `npx playwright show-trace <path-to-trace.zip>`.

GitHub Actions runs lint followed by tests on pull requests and manual runs. Reports are uploaded even when tests fail, retained for **7 days**, and named with a timestamp in the `Europe/Kyiv` timezone.

## Documentation

### Test design and limitations

- Derive ranges from current UI prices; require nonempty main results and check every current price against inclusive bounds. Exclude old prices and recommendations; record explicitly unpriced unavailable products separately.
- Commit fields on blur and wait for each update. Verify filtering before testing reset or range replacement.
- Exercise keyboard and clipboard events explicitly. A trailing dot key preserves the integer; a comma key clears its field. Invalid clipboard text and decimals must be rejected safely, preserving the other bound, category results and valid-input recovery. Negative/overflow rejection and inverted-range clearing await product confirmation.
- Sorting checks the first UI page against its captured response, then every remaining API page in the same browser context. Validate offsets, item counts, current-price bounds and ordering without a page cap.
- Use isolated contexts, one worker, zero retries and meaningful assertion messages. No mocks, fixed catalog snapshots or skips for WAF/network/data failures. Mobile is responsive web without device presets or touch emulation.

The viewport choices follow October 2026 Statcounter screen-resolution rankings for Ukraine ([desktop](https://gs.statcounter.com/screen-resolution-stats/desktop/ukraine/#monthly-202610-202610), [mobile](https://gs.statcounter.com/screen-resolution-stats/mobile/ukraine/#monthly-202610-202610)), also leading worldwide ([desktop](https://gs.statcounter.com/screen-resolution-stats/desktop/worldwide/#monthly-202610-202610), [mobile](https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide/#monthly-202610-202610)). Screen resolution and actual browser viewport are different measurements.

### Test cases and IDs

**47 scenarios per viewport, 94 tests total.** Matching cases share a number: `[WEB-00001]` / `[MOB-00001]`. Native tags identify platform, feature and case type. Filter specs are in `tests/UI/priceFilter`; sorting specs are in `tests/UI/priceSorting`.

| Spec                                | Case numbers                            | Coverage                                             |
| ----------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `priceState.spec.ts`                | 00001–00002                             | Initial state and range replacement                  |
| `priceRange.spec.ts`                | 00003–00006                             | Single/both bounds and boundary inclusion            |
| `priceReset.spec.ts`                | 00007–00010                             | Reset and clearing individual bounds                 |
| `pricePresets.spec.ts`              | 00011–00014                             | Presets, manual transitions, and reset               |
| `priceInput.spec.ts`                | 00015–00023                             | Keyboard, clipboard, formatting, and zero            |
| `priceInvalidInput.spec.ts`         | 00024–00028, 00030, 00032–00036, 00038  | Invalid clipboard input and recovery                 |
| `priceDecimalInput.spec.ts`         | 00029, 00031, 00037, 00039, 00044–00047 | Keyboard separators, clipboard decimals and recovery |
| `priceInvertedRange.spec.ts`        | 00040–00041                             | Inverted bounds and recovery                         |
| `priceSorting/priceSorting.spec.ts` | 00042–00043                             | Ascending/descending order and complete pagination   |

### Verification and known failures

The full Chromium headless run on **November 12, 2026** completed all **94 tests** with **4 workers**, **zero retries** and **no skips** in **11.8 minutes**: **65 passed, 29 failed** (desktop: 29/18; mobile: 36/11). The HTML report and failure breakdown are under `reports/fullHeadlessRun4Workers/`. `npm run check` passes; three-run stability remains unverified.

Recorded runs found current UI/API prices outside selected ranges, decimal/overflow input leading to HTTP 422 and not-found UI, retained negative/inverted values, and consent/product-read timeouts. Pricing semantics for variants and conditional discounts need product clarification. A failed filtering precondition can prevent reset or replacement checks from running.

Per-case IDs, causes and unreached steps are documented in each spec's JSDoc; available traces and screenshots are under `reports/`. These observations describe saved runs, not guaranteed current site behavior.
