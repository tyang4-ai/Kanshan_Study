#!/usr/bin/env tsx
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import {
  createJieba,
  extractFeatures,
  type ArticleInput,
  type VoiceFeatures,
} from '../lib/voice/features';

type FingerprintFile = {
  userId: string;
  computedAt: string;
  articleCount: number;
  features: VoiceFeatures;
  thresholdReport: {
    sentenceLengthCV: { value: number; gate: number; passed: boolean };
    idiomDensity: { value: number; gate: number; passed: boolean };
    genericFunctionWordRate: { value: number; gate: number; passed: boolean };
  };
};

const ROOT = resolve(__dirname, '..');

function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: pnpm tsx scripts/extract-voice-fingerprint.ts <userId>');
    process.exit(1);
  }

  const corpusDir = join(ROOT, 'content', 'corpus', userId);
  const articlesDir = join(corpusDir, 'articles');

  if (!existsSync(articlesDir)) {
    console.error(`No articles directory at ${articlesDir}`);
    process.exit(1);
  }

  const files = readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
  if (files.length < 3) {
    console.error(
      `Need ≥3 articles in ${articlesDir} for statistical validity, found ${files.length}`,
    );
    process.exit(1);
  }

  const articles: ArticleInput[] = files.map((file) => {
    const raw = readFileSync(join(articlesDir, file), 'utf8');
    const { content } = matter(raw);
    return { id: file.replace(/\.md$/, ''), body: content };
  });

  const jieba = createJieba();
  const features = extractFeatures(articles, jieba);

  const thresholdReport = {
    sentenceLengthCV: {
      value: features.sentenceLengthCV,
      gate: 0.4,
      passed: features.sentenceLengthCV >= 0.4,
    },
    idiomDensity: {
      value: features.idiomDensity,
      gate: 2.5,
      passed: features.idiomDensity <= 2.5,
    },
    genericFunctionWordRate: {
      value: features.genericFunctionWordRate,
      gate: 2.0,
      passed: features.genericFunctionWordRate <= 2.0,
    },
  };

  const out: FingerprintFile = {
    userId,
    computedAt: new Date().toISOString(),
    articleCount: files.length,
    features,
    thresholdReport,
  };

  const outputPath = join(corpusDir, 'voice-fingerprint.json');
  writeFileSync(outputPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${outputPath}`);
  console.log(`  articleCount: ${files.length}`);
  console.log(`  charCount: ${features.charCount}`);
  console.log(`  sentenceCount: ${features.sentenceCount}`);
  console.log(`  sentenceLengthCV: ${features.sentenceLengthCV.toFixed(3)} (gate ≥ 0.4)`);
  console.log(`  idiomDensity: ${features.idiomDensity.toFixed(3)} per 1000 (gate ≤ 2.5)`);
  console.log(
    `  genericFunctionWordRate: ${features.genericFunctionWordRate.toFixed(3)} per 1000 (gate ≤ 2.0)`,
  );

  const failed = Object.entries(thresholdReport).filter(([, v]) => !v.passed);
  if (failed.length > 0) {
    console.warn(`\n⚠ ${failed.length} threshold(s) failed:`);
    failed.forEach(([k, v]) => console.warn(`  ${k}: ${v.value.toFixed(3)} vs gate ${v.gate}`));
  }

  if (!thresholdReport.sentenceLengthCV.passed) {
    console.error(
      '\n✗ sentenceLengthCV below 0.4 — corpus is off-register. Edit articles to vary sentence lengths.',
    );
    process.exit(2);
  }
}

main();
