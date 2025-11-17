import { GameState, PlayerAction } from '@/game/types';
import { EncodedState, EncoderConfig } from './types';

/**
 * 状态编码器
 * 将游戏状态转换为固定长度的数值向量
 */
export class StateEncoder {
  private config: EncoderConfig;

  // 动作到索引的映射
  private actionToIndex: Map<PlayerAction, number> = new Map([
    [PlayerAction.IDLE, 0],
    [PlayerAction.MOVE_LEFT, 1],
    [PlayerAction.MOVE_RIGHT, 2],
    [PlayerAction.JUMP, 3],
    [PlayerAction.MOVE_LEFT_JUMP, 4],
    [PlayerAction.MOVE_RIGHT_JUMP, 5],
  ]);

  constructor(config: EncoderConfig) {
    this.config = config;
  }

  /**
   * 主编码函数
   * @param state 游戏状态
   * @returns 编码后的向量
   */
  encode(state: GameState): EncodedState {
    const playerFeatures = this.encodePlayer(state.player);
    const actionFeatures = this.encodeAction(state.action);
    const environmentFeatures = this.encodeEnvironment(state);

    // 拼接所有特征
    const vector = new Float32Array([
      ...playerFeatures,
      ...actionFeatures,
      ...environmentFeatures,
    ]);

    return {
      vector,
      dimension: vector.length,
      metadata: {
        playerFeatures,
        actionFeatures,
        environmentFeatures,
      },
    };
  }

  /**
   * 编码玩家状态（6维）
   */
  private encodePlayer(player: GameState['player']): number[] {
    return [
      // 位置归一化到 [0, 1]
      this.normalize(player.x, 0, this.config.worldWidth),
      this.normalize(player.y, 0, this.config.worldHeight),

      // 速度归一化到 [-1, 1]
      this.normalizeSymmetric(player.velocityX, this.config.maxVelocity),
      this.normalizeSymmetric(player.velocityY, this.config.maxVelocity),

      // 布尔值转换为 0/1
      player.onGround ? 1.0 : 0.0,
      player.facingRight ? 1.0 : 0.0,
    ];
  }

  /**
   * 编码动作（One-Hot编码，6维）
   */
  private encodeAction(action: PlayerAction): number[] {
    const vector = new Array(6).fill(0);
    const index = this.actionToIndex.get(action) ?? 0;
    vector[index] = 1.0;
    return vector;
  }

  /**
   * 编码环境信息（简化版：固定12维）
   * 实际项目中应该动态获取周围平台
   */
  private encodeEnvironment(state: GameState): number[] {
    // TODO: 从Level类获取平台信息
    // 这里暂时返回占位符（全0）
    return new Array(12).fill(0);
  }

  /**
   * 归一化到 [0, 1]
   */
  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * 归一化到 [-1, 1]
   */
  private normalizeSymmetric(value: number, maxAbs: number): number {
    if (maxAbs === 0) return 0;
    return Math.max(-1, Math.min(1, value / maxAbs));
  }

  /**
   * 解码向量（用于可视化调试）
   */
  decode(vector: Float32Array): Partial<GameState> {
    return {
      player: {
        x: vector[0] * this.config.worldWidth,
        y: vector[1] * this.config.worldHeight,
        velocityX: vector[2] * this.config.maxVelocity,
        velocityY: vector[3] * this.config.maxVelocity,
        onGround: vector[4] > 0.5,
        facingRight: vector[5] > 0.5,
      },
      action: this.decodeAction(vector.slice(6, 12)),
      frame: 0,
      timestamp: 0,
    };
  }

  /**
   * 解码动作（从One-Hot向量）
   */
  private decodeAction(actionVector: ArrayLike<number>): PlayerAction {
    const index = Array.from(actionVector).indexOf(1);
    for (const [action, idx] of this.actionToIndex.entries()) {
      if (idx === index) return action;
    }
    return PlayerAction.IDLE;
  }

  /**
   * 获取向量维度
   */
  getVectorDimension(): number {
    return 24; // 6(player) + 6(action) + 12(env)
  }
}
