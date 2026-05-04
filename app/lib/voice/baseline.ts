import type { VoiceFeatures } from './features';
import guwanxiFp from '@/content/corpus/guwanxi/voice-fingerprint.json';

const ME_DEFAULT: VoiceFeatures = {
  avgSentenceLength: 30,
  sentenceLengthCV: 0.4,
  idiomDensity: 0,
  genericFunctionWordRate: 0,
  rhetoricalQuestionRate: 0,
  paragraphLengthCV: 0.3,
  openingDistribution: {
    rhetoricalQuestion: 0,
    firstPersonAnecdote: 0,
    specificFact: 0,
    generalClaim: 0,
    enumeration: 0,
    other: 1,
  },
  citationDensity: 0,
  charCount: 0,
  sentenceCount: 0,
};

interface FingerprintFile {
  userId: string;
  features: VoiceFeatures;
}

export function loadBaseline(userId: string): VoiceFeatures {
  if (userId === 'guwanxi') return (guwanxiFp as FingerprintFile).features;
  return ME_DEFAULT;
}
