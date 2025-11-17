/**
 * 编码后的状态向量
 */
export interface EncodedState {
  vector: Float32Array;     // 编码后的数值向量
  dimension: number;        // 向量维度
  metadata: {               // 元数据（用于调试）
    playerFeatures: number[];
    actionFeatures: number[];
    environmentFeatures: number[];
  };
}

/**
 * 编码器配置
 */
export interface EncoderConfig {
  worldWidth: number;       // 游戏世界宽度（用于归一化）
  worldHeight: number;      // 游戏世界高度
  maxVelocity: number;      // 最大速度（用于归一化）
  maxPlatforms: number;     // 最多编码几个平台
}
