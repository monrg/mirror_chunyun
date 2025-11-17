import { GameState } from '@/game/types';
import { StateEncoder } from './StateEncoder';

/**
 * 批量编码（用于训练数据准备）
 */
export function batchEncode(
  states: GameState[],
  encoder: StateEncoder
): Float32Array[] {
  return states.map(state => encoder.encode(state).vector);
}

/**
 * 计算编码统计信息（用于验证）
 */
export function analyzeEncodings(vectors: Float32Array[]) {
  if (vectors.length === 0) {
    return {
      count: 0,
      dimension: 0,
      min: [],
      max: [],
      mean: [],
    };
  }

  const dimension = vectors[0].length;
  const stats = {
    count: vectors.length,
    dimension,
    min: new Array(dimension).fill(Infinity),
    max: new Array(dimension).fill(-Infinity),
    mean: new Array(dimension).fill(0),
  };

  // 计算最小/最大/均值
  vectors.forEach(vector => {
    for (let i = 0; i < dimension; i++) {
      stats.min[i] = Math.min(stats.min[i], vector[i]);
      stats.max[i] = Math.max(stats.max[i], vector[i]);
      stats.mean[i] += vector[i];
    }
  });

  // 计算均值
  stats.mean = stats.mean.map(sum => sum / vectors.length);

  return stats;
}

/**
 * 向量可视化（打印到控制台）
 */
export function visualizeVector(
  vector: Float32Array,
  labels?: string[]
): void {
  console.log('═══ 向量可视化 ═══');
  for (let i = 0; i < vector.length; i++) {
    const label = labels?.[i] ?? `[${i}]`;
    const bar = '█'.repeat(Math.floor(Math.abs(vector[i]) * 20));
    const value = vector[i].toFixed(3);
    const sign = vector[i] < 0 ? '-' : ' ';
    console.log(`${label.padEnd(15)} ${sign}${value} ${bar}`);
  }
}

/**
 * 导出编码数据为JSON
 */
export function exportEncodedData(
  states: GameState[],
  encoder: StateEncoder
): string {
  const encodedData = states.map(state => {
    const encoded = encoder.encode(state);
    return {
      timestamp: state.timestamp,
      frame: state.frame,
      vector: Array.from(encoded.vector),
      metadata: encoded.metadata,
    };
  });

  return JSON.stringify(encodedData, null, 2);
}
