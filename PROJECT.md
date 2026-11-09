# Project: AI Play Analysis Benchmarking Engine & Calibration Dashboard

## Architecture
- **CLI Benchmarking Engine**: `scripts/evaluate-ai-engine.js` runs evaluation against ground-truth dataset `scratch/benchmark_ground_truth.json` and outputs structured `scratch/ai_eval_results.json` and formatted ASCII terminal reports.
- **Backend API & Calibration Service**: `/api/film/analyze` and `/api/evaluate/benchmark` process video analysis and evaluate AI play recognition accuracy conditioned on `deadBallSensitivity`, `playerIdConfidenceCutoff`, and `multiPassReasoning`.
- **Frontend Dashboard**: `app/coach/evaluate/page.js` updated with AI Sensitivity & Calibration Control Panel, visual metric cards (IoU, F1, 2x2 confusion matrix, player ID precision/hallucination rate), interactive sliders, switches, and direct UI benchmark execution. Zero-emoji rule enforced with SVG/Lucide icons.
- **E2E Testing Track**: Playwright tests in `tests/e2e/evaluate.spec.js` exercising all 4 test tiers and publishing `TEST_READY.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Benchmark Dataset | `scratch/benchmark_ground_truth.json` with 8U play data | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Benchmarking CLI Engine | `scripts/evaluate-ai-engine.js` with `--mock` and metrics | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Sensitivity API Integration | Update `/api/film/analyze` & backend for deadBallSensitivity, playerIdConfidenceCutoff, multiPassReasoning | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Benchmark Run API | `POST /api/evaluate/benchmark` API route wrapper | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Sensitivity Controls Panel | Interactive sliders & switch on `/coach/evaluate` | M3 | ORIGINAL_REQUEST §R2 |
| 6 | Visual Metrics & Insights | IoU, F1, 2x2 confusion matrix, player ID precision cards on `/coach/evaluate` | M3 | ORIGINAL_REQUEST §R2 |
| 7 | Zero-Emoji Compliance | Enforce SVG/Lucide icons only, zero emojis across UI | M3 | Global Rule |
| 8 | E2E Test Suite | Tier 1-4 Playwright test suite for evaluate page & CLI | E2E | ORIGINAL_REQUEST §Acceptance Criteria |
| 9 | Production Build & Hardening | Zero-error Next.js build & Tier 5 coverage hardening | M-Final | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design E2E test infra and write 4-tier Playwright tests for `/coach/evaluate` and CLI script | none | DONE |
| 1 | Ground-Truth Data & CLI Engine | Implement `scratch/benchmark_ground_truth.json` and `scripts/evaluate-ai-engine.js` with `--mock` | none | DONE |
| 2 | API & Calibration Engine Integration | Update `/api/film/analyze` and create `/api/evaluate/benchmark` handling sensitivity params | M1 | DONE |
| 3 | Coach Evaluate UI & Calibration Panel | Upgrade `/coach/evaluate` with calibration controls, visual metrics, zero emojis | M2 | DONE |
| Final | 100% E2E Pass & Hardening | Verify `npm run build`, `npm run test:e2e`, CLI `--mock`, Tier 5 adversarial testing | E2E, M3 | DONE |

## Interface Contracts

### 1. Benchmark Ground-Truth Schema (`scratch/benchmark_ground_truth.json`)
```json
{
  "datasetVersion": "1.0",
  "totalPlays": 10,
  "plays": [
    {
      "playId": "play_001",
      "videoTimestampStart": 12.5,
      "videoTimestampEnd": 24.0,
      "snapTimestamp": 14.2,
      "whistleTimestamp": 21.8,
      "playType": "Live Ball", // "Live Ball", "Dead Ball", "Penalty"
      "isDeadBall": false,
      "players": [
        {
          "jerseyNumber": 12,
          "position": "QB",
          "descriptors": ["white helmet", "red cleats", "tall build"]
        }
      ]
    }
  ]
}
```

### 2. Evaluation Results Schema (`scratch/ai_eval_results.json`)
```json
{
  "timestamp": "2026-08-04T20:35:00Z",
  "sensitivitySettings": {
    "deadBallSensitivity": 0.5,
    "playerIdConfidenceCutoff": 0.7,
    "multiPassReasoning": false
  },
  "metrics": {
    "temporalIoU": 0.88,
    "classification": {
      "precision": 0.92,
      "recall": 0.90,
      "f1Score": 0.91,
      "confusionMatrix": {
        "trueLive": 7,
        "falseDead": 1,
        "falseLive": 0,
        "trueDead": 2
      }
    },
    "playerId": {
      "precision": 0.94,
      "recall": 0.88,
      "hallucinationRate": 0.04
    }
  }
}
```

### 3. API Payload (`/api/film/analyze` & `/api/evaluate/benchmark`)
```json
{
  "deadBallSensitivity": 0.5,
  "playerIdConfidenceCutoff": 0.7,
  "multiPassReasoning": false,
  "runBenchmark": true
}
```

## Code Layout
- `scripts/evaluate-ai-engine.js`: CLI evaluation script.
- `scratch/benchmark_ground_truth.json`: Ground truth dataset.
- `scratch/ai_eval_results.json`: Benchmark evaluation output.
- `src/app/api/film/analyze/route.js`: Extended AI film analysis API route.
- `src/app/api/evaluate/benchmark/route.js`: API route executing benchmark evaluations.
- `src/app/coach/evaluate/page.js`: Frontend evaluation dashboard with sensitivity controls & metrics.
- `tests/e2e/evaluate.spec.js`: Playwright E2E test suite.
