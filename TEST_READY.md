# Test Suite Ready: AI Play Analysis Benchmarking Engine & Calibration Dashboard

## Overview
The Playwright E2E test suite for the AI Play Analysis Benchmarking Engine and Sensitivity Calibration Dashboard (`/coach/evaluate`) has been constructed in `tests/e2e/evaluate.spec.js`.

## Test Runner Command
To execute the E2E test suite:
```bash
cmd /c npx playwright test
```
Or to run only the evaluate spec:
```bash
cmd /c npx playwright test tests/e2e/evaluate.spec.js
```

## Coverage Summary
The test suite covers 4 distinct tiers in accordance with project requirements:

### Tier 1: Feature Coverage
- **Sensitivity Panel Rendering (`Tier 1.1`)**: Asserts rendering of `/coach/evaluate` Sensitivity Control Panel, including Dead-Ball Sensitivity slider, Player ID Confidence Cutoff slider, and Multi-Pass Reasoning Mode toggle switch.
- **Visual Metric Cards Rendering (`Tier 1.2`)**: Asserts presence and rendering of key benchmark metric cards (Temporal IoU, F1 Score, 2x2 Confusion Matrix, Player ID Precision).
- **CLI Runner Execution (`Tier 1.3`)**: Asserts execution of `node scripts/evaluate-ai-engine.js --mock` CLI script and validates JSON report structure in `scratch/ai_eval_results.json`.

### Tier 2: Boundaries & Edge Cases
- **Slider Boundaries (`Tier 2.1`)**: Exercises slider input boundaries (min `0.0`, midpoint `0.5`, max `1.0`).
- **Toggle Switch Transitions (`Tier 2.2`)**: Validates state toggling (active / inactive) for configuration switches.

### Tier 3: Cross-Feature Interactions
- **Sensitivity Recalculation (`Tier 3.1`)**: Exercises slider input changes and verifies parameter update propagation and metric recalculation triggers.

### Tier 4: Real-World Scenario
- **Full Coach Calibration Workflow (`Tier 4.1`)**: Complete E2E user flow navigating to `/coach/evaluate`, tuning sensitivity sliders, running benchmark evaluation, and inspecting resulting metric outputs.

## Compliance
- **Framework**: Playwright (`@playwright/test` using ES module imports).
- **Auth Guard Handling**: Handles middleware redirects to `/login` via `navigateWithAuth` helper.
- **Zero-Emoji Rule**: 100% compliant — zero emojis across all test titles, assertions, and diagnostic output strings.
