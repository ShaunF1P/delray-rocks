# Original User Request

## 2026-08-04T16:33:38Z

Build a state-of-the-art AI Play Analysis Benchmarking Engine (`scripts/evaluate-ai-engine.js` & `scratch/benchmark_ground_truth.json`) and a real-time Sensitivity Calibration & Insights Dashboard on the `/coach/evaluate` page to quantitatively test, measure, and fine-tune AI play recognition accuracy, dead-ball detection, and player identification thresholds.

Working directory: c:\projects\delray-rocks
Integrity mode: development

## Requirements

### R1. Ground-Truth Benchmarking Engine & CLI Test Suite
- Provide a CLI runner (`scripts/evaluate-ai-engine.js`) that evaluates Gemini AI film analysis against a ground-truth benchmark dataset (`scratch/benchmark_ground_truth.json`).
- Measure quantitative accuracy across:
  1. **Temporal IoU** (Snap & whistle timestamp alignment).
  2. **Play Type / Dead-Ball Classification** (Live vs Dead Ball / Penalty precision, recall, F1 score).
  3. **Player Identification & Hallucination Rate** (Position + physical descriptor match accuracy vs false jersey # claims).
- Output comprehensive JSON evaluation reports (`scratch/ai_eval_results.json`) and terminal summary reports.

### R2. Interactive Sensitivity Calibration & Insights Suite (`/coach/evaluate`)
- Update `/coach/evaluate` with an interactive **AI Sensitivity & Calibration Control Panel**.
- Provide real-time sensitivity controls (sliders / switches) for:
  - **Dead-Ball Sensitivity** (0.0 to 1.0) — controls strictness of pre-snap flag / offsides detection.
  - **Player ID Confidence Cutoff** (0.0 to 1.0) — controls threshold for reporting exact jersey numbers vs fallback physical descriptors (shoe color, build, hair).
  - **Multi-Pass Reasoning Mode Toggle** (Speed / Flash vs Pro / Multi-Pass Verification).
- Display visual benchmark metrics (IoU, F1 score, confusion matrix for Live vs Dead Ball, and player ID precision).
- Allow coaches to run benchmark evaluations directly from the UI or adjust sensitivity parameters used by `/api/film/analyze`.

## Acceptance Criteria

### Automated & E2E Verification
- [ ] `cmd /c node scripts/evaluate-ai-engine.js --mock` runs cleanly and outputs a structured accuracy report.
- [ ] Next.js production build (`cmd /c npm run build`) compiles with zero errors.
- [ ] Playwright E2E tests (`cmd /c npm run test:e2e`) pass with 100% success.
- [ ] `/coach/evaluate` renders the interactive AI Sensitivity Calibration Panel with working sliders and metrics display.
