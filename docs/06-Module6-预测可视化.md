# Module 6: 预测可视化设计文档

## 🎯 模块目标

在游戏界面实时展示AI模型的**预测结果**，让玩家看到"世界模型"对未来的想象。

**核心功能：**
- 分屏显示：左侧真实游戏，右侧模型预测
- 轨迹预测：显示未来3-5帧的玩家位置
- 预测对比：实时显示预测误差

**视觉效果：**
```
┌──────────────────────────────────────┐
│  真实游戏      │  模型预测（未来3帧） │
├────────────────┼─────────────────────┤
│                │                      │
│   🧍          │   👻 → 👻 → 👻     │
│  ▔▔▔          │  ▔▔▔                │
│                │  (半透明轨迹)        │
│  ▔▔▔          │  ▔▔▔                │
│                │                      │
│ 按键: ← → ↑   │  误差: 2.3px         │
└────────────────┴─────────────────────┘
```

---

## 🧰 技术栈解释

### Phaser.js 渲染技术

**核心概念：**
1. **场景 (Scene)** - 独立的游戏画面
2. **相机 (Camera)** - 视口控制
3. **图层 (Layer)** - 控制渲染顺序
4. **透明度 (Alpha)** - 实现半透明效果

**实现方案：**
```
方案A: 双场景
  ├─ 创建两个独立场景
  ├─ 并排显示
  └─ 优点：逻辑完全分离

方案B: 单场景 + 双相机（推荐）
  ├─ 一个场景，两个相机
  ├─ 左相机看真实游戏
  ├─ 右相机看预测结果
  └─ 优点：共享资源，性能更好

方案C: 叠加渲染
  ├─ 在真实游戏上叠加预测
  ├─ 使用半透明绘制
  └─ 优点：直观，但可能遮挡
```

**我们使用：方案B（双相机）**

---

## 📐 架构设计

### 渲染架构

```
GameScene (主场景)
├─ 真实游戏对象
│  ├─ Player (真实玩家)
│  ├─ Platforms (平台)
│  └─ Goal (目标)
│
├─ 预测可视化层
│  ├─ PredictedPlayer (预测的玩家位置)
│  ├─ TrajectoryLine (轨迹线)
│  └─ ErrorIndicator (误差指示器)
│
├─ 相机系统
│  ├─ MainCamera (左侧，看真实游戏)
│  └─ PredictionCamera (右侧，看预测结果)
│
└─ UI层
   ├─ InfoPanel (信息面板)
   └─ ErrorChart (误差曲线图)
```

---

## 📝 代码框架详解

### 文件1: `src/ui/PredictionVisualizer.ts`（预测可视化器）

```typescript
import Phaser from 'phaser';
import { DynamicsModel } from '@/model/DynamicsModel';
import { StateEncoder } from '@/model/StateEncoder';

/**
 * 预测可视化器
 * 负责渲染模型预测结果
 */
export class PredictionVisualizer {
  private scene: Phaser.Scene;
  private model: DynamicsModel;
  private encoder: StateEncoder;

  // 可视化对象
  private predictedSprites: Phaser.GameObjects.Sprite[] = [];
  private trajectoryLine: Phaser.GameObjects.Graphics;
  private errorText: Phaser.GameObjects.Text;

  // 配置
  private readonly PREDICTION_STEPS = 5;  // 预测未来5帧
  private readonly GHOST_ALPHA = 0.5;     // 半透明度

  constructor(
    scene: Phaser.Scene,
    model: DynamicsModel,
    encoder: StateEncoder
  ) {
    this.scene = scene;
    this.model = model;
    this.encoder = encoder;

    this.trajectoryLine = scene.add.graphics();
    this.createPredictedSprites();
    this.createUI();
  }

  /**
   * 创建预测精灵（幽灵玩家）
   */
  private createPredictedSprites(): void {
    for (let i = 0; i < this.PREDICTION_STEPS; i++) {
      const sprite = this.scene.add.sprite(0, 0, '');
      sprite.setDisplaySize(32, 32);
      sprite.setTint(0x00ffff); // 青色
      sprite.setAlpha(this.GHOST_ALPHA - i * 0.08); // 越远越透明
      sprite.setVisible(false);

      this.predictedSprites.push(sprite);
    }
  }

  /**
   * 创建UI元素
   */
  private createUI(): void {
    this.errorText = this.scene.add.text(10, 70, '', {
      fontSize: '14px',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    });
  }

  /**
   * 更新预测可视化
   */
  update(currentState: any, currentAction: any): void {
    // 编码当前状态
    const stateVector = this.encoder.encode(currentState).vector;
    const actionVector = this.encodeAction(currentAction);

    // 预测未来N步
    const predictions = this.model.predictMultiStep(
      stateVector,
      [actionVector, actionVector, actionVector, actionVector, actionVector],
      this.PREDICTION_STEPS
    );

    // 渲染预测结果
    this.renderPredictions(predictions);

    // 绘制轨迹线
    this.drawTrajectory(predictions);

    // 计算并显示误差（需要等待下一帧验证）
    this.updateError(predictions[0], currentState);
  }

  /**
   * 渲染预测位置
   */
  private renderPredictions(predictions: Float32Array[]): void {
    predictions.forEach((pred, i) => {
      if (i >= this.predictedSprites.length) return;

      // 解码预测状态
      const x = pred[0] * 800;  // 反归一化
      const y = pred[1] * 600;

      const sprite = this.predictedSprites[i];
      sprite.setPosition(x, y);
      sprite.setVisible(true);
    });
  }

  /**
   * 绘制轨迹线
   */
  private drawTrajectory(predictions: Float32Array[]): void {
    this.trajectoryLine.clear();
    this.trajectoryLine.lineStyle(2, 0x00ffff, 0.6);

    if (predictions.length === 0) return;

    // 起点
    const startX = predictions[0][0] * 800;
    const startY = predictions[0][1] * 600;
    this.trajectoryLine.moveTo(startX, startY);

    // 连线
    for (let i = 1; i < predictions.length; i++) {
      const x = predictions[i][0] * 800;
      const y = predictions[i][1] * 600;
      this.trajectoryLine.lineTo(x, y);
    }

    this.trajectoryLine.strokePath();

    // 绘制箭头（表示速度方向）
    if (predictions.length >= 2) {
      const last = predictions[predictions.length - 1];
      const secondLast = predictions[predictions.length - 2];

      const dx = last[0] - secondLast[0];
      const dy = last[1] - secondLast[1];

      this.drawArrow(
        last[0] * 800,
        last[1] * 600,
        Math.atan2(dy, dx)
      );
    }
  }

  /**
   * 绘制箭头
   */
  private drawArrow(x: number, y: number, angle: number): void {
    const arrowLength = 15;
    const arrowWidth = 8;

    this.trajectoryLine.fillStyle(0x00ffff, 0.8);
    this.trajectoryLine.beginPath();

    // 箭头顶点
    this.trajectoryLine.moveTo(
      x + Math.cos(angle) * arrowLength,
      y + Math.sin(angle) * arrowLength
    );

    // 左侧
    this.trajectoryLine.lineTo(
      x + Math.cos(angle + 2.5) * arrowWidth,
      y + Math.sin(angle + 2.5) * arrowWidth
    );

    // 右侧
    this.trajectoryLine.lineTo(
      x + Math.cos(angle - 2.5) * arrowWidth,
      y + Math.sin(angle - 2.5) * arrowWidth
    );

    this.trajectoryLine.closePath();
    this.trajectoryLine.fillPath();
  }

  /**
   * 更新预测误差显示
   */
  private lastPrediction: Float32Array | null = null;

  private updateError(prediction: Float32Array, actualState: any): void {
    if (!this.lastPrediction) {
      this.lastPrediction = prediction;
      return;
    }

    // 计算上一帧预测与实际的误差
    const predX = this.lastPrediction[0] * 800;
    const predY = this.lastPrediction[1] * 600;

    const actualX = actualState.player.x;
    const actualY = actualState.player.y;

    const error = Math.hypot(predX - actualX, predY - actualY);

    this.errorText.setText([
      `预测误差:`,
      `  位置: ${error.toFixed(2)} px`,
      `  速度: ${this.calculateVelocityError(prediction, actualState).toFixed(2)} px/s`,
    ]);

    // 保存当前预测
    this.lastPrediction = prediction;
  }

  /**
   * 计算速度误差
   */
  private calculateVelocityError(prediction: Float32Array, actualState: any): number {
    const predVx = prediction[2] * 500;
    const predVy = prediction[3] * 500;

    const actualVx = actualState.player.velocityX;
    const actualVy = actualState.player.velocityY;

    return Math.hypot(predVx - actualVx, predVy - actualVy);
  }

  /**
   * 编码动作（临时方法，应该使用StateEncoder）
   */
  private encodeAction(action: string): Float32Array {
    const actionMap: { [key: string]: number } = {
      idle: 0, left: 1, right: 2,
      jump: 3, left_jump: 4, right_jump: 5,
    };

    const vec = new Float32Array(6);
    vec[actionMap[action] ?? 0] = 1;
    return vec;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.predictedSprites.forEach(s => s.destroy());
    this.trajectoryLine.destroy();
    this.errorText.destroy();
  }
}
```

---

### 文件2: `src/ui/SplitScreenManager.ts`（分屏管理器）

```typescript
import Phaser from 'phaser';

/**
 * 分屏管理器
 * 创建左右分屏视图
 */
export class SplitScreenManager {
  private scene: Phaser.Scene;
  private mainCamera: Phaser.Cameras.Scene2D.Camera;
  private predictionCamera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 获取主相机
    this.mainCamera = scene.cameras.main;

    // 创建预测相机
    this.predictionCamera = scene.cameras.add(0, 0, 400, 600);

    this.setupSplitView();
  }

  /**
   * 设置分屏视图
   */
  private setupSplitView(): void {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // 左侧：真实游戏
    this.mainCamera.setViewport(0, 0, gameWidth / 2, gameHeight);
    this.mainCamera.setBackgroundColor('#1a1a2e');

    // 右侧：预测视图
    this.predictionCamera.setViewport(
      gameWidth / 2, 0,
      gameWidth / 2, gameHeight
    );
    this.predictionCamera.setBackgroundColor('#2e1a1a'); // 略带红色

    // 添加分隔线
    this.addDivider();
  }

  /**
   * 添加中间分隔线
   */
  private addDivider(): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0xffffff, 0.5);

    const centerX = this.scene.scale.width / 2;
    graphics.lineBetween(centerX, 0, centerX, this.scene.scale.height);

    // 添加标签
    this.scene.add.text(10, 10, '真实游戏', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    this.scene.add.text(centerX + 10, 10, '模型预测', {
      fontSize: '18px',
      color: '#00ffff',
      fontStyle: 'bold',
    });
  }

  /**
   * 同步相机位置（如果需要跟随玩家）
   */
  syncCameras(target: Phaser.GameObjects.GameObject): void {
    this.mainCamera.startFollow(target, false, 0.1, 0.1);
    this.predictionCamera.startFollow(target, false, 0.1, 0.1);
  }

  /**
   * 切换模式（全屏 <-> 分屏）
   */
  toggleMode(): void {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    if (this.mainCamera.width === gameWidth) {
      // 切换到分屏
      this.setupSplitView();
    } else {
      // 切换到全屏
      this.mainCamera.setViewport(0, 0, gameWidth, gameHeight);
      this.predictionCamera.setViewport(0, 0, 0, 0); // 隐藏
    }
  }
}
```

---

### 文件3: `src/game/GameScene.ts` 修改（集成可视化）

```typescript
import { PredictionVisualizer } from '@/ui/PredictionVisualizer';
import { SplitScreenManager } from '@/ui/SplitScreenManager';
import { DynamicsModel } from '@/model/DynamicsModel';
import { StateEncoder } from '@/model/StateEncoder';

export class GameScene extends Phaser.Scene {
  // ... 已有代码 ...

  private visualizer!: PredictionVisualizer;
  private splitScreen!: SplitScreenManager;
  private dynamicsModel!: DynamicsModel;

  async create(): Promise<void> {
    // ... 已有代码 ...

    // 加载模型
    this.dynamicsModel = new DynamicsModel();
    await this.dynamicsModel.load('/models/dynamics-model/model.json');

    // 创建编码器
    const encoder = new StateEncoder({
      worldWidth: 800,
      worldHeight: 600,
      maxVelocity: 500,
      maxPlatforms: 3,
    });

    // 初始化可视化
    this.visualizer = new PredictionVisualizer(
      this,
      this.dynamicsModel,
      encoder
    );

    // 设置分屏
    this.splitScreen = new SplitScreenManager(this);
    this.splitScreen.syncCameras(this.player.getSprite());

    // 快捷键：切换分屏模式
    this.input.keyboard!.on('keydown-V', () => {
      this.splitScreen.toggleMode();
    });
  }

  update(): void {
    // ... 已有代码 ...

    // 更新预测可视化
    const state = this.getCurrentGameState();
    const action = this.player.getCurrentAction();

    this.visualizer.update(state, action);
  }
}
```

---

### 文件4: `src/ui/ErrorChart.ts`（误差曲线图）

```typescript
import Phaser from 'phaser';

/**
 * 实时误差曲线图
 */
export class ErrorChart {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  private errorHistory: number[] = [];
  private readonly MAX_HISTORY = 100;

  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 300,
    height: number = 100
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.graphics = scene.add.graphics();
  }

  /**
   * 添加误差数据点
   */
  addError(error: number): void {
    this.errorHistory.push(error);

    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift();
    }

    this.render();
  }

  /**
   * 渲染图表
   */
  private render(): void {
    this.graphics.clear();

    // 背景
    this.graphics.fillStyle(0x000000, 0.7);
    this.graphics.fillRect(this.x, this.y, this.width, this.height);

    // 边框
    this.graphics.lineStyle(1, 0xffffff, 0.5);
    this.graphics.strokeRect(this.x, this.y, this.width, this.height);

    if (this.errorHistory.length < 2) return;

    // 找最大值（用于缩放）
    const maxError = Math.max(...this.errorHistory, 10); // 至少10

    // 绘制曲线
    this.graphics.lineStyle(2, 0xff0000, 1);

    const stepX = this.width / this.MAX_HISTORY;

    this.graphics.beginPath();

    this.errorHistory.forEach((error, i) => {
      const x = this.x + i * stepX;
      const y = this.y + this.height - (error / maxError) * this.height;

      if (i === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    });

    this.graphics.strokePath();

    // 添加标签
    this.scene.add.text(this.x + 5, this.y + 5, 'Prediction Error (px)', {
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0, 0);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
```

---

## 🎮 最终效果演示代码

### 完整集成示例

```typescript
// src/game/GameScene.ts (完整版)

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private level!: Level;

  private dynamicsModel!: DynamicsModel;
  private encoder!: StateEncoder;

  private visualizer!: PredictionVisualizer;
  private splitScreen!: SplitScreenManager;
  private errorChart!: ErrorChart;

  async create(): Promise<void> {
    // 1. 初始化游戏对象
    this.level = new Level(this);
    this.level.loadLevel(1);

    this.player = new Player(this, 100, 100);
    this.physics.add.collider(
      this.player.getSprite(),
      this.level.getPlatforms()
    );

    // 2. 加载AI模型
    this.dynamicsModel = new DynamicsModel();
    await this.dynamicsModel.load('/models/dynamics-model/model.json');

    this.encoder = new StateEncoder({
      worldWidth: 800,
      worldHeight: 600,
      maxVelocity: 500,
      maxPlatforms: 3,
    });

    // 3. 初始化可视化
    this.visualizer = new PredictionVisualizer(
      this,
      this.dynamicsModel,
      this.encoder
    );

    this.splitScreen = new SplitScreenManager(this);
    this.splitScreen.syncCameras(this.player.getSprite());

    this.errorChart = new ErrorChart(this, 420, 480, 360, 100);

    // 4. 添加控制提示
    this.add.text(10, 560, '控制: ← → 移动 | Space 跳跃 | V 切换分屏', {
      fontSize: '14px',
      color: '#ffff00',
    });
  }

  update(): void {
    this.player.update();

    // 获取当前状态
    const state = this.getCurrentGameState();
    const action = this.player.getCurrentAction();

    // 更新可视化
    this.visualizer.update(state, action);

    // 更新误差图表（可选）
    // this.errorChart.addError(currentError);
  }

  private getCurrentGameState(): any {
    return {
      timestamp: this.time.now,
      frame: 0,
      player: this.player.getState(),
      action: this.player.getCurrentAction(),
    };
  }
}
```

---

## ✅ 验收标准

完成Module 6后，应该能做到：
- [x] 分屏显示真实游戏和预测结果
- [x] 实时显示未来3-5帧的预测轨迹
- [x] 半透明"幽灵玩家"跟随预测位置
- [x] 显示预测误差数值
- [x] 可切换全屏/分屏模式
- [x] 轨迹线平滑绘制

---

## 🐛 常见问题

### Q1: 预测轨迹抖动？
**A:** 使用平滑滤波：
```typescript
// 移动平均
smoothedPrediction = 0.7 * currentPrediction + 0.3 * lastPrediction;
```

### Q2: 分屏后性能下降？
**A:**
1. 减少预测步数（5 → 3）
2. 降低更新频率（每2帧更新一次）
3. 优化图形绘制（使用精灵代替graphics）

### Q3: 预测延迟明显？
**A:** 模型推理太慢，检查：
```typescript
console.time('predict');
model.predict(...);
console.timeEnd('predict'); // 应该 < 5ms
```

---

## 🎯 下一步优化

### 高级功能扩展

1. **多路径预测**
   - 预测多个可能的动作序列
   - 显示概率分布

2. **不确定性可视化**
   - 显示预测的置信区间
   - 用颜色表示确定性

3. **时间轴回放**
   - 录制预测和真实对比
   - 慢动作回放分析

4. **3D可视化**
   - 使用Three.js渲染立体轨迹
   - 更丰富的视觉效果

---

## 📚 总结

完成全部6个模块后，你将拥有：

✅ **完整的2D平台游戏引擎**
✅ **世界模型训练流程**
✅ **实时预测可视化系统**
✅ **数据收集和模型训练工具**

**项目成果：**
- 可玩的Demo游戏
- 可解释的AI模型
- 完整的技术文档
- 可扩展的代码架构

---

## 🎓 学习路径建议

### 对于初学者：

1. **第1周**: Module 1 + Module 2（基础游戏 + 编码器）
2. **第2周**: Module 4（数据收集，先用简单随机策略）
3. **第3周**: Module 3 浏览器版训练（跳过Python）
4. **第4周**: Module 6（可视化）

### 对于有经验的开发者：

1. **第1-2天**: Module 1-4（游戏 + 数据收集）
2. **第3-4天**: Module 5（Python训练完整模型）
3. **第5天**: Module 6（高级可视化）

---

**恭喜！你已经掌握了基于世界模型的2D游戏引擎的全部设计。**

**开始动手实现吧！** 🚀
