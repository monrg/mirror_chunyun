# Module 4: 数据收集工具设计文档

## 🎯 模块目标

**自动化收集**大量游戏数据用于训练AI模型。

**核心功能：**
- 自动玩游戏（随机动作或策略）
- 记录每一帧的状态转换
- 导出为训练数据格式

**为什么需要？** 手动玩游戏收集数据太慢，我们需要几千到几万帧数据。

---

## 🧰 技术栈解释

### 自动化策略

```
策略1: 随机动作
  ├─ 每帧随机选择一个动作
  ├─ 优点：覆盖所有状态空间
  └─ 缺点：数据质量低（很多无意义动作）

策略2: 启发式AI（推荐用于Demo）
  ├─ 简单规则（如：遇到障碍就跳）
  ├─ 优点：数据更接近真实玩法
  └─ 缺点：需要设计规则

策略3: 人类玩家记录
  ├─ 记录真实玩家游戏
  ├─ 优点：最高质量
  └─ 缺点：数据量少
```

**我们使用：策略1（随机）+ 策略2（启发式）混合**

---

## 📐 架构设计

### 数据收集流程

```
┌──────────────────┐
│  启动数据收集模式  │
└──────────────────┘
         ↓
┌──────────────────┐
│  创建AI玩家控制器 │ ← 替代人类输入
└──────────────────┘
         ↓
┌──────────────────┐
│  运行游戏N局      │ ← 每局重置环境
└──────────────────┘
         ↓
┌──────────────────┐
│  记录状态转换     │ ← [state_t, action, state_t+1]
└──────────────────┘
         ↓
┌──────────────────┐
│  导出JSON文件     │ ← 供训练使用
└──────────────────┘
```

### 数据格式

```json
{
  "metadata": {
    "collectedAt": "2025-01-15T10:30:00Z",
    "totalFrames": 12000,
    "episodes": 50,
    "averageEpisodeLength": 240
  },
  "data": [
    {
      "frame": 0,
      "timestamp": 0,
      "state": {
        "player": { "x": 100, "y": 100, "velocityX": 0, "velocityY": 0, ... },
        "action": "idle"
      },
      "nextState": {
        "player": { "x": 100, "y": 116.67, "velocityX": 0, "velocityY": 13.33, ... }
      }
    },
    ...
  ]
}
```

---

## 📝 代码框架详解

### 文件1: `src/tools/AIPlayer.ts`（AI玩家）

```typescript
import { PlayerAction } from '@/game/types';
import { Player } from '@/game/Player';

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
```

---

### 文件2: `src/tools/DataCollector.ts`（数据收集器）

```typescript
import { GameState, PlayerAction } from '@/game/types';
import { AIPlayer, GameContext } from './AIPlayer';

/**
 * 训练数据样本
 */
export interface TrainingSample {
  state: GameState;
  nextState: GameState;
}

/**
 * 数据收集器
 * 运行多局游戏，收集状态转换数据
 */
export class DataCollector {
  private samples: TrainingSample[] = [];
  private currentEpisode: GameState[] = [];
  private episodeCount: number = 0;

  private aiPlayer: AIPlayer;
  private isCollecting: boolean = false;

  constructor(aiStrategy: 'random' | 'heuristic' | 'mixed' = 'mixed') {
    this.aiPlayer = new AIPlayer(aiStrategy);
  }

  /**
   * 开始收集数据
   */
  startCollection(): void {
    this.isCollecting = true;
    this.samples = [];
    this.episodeCount = 0;
    console.log('📊 开始数据收集...');
  }

  /**
   * 停止收集
   */
  stopCollection(): void {
    this.isCollecting = false;
    console.log(`✓ 收集完成: ${this.samples.length} 个样本`);
  }

  /**
   * 记录一帧数据
   */
  recordFrame(state: GameState): void {
    if (!this.isCollecting) return;

    this.currentEpisode.push(state);
  }

  /**
   * 一局游戏结束
   */
  endEpisode(): void {
    if (!this.isCollecting || this.currentEpisode.length < 2) {
      this.currentEpisode = [];
      return;
    }

    // 转换为训练样本
    for (let i = 0; i < this.currentEpisode.length - 1; i++) {
      this.samples.push({
        state: this.currentEpisode[i],
        nextState: this.currentEpisode[i + 1],
      });
    }

    this.episodeCount++;
    console.log(
      `Episode ${this.episodeCount} 完成: ${this.currentEpisode.length} 帧`
    );

    this.currentEpisode = [];
  }

  /**
   * 获取AI动作（供游戏调用）
   */
  getAIAction(player: any, context: GameContext): PlayerAction {
    const action = this.aiPlayer.getAction(player, context);
    this.aiPlayer.recordAction(action);
    return action;
  }

  /**
   * 导出数据
   */
  exportData(): string {
    const data = {
      metadata: {
        collectedAt: new Date().toISOString(),
        totalSamples: this.samples.length,
        episodes: this.episodeCount,
        averageEpisodeLength: Math.floor(
          this.samples.length / this.episodeCount
        ),
      },
      samples: this.samples,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 下载为文件
   */
  downloadData(filename?: string): void {
    const data = this.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `training_data_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('✓ 数据已下载:', a.download);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalSamples: this.samples.length,
      episodes: this.episodeCount,
      currentEpisodeFrames: this.currentEpisode.length,
      isCollecting: this.isCollecting,
    };
  }
}
```

---

### 文件3: `src/tools/CollectorScene.ts`（收集模式场景）

```typescript
import Phaser from 'phaser';
import { GameScene } from '@/game/GameScene';
import { DataCollector } from './DataCollector';
import { PlayerAction } from '@/game/types';

/**
 * 数据收集专用场景
 * 自动运行游戏并收集数据
 */
export class CollectorScene extends GameScene {
  private collector!: DataCollector;
  private targetEpisodes: number = 50;
  private currentEpisode: number = 0;

  private autoRestart: boolean = true;
  private collectionUI!: Phaser.GameObjects.Text;

  create(): void {
    super.create();

    // 初始化收集器
    this.collector = new DataCollector('mixed');
    this.collector.startCollection();

    // 添加UI
    this.collectionUI = this.add.text(10, 100, '', {
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });

    // 快捷键
    this.input.keyboard!.on('keydown-S', () => {
      this.collector.stopCollection();
      this.collector.downloadData();
    });

    console.log('🤖 自动收集模式启动');
    console.log(`目标: ${this.targetEpisodes} 局游戏`);
    console.log('按 S 键随时停止并下载数据');
  }

  update(time: number, delta: number): void {
    // 获取AI动作（替代玩家输入）
    const context = this.getGameContext();
    const aiAction = this.collector.getAIAction(this.player, context);

    // 模拟按键
    this.simulateInput(aiAction);

    // 调用父类update（正常游戏逻辑）
    super.update(time, delta);

    // 记录当前帧
    const state = this.getCurrentGameState();
    this.collector.recordFrame(state);

    // 更新UI
    const stats = this.collector.getStats();
    this.collectionUI.setText([
      `收集模式 (AI自动玩)`,
      `局数: ${stats.episodes} / ${this.targetEpisodes}`,
      `样本数: ${stats.totalSamples}`,
      `当前帧: ${stats.currentEpisodeFrames}`,
      '',
      '按 S 停止并下载',
    ]);

    // 检查游戏结束条件
    if (this.checkEpisodeEnd()) {
      this.collector.endEpisode();
      this.currentEpisode++;

      if (this.currentEpisode >= this.targetEpisodes) {
        // 完成收集
        this.collector.stopCollection();
        this.collector.downloadData();
        this.scene.pause();
        alert('数据收集完成！文件已下载。');
      } else if (this.autoRestart) {
        // 重启游戏
        this.scene.restart();
      }
    }
  }

  /**
   * 模拟键盘输入
   */
  private simulateInput(action: PlayerAction): void {
    // 重置所有按键
    const cursors = (this as any).cursors;
    cursors.left.isDown = false;
    cursors.right.isDown = false;
    cursors.space.isDown = false;

    // 根据动作设置按键
    switch (action) {
      case PlayerAction.MOVE_LEFT:
        cursors.left.isDown = true;
        break;
      case PlayerAction.MOVE_RIGHT:
        cursors.right.isDown = true;
        break;
      case PlayerAction.JUMP:
        cursors.space.isDown = true;
        break;
      case PlayerAction.MOVE_LEFT_JUMP:
        cursors.left.isDown = true;
        cursors.space.isDown = true;
        break;
      case PlayerAction.MOVE_RIGHT_JUMP:
        cursors.right.isDown = true;
        cursors.space.isDown = true;
        break;
    }
  }

  /**
   * 获取游戏上下文（供AI决策）
   */
  private getGameContext(): any {
    // TODO: 实现获取周围平台、目标等信息
    return {
      nearestPlatform: null,
      distanceToGoal: { x: 0, y: 0 },
    };
  }

  /**
   * 检查一局是否结束
   */
  private checkEpisodeEnd(): boolean {
    const state = this.player.getState();

    // 条件1: 掉出地图
    if (state.y > 650) return true;

    // 条件2: 到达目标（假设目标在(700, 200)附近）
    const distToGoal = Math.hypot(state.x - 700, state.y - 200);
    if (distToGoal < 50) return true;

    // 条件3: 超时（60秒）
    if (this.time.now > 60000) return true;

    return false;
  }

  private getCurrentGameState(): any {
    return {
      timestamp: this.time.now,
      frame: (this as any).frameCount ?? 0,
      player: this.player.getState(),
      action: this.player.getCurrentAction(),
    };
  }
}
```

---

### 文件4: `src/main.ts` 修改（添加收集模式）

```typescript
import { CollectorScene } from './tools/CollectorScene';

// 在config中添加场景
const config: Phaser.Types.Core.GameConfig = {
  // ... 其他配置 ...
  scene: [
    import.meta.env.MODE === 'collector' ? CollectorScene : GameScene,
  ],
};
```

---

## 🚀 使用方法

### 启动数据收集

```bash
# 1. 启动收集模式
npm run collect-data

# 2. 等待自动完成（或按S键提前停止）

# 3. 文件自动下载到浏览器下载目录
# 文件名: training_data_1234567890.json
```

### 查看收集的数据

```bash
# 打开JSON文件
cat ~/Downloads/training_data_*.json | jq '.metadata'

# 输出示例：
# {
#   "collectedAt": "2025-01-15T10:30:00Z",
#   "totalSamples": 12000,
#   "episodes": 50,
#   "averageEpisodeLength": 240
# }
```

---

## ✅ 验收标准

完成Module 4后，应该能做到：
- [x] 能自动运行游戏50局
- [x] 收集至少10000帧数据
- [x] 数据包含完整的状态转换
- [x] 导出的JSON格式正确
- [x] AI玩家能完成基本游戏流程

---

## 🐛 常见问题

### Q1: AI一直重复同一个动作？
**A:** 增加随机性：
```typescript
return Math.random() < 0.5 ? heuristic() : random();
```

### Q2: 收集的数据质量差（AI总是失败）？
**A:** 改进启发式规则，或增加人类数据混合。

### Q3: 内存占用过高？
**A:** 定期清理：
```typescript
if (this.samples.length > 50000) {
  this.downloadData();
  this.samples = [];
}
```

---

## 🎯 下一步

完成Module 4后，继续学习：
- `05-Module5-模型训练脚本.md` - 如何用Python训练更强大的模型
