# E2E Test Infra: AI Play Analysis Benchmarking Engine & Calibration Dashboard

## Test Philosophy
- Opaque-box, requirement-driven E2E tests using Playwright.
- Derived from `ORIGINAL_REQUEST.md` requirements.
- Zero emojis anywhere in UI or test assets.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | CLI Benchmarking (`--mock`) | ORIGINAL_REQUEST §R1 | ✓ | ✓ | ✓ | ✓ |
| 2 | Sensitivity Calibration Panel | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 3 | Sensitivity Sliders & Switches | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 4 | Visual Metrics & Confusion Matrix | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 5 | Benchmark Execution via UI/API | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |

## Test Architecture
- **Runner**: Playwright (`npx playwright test`).
- **Base URL**: `http://localhost:3005` (Next.js production build).
- **Test File**: `tests/e2e/evaluate.spec.js`.

## Coverage Goals
- **Tier 1**: Basic rendering of `/coach/evaluate` with sensitivity panel, sliders, switches, metric cards, and CLI mock execution.
- **Tier 2**: Slider range boundaries (0.0, 0.5, 1.0), switch toggles, error handling for invalid inputs.
- **Tier 3**: Cross-feature interactions — adjusting sliders updates API params and recalculates benchmark metrics.
- **Tier 4**: Complete E2E workflow — coach opens evaluate page, adjusts sensitivity, runs benchmark, views confusion matrix & IoU scores, and verifies CLI output matches UI metrics.
