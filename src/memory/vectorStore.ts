import type { MemoryRecord } from '@/shared/types';

export function embedText(text: string, dimensions = 24) {
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase();

  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    vector[index % dimensions] += (code % 31) / 30;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  return dot / ((Math.sqrt(leftMagnitude) || 1) * (Math.sqrt(rightMagnitude) || 1));
}

export function findSimilarRecords(records: MemoryRecord[], queryVector: number[], limit = 3) {
  return records
    .filter((record) => Array.isArray(record.vector))
    .map((record) => ({
      record,
      score: cosineSimilarity(record.vector as number[], queryVector)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ record }) => record);
}
