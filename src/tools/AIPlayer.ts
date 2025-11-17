import { PlayerAction } from '@/game/types';
import { Player } from '@/game/Player';

/**
 * 游戏上下文（提供给AI的环境信息）
 */
export interface GameContext {
  nearestPlatform?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distanceToGoal?: {
    x: number;
    y: number;
  };
  obstacles?: any[];
}

/**
 * AI玩家控制器
 * 自动生成动作序列
 */
export class AIPlayer {
  private strategy: 'random' | 'heuristic' | 'mixed';
  private actionHistory: PlayerAction[] = [];

  constructor(strategy: 'random' | 'heuristic' | 'mixed' = 'mixed') {
    this.strategy = strategy;
  }

  /**
   * 决定下一个动作
   */
  getAction(player: Player, context: GameContext): PlayerAction {
    switch (this.strategy) {
      case 'random':
        return this.randomAction();

      case 'heuristic':
        return this.heuristicAction(player, context);

      case 'mixed':
        // 80% 启发式，20% 随机
        return Math.random() < 0.8
          ? this.heuristicAction(player, context)
          : this.randomAction();

      default:
        return PlayerAction.IDLE;
    }
  }

  /**
   * 随机动作
   */
  private randomAction(): PlayerAction {
    const actions = [
      PlayerAction.IDLE,
      PlayerAction.MOVE_LEFT,
      PlayerAction.MOVE_RIGHT,
      PlayerAction.JUMP,
      PlayerAction.MOVE_LEFT_JUMP,
      PlayerAction.MOVE_RIGHT_JUMP,
    ];

    // 调整概率：让跳跃更少出现（更真实）
    const weights = [0.3, 0.2, 0.2, 0.1, 0.1, 0.1];
    return this.weightedRandomChoice(actions, weights);
  }

  /**
   * 启发式动作（简单规则）
   */
  private heuristicAction(player: Player, context: GameContext): PlayerAction {
    const state = player.getState();
    const { nearestPlatform, distanceToGoal } = context;

    // 规则1: 如果在空中，继续保持之前的水平移动
    if (!state.onGround) {
      const lastAction = this.actionHistory[this.actionHistory.length - 1];
      if (lastAction?.includes('left')) return PlayerAction.MOVE_LEFT;
      if (lastAction?.includes('right')) return PlayerAction.MOVE_RIGHT;
      return PlayerAction.IDLE;
    }

    // 规则2: 如果前方有平台且较低，需要跳跃
    if (nearestPlatform && this.needJump(state, nearestPlatform)) {
      const direction = nearestPlatform.x > state.x ? 'right' : 'left';
      return direction === 'right'
        ? PlayerAction.MOVE_RIGHT_JUMP
        : PlayerAction.MOVE_LEFT_JUMP;
    }

    // 规则3: 朝目标移动
    if (distanceToGoal) {
      return distanceToGoal.x > 0
        ? PlayerAction.MOVE_RIGHT
        : PlayerAction.MOVE_LEFT;
    }

    // 规则4: 随机探索
    return this.randomAction();
  }

  /**
   * 判断是否需要跳跃
   */
  private needJump(
    playerState: any,
    platform: { x: number; y: number; width: number; height: number }
  ): boolean {
    const horizontalDistance = Math.abs(platform.x - playerState.x);
    const verticalDistance = platform.y - playerState.y;

    // 平台在前方且高于当前位置
    return horizontalDistance < 150 && verticalDistance < -50;
  }

  /**
   * 加权随机选择
   */
  private weightedRandomChoice<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }

    return items[items.length - 1];
  }

  /**
   * 记录动作（用于决策参考）
   */
  recordAction(action: PlayerAction): void {
    this.actionHistory.push(action);
    if (this.actionHistory.length > 60) {
      this.actionHistory.shift(); // 只保留最近1秒
    }
  }
}
