import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { NextResponse } from 'next/server';

const require = createRequire(import.meta.url);

function executeBenchmark({ deadBallSensitivity = 0.5, playerIdConfidenceCutoff = 0.7, multiPassReasoning = true }) {
  const dSens = typeof deadBallSensitivity === 'number' ? Math.min(1.0, Math.max(0.0, deadBallSensitivity)) : 0.5;
  const pCutoff = typeof playerIdConfidenceCutoff === 'number' ? Math.min(1.0, Math.max(0.0, playerIdConfidenceCutoff)) : 0.7;
  const isMultiPass = Boolean(multiPassReasoning);

  const scriptPath = path.join(process.cwd(), 'scripts', 'evaluate-ai-engine.js');
  const speedModeArg = isMultiPass ? 'pro' : 'flash';

  const args = [
    scriptPath,
    '--mock',
    `--dead-ball-sensitivity=${dSens}`,
    `--player-id-cutoff=${pCutoff}`,
    `--speed-mode=${speedModeArg}`,
    '--benchmark=scratch/benchmark_ground_truth.json',
    '--output=scratch/ai_eval_results.json',
  ];

  try {
    execFileSync(process.execPath, args, { cwd: process.cwd(), stdio: 'pipe' });
    const outputPath = path.join(process.cwd(), 'scratch', 'ai_eval_results.json');
    if (fs.existsSync(outputPath)) {
      const data = fs.readFileSync(outputPath, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.metrics && parsed.metrics.statAttribution) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Child process benchmark execution failed, executing fallback engine:', err.message);
  }

  // Fallback in-process execution using exported functions from scripts/evaluate-ai-engine.js
  const benchmarkPath = path.join(process.cwd(), 'scratch', 'benchmark_ground_truth.json');
  if (!fs.existsSync(benchmarkPath)) {
    throw new Error('Ground truth benchmark file not found at: ' + benchmarkPath);
  }

  const groundTruthData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  const dynamicRequire = eval('require');
  const engine = dynamicRequire(scriptPath);

  const settings = {
    deadBallSensitivity: dSens,
    playerIdConfidenceCutoff: pCutoff,
    multiPassReasoning: isMultiPass,
  };

  const predictedPlays = engine.generateMockPredictions(groundTruthData, settings);
  const evalResult = engine.evaluateEngine(groundTruthData.plays, predictedPlays);
  const timestamp = new Date().toISOString();
  const { metrics, perPlayResults } = evalResult;

  const targets = {
    temporalIoU: { target: 0.80, passed: metrics.temporalIoU >= 0.80 },
    f1Score: { target: 0.85, passed: metrics.classification.f1Score >= 0.85 },
    playerIdPrecision: { target: 0.85, passed: metrics.playerId.precision >= 0.85 },
    hallucinationRate: { target: 0.10, passed: metrics.playerId.hallucinationRate <= 0.10 },
    overallStatF1: { target: 0.85, passed: (metrics.statAttribution?.overallStatF1 ?? 1.0) >= 0.85 },
    threePointAnchorComplianceRate: { target: 0.90, passed: (metrics.statAttribution?.threePointAnchorComplianceRate ?? 1.0) >= 0.90 },
  };

  const overallPassed = targets.temporalIoU.passed &&
                        targets.f1Score.passed &&
                        targets.playerIdPrecision.passed &&
                        targets.hallucinationRate.passed;

  const outputPayload = {
    timestamp,
    executionMode: 'mock',
    datasetVersion: groundTruthData.datasetVersion || '1.0',
    totalPlaysEvaluated: groundTruthData.plays.length,
    sensitivitySettings: settings,
    metrics,
    targets,
    overallPassed,
    perPlayResults,
    perPlayBreakdown: perPlayResults,
  };

  const outputPath = path.join(process.cwd(), 'scratch', 'ai_eval_results.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  return outputPayload;
}

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const deadBallSensitivity = typeof body.deadBallSensitivity === 'number'
      ? Math.min(1.0, Math.max(0.0, body.deadBallSensitivity))
      : 0.5;

    const playerIdConfidenceCutoff = typeof body.playerIdConfidenceCutoff === 'number'
      ? Math.min(1.0, Math.max(0.0, body.playerIdConfidenceCutoff))
      : 0.7;

    const multiPassReasoning = body.multiPassReasoning !== undefined
      ? Boolean(body.multiPassReasoning)
      : true;

    const results = executeBenchmark({ deadBallSensitivity, playerIdConfidenceCutoff, multiPassReasoning });

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    console.error('Benchmark POST execution error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const outputPath = path.join(process.cwd(), 'scratch', 'ai_eval_results.json');
    if (fs.existsSync(outputPath)) {
      const data = fs.readFileSync(outputPath, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.metrics && parsed.metrics.statAttribution) {
        return NextResponse.json(parsed, { status: 200 });
      }
    }

    const results = executeBenchmark({
      deadBallSensitivity: 0.5,
      playerIdConfidenceCutoff: 0.7,
      multiPassReasoning: true,
    });

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    console.error('Benchmark GET fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
