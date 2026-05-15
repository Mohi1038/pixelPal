import type { PageContext, PageSnapshot, Tone } from '@/shared/types';

const stopwords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were', 'been', 'into', 'your', 'you', 'about', 'page', 'content']);

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function splitWords(text: string) {
  return normalize(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));
}

function mostFrequent(words: string[]) {
  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5).map(([word]) => word);
}

function detectTone(text: string): Tone {
  const lower = text.toLowerCase();
  if (/(?:!{2,}|\bawesome\b|\bgreat\b|\bexcellent\b|\bnice\b)/.test(lower)) return 'friendly';
  if (/(?:\berror\b|\bfail\b|\bissue\b|\bproblem\b|\bbroken\b)/.test(lower)) return 'concerned';
  if (/(?:\bwhy\b|\bhow\b|\bwhat\b|\bexplain\b|\bguide\b)/.test(lower)) return 'curious';
  if (/(?:\bchore\b|\bboring\b|\blong\b|\brepetitive\b)/.test(lower)) return 'sarcastic';
  return 'neutral';
}

function summarize(text: string) {
  const clean = normalize(text);
  if (!clean) {
    return 'This page is quiet. I am waiting for a signal.';
  }
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 2).join(' ').slice(0, 260);
}

export function analyzeSnapshot(snapshot: PageSnapshot): PageContext {
  const words = splitWords(snapshot.text);
  const phrases = mostFrequent(words);
  const readingLoad = Math.min(1, snapshot.text.length / 5000);
  const complexity = Math.min(1, new Set(words).size / 120);
  const tone = detectTone(snapshot.text);
  const topic = phrases[0] ?? (snapshot.title || 'unknown realm');

  return {
    title: snapshot.title,
    url: snapshot.url,
    topic,
    summary: summarize(snapshot.text),
    tone,
    complexity,
    readingLoad,
    keyPhrases: phrases
  };
}
