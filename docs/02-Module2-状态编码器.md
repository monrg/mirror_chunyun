# Module 2: 状态编码器设计文档

## 🎯 模块目标

将游戏状态（位置、速度、平台信息等）**转换为数字向量**，让AI模型能够"理解"游戏。

**类比：** 就像把一张图片转换成RGB数值数组，我们要把游戏状态转换成神经网络能处理的格式。

---

## 🧰 技术栈解释

### 为什么需要编码器？

**问题：** AI模型只能处理数字，不能直接理解"玩家在平台上"这种概念。

**解决方案：** 把游戏状态转换为**标准化的数字向量**

**示例转换：**
```
原始状态：
{
  player: { x: 250, y: 400, vx: 100, vy: 0 },
  platform: { x: 300, y: 450, width: 200 }
}

↓ 编码后 ↓

[0.31, 0.67, 0.50, 0.50, 1.0, 0.0, 0.38, 0.75, 0.25]
 ↑     ↑     ↑     ↑     ↑    ↑    ↑     ↑     ↑
 x归一  y归一  vx归  vy归  着地  面右  平台x  平台y  平台宽
```

### 技术选择：特征工程 vs 深度学习

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **特征工程**<br>(手动设计) | • 可解释性强<br>• 不需要训练<br>• 计算快 | • 需要领域知识<br>• 可能丢失信息 | **本项目（Demo）** |
| **深度学习**<br>(VAE/CNN) | • 自动学习特征<br>• 信息保留完整 | • 需要大量数据<br>• 训练成本高 | 完整项目 |

**我们选择特征工程** - 因为这是Demo，重点是验证概念。

---

## 📐 架构设计

### 编码流程

```
GameState (原始数据)
   ↓
┌──────────────────┐
│ 数据清洗          │ ← 过滤无效值、处理缺失
└──────────────────┘
   ↓
┌──────────────────┐
│ 归一化            │ ← 将数值映射到 [0, 1] 或 [-1, 1]
└──────────────────┘
   ↓
┌──────────────────┐
│ 独热编码          │ ← 将类别转换为向量（如动作）
└──────────────────┘
   ↓
┌──────────────────┐
│ 拼接向量          │ ← 合并所有特征
└──────────────────┘
   ↓
Float32Array[128维]
```

### 特征设计

**选择哪些特征？**

1. **玩家状态** (6维)
   - 位置 (x, y) - 归一化到 [0, 1]
   - 速度 (vx, vy) - 归一化到 [-1, 1]
   - 着地状态 (0或1)
   - 朝向 (0或1)

2. **动作编码** (6维)
   - One-Hot编码（6种动作，只有1个是1，其余是0）
   - 例：JUMP = [0, 0, 1, 0, 0, 0]

3. **环境信息** (简化版)
   - 最近的3个平台位置（每个平台4维：x, y, width, height）
   - 共 3 × 4 = 12维

**总维度：** 6 + 6 + 12 = 24维（易于调试）

---

## 📝 代码框架详解

### 文件1: `src/model/types.ts`（模型相关类型）

```typescript
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
```

---

### 文件2: `src/model/StateEncoder.ts`（核心编码器）

```typescript
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
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * 归一化到 [-1, 1]
   */
  private normalizeSymmetric(value: number, maxAbs: number): number {
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
```

**关键概念解释：**

1. **归一化 (Normalization)**
   ```
   原始值: x = 250 (像素位置)
   游戏宽度: 800
   归一化: 250 / 800 = 0.3125

   为什么？让所有数值在同一范围，避免大数值"主导"小数值
   ```

2. **One-Hot编码**
   ```
   动作: JUMP
   编码: [0, 0, 1, 0, 0, 0]
          ↑  ↑  ↑  ↑  ↑  ↑
          空 左 右 跳 左跳 右跳

   为什么？类别数据转换为数值，且每个类别地位平等
   ```

3. **Float32Array**
   - JavaScript的类型化数组（Typed Array）
   - 占用内存少，计算速度快
   - TensorFlow.js直接支持

---

### 文件3: `src/model/EncoderUtils.ts`（工具函数）

```typescript
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
    const bar = '█'.repeat(Math.floor(vector[i] * 20));
    console.log(`${label.padEnd(15)} ${vector[i].toFixed(3)} ${bar}`);
  }
}
```

---

### 文件4: `src/model/__tests__/StateEncoder.test.ts`（单元测试）

```typescript
import { StateEncoder } from '../StateEncoder';
import { GameState, PlayerAction } from '@/game/types';

describe('StateEncoder', () => {
  const encoder = new StateEncoder({
    worldWidth: 800,
    worldHeight: 600,
    maxVelocity: 500,
    maxPlatforms: 3,
  });

  test('应该正确编码玩家位置', () => {
    const state: GameState = {
      timestamp: 0,
      frame: 0,
      player: {
        x: 400,  // 中心位置
        y: 300,
        velocityX: 0,
        velocityY: 0,
        onGround: true,
        facingRight: true,
      },
      action: PlayerAction.IDLE,
    };

    const encoded = encoder.encode(state);

    // 位置应该归一化到 0.5
    expect(encoded.vector[0]).toBeCloseTo(0.5, 2); // x
    expect(encoded.vector[1]).toBeCloseTo(0.5, 2); // y
  });

  test('应该正确编码动作', () => {
    const state: GameState = {
      timestamp: 0,
      frame: 0,
      player: {
        x: 0, y: 0, velocityX: 0, velocityY: 0,
        onGround: true, facingRight: true,
      },
      action: PlayerAction.JUMP,
    };

    const encoded = encoder.encode(state);
    const actionVector = encoded.metadata.actionFeatures;

    // JUMP应该是第3个动作（索引2）
    expect(actionVector[3]).toBe(1);
    expect(actionVector.filter(v => v === 1).length).toBe(1);
  });

  test('向量维度应该正确', () => {
    const encoded = encoder.encode(createDummyState());
    expect(encoded.dimension).toBe(24);
  });
});

function createDummyState(): GameState {
  return {
    timestamp: 0,
    frame: 0,
    player: {
      x: 0, y: 0, velocityX: 0, velocityY: 0,
      onGround: false, facingRight: false,
    },
    action: PlayerAction.IDLE,
  };
}
```

---

## 🔍 使用示例

### 在游戏中集成编码器

```typescript
// src/game/GameScene.ts

import { StateEncoder } from '@/model/StateEncoder';

export class GameScene extends Phaser.Scene {
  private encoder!: StateEncoder;

  create(): void {
    // ... 其他初始化代码 ...

    // 创建编码器
    this.encoder = new StateEncoder({
      worldWidth: 800,
      worldHeight: 600,
      maxVelocity: 500,
      maxPlatforms: 3,
    });
  }

  update(): void {
    // ... 获取游戏状态 ...
    const state: GameState = {
      timestamp: Date.now(),
      frame: this.frameCount,
      player: this.player.getState(),
      action: this.player.getCurrentAction(),
    };

    // 编码状态
    const encoded = this.encoder.encode(state);

    // 打印向量（调试用）
    if (this.frameCount % 60 === 0) {
      console.log('编码向量:', encoded.vector);
      console.log('维度:', encoded.dimension);
    }
  }
}
```

---

## 📊 验证编码质量

### 检查数据分布

```typescript
import { analyzeEncodings, visualizeVector } from '@/model/EncoderUtils';

// 收集1000帧数据
const states: GameState[] = []; // ... 从游戏中收集
const encoder = new StateEncoder({ /* ... */ });

// 批量编码
const vectors = states.map(s => encoder.encode(s).vector);

// 分析统计信息
const stats = analyzeEncodings(vectors);
console.table({
  '最小值': stats.min,
  '最大值': stats.max,
  '均值': stats.mean,
});

// 可视化单个向量
visualizeVector(vectors[0], [
  'x', 'y', 'vx', 'vy', 'onGround', 'facingRight',
  'idle', 'left', 'right', 'jump', 'left_jump', 'right_jump',
  // ... 环境特征标签
]);
```

**期望结果：**
```
x              0.312 ███████
y              0.667 ██████████████
vx             0.000
vy            -0.400 ████████
onGround       1.000 ████████████████████
facingRight    1.000 ████████████████████
```

---

## ✅ 验收标准

完成Module 2后，应该能做到：
- [x] 能将游戏状态转换为24维向量
- [x] 所有数值在 [0, 1] 或 [-1, 1] 范围内
- [x] 动作使用One-Hot编码
- [x] 能正确解码向量（逆过程）
- [x] 通过单元测试

---

## 🐛 常见问题

### Q1: 编码后出现NaN（Not a Number）？
**A:** 检查归一化时是否除以0：
```typescript
// 错误
value / (max - min)  // 如果 max = min 会出错

// 正确
(max - min) === 0 ? 0 : value / (max - min)
```

### Q2: 速度编码超出 [-1, 1] 范围？
**A:** 速度可能超过预设的maxVelocity，需要钳制：
```typescript
Math.max(-1, Math.min(1, value / maxAbs))
```

### Q3: 如何选择合适的特征？
**A:** 原则：
1. 能区分不同状态（例如着地vs空中）
2. 对预测有用（例如速度影响未来位置）
3. 不冗余（例如不需要同时编码x和x²）

---

## 🎯 下一步

完成Module 2后，继续学习：
- `03-Module3-动态预测模型.md` - 如何用神经网络预测未来状态
