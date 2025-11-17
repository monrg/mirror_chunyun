# Module 1: 基础游戏引擎设计文档

## 🎯 模块目标

创建一个**可玩的2D平台跳跃游戏**，包含：
- ✅ 玩家角色（可以左右移动、跳跃）
- ✅ 简单关卡（几个平台）
- ✅ 物理系统（重力、碰撞检测）
- ✅ 状态记录（为后续AI训练准备数据）

---

## 🧰 技术栈解释

### Phaser.js - 游戏引擎
**是什么？**
一个专门用来做2D游戏的JavaScript库，帮你处理：
- 游戏画面渲染（把方块、角色画到屏幕上）
- 物理引擎（重力、碰撞、速度）
- 输入处理（键盘、鼠标）
- 游戏循环（每秒60次更新画面）

**为什么选它？**
- 文档完善，初学者友好
- 内置物理引擎（Arcade Physics）
- 社区活跃，问题容易找到答案

**官方文档：** https://phaser.io/docs

---

## 📐 架构设计

### 1. 游戏循环原理

```
游戏启动
   ↓
┌─────────────────┐
│  preload()      │ ← 加载资源（图片、音频）
│  加载阶段       │
└─────────────────┘
   ↓
┌─────────────────┐
│  create()       │ ← 初始化游戏对象（玩家、平台）
│  初始化阶段     │
└─────────────────┘
   ↓
┌─────────────────┐
│  update()       │ ← 每帧执行（60次/秒）
│  游戏循环       │    - 检测输入
│                 │    - 更新物理
│                 │    - 记录状态
└─────────────────┘
   ↑_______________|
      每16.67ms重复
```

### 2. 文件结构

```
src/game/
├─ GameScene.ts          # 主场景（游戏的"舞台"）
├─ Player.ts             # 玩家类（角色逻辑）
├─ Level.ts              # 关卡类（平台布局）
├─ GameState.ts          # 状态管理（记录游戏数据）
└─ types.ts              # 类型定义
```

---

## 📝 代码框架详解

### 文件1: `src/game/types.ts`（类型定义）

```typescript
/**
 * 游戏状态快照
 * 每一帧都会记录这些数据，用于后续AI训练
 */
export interface GameState {
  timestamp: number;        // 时间戳（毫秒）
  player: {
    x: number;              // 玩家X坐标（像素）
    y: number;              // 玩家Y坐标（像素）
    velocityX: number;      // 水平速度（像素/秒）
    velocityY: number;      // 垂直速度（像素/秒）
    onGround: boolean;      // 是否在地面上
    facingRight: boolean;   // 是否面朝右边
  };
  action: PlayerAction;     // 当前帧的动作
  frame: number;            // 帧编号
}

/**
 * 玩家动作枚举
 */
export enum PlayerAction {
  IDLE = 'idle',           // 站立不动
  MOVE_LEFT = 'left',      // 向左移动
  MOVE_RIGHT = 'right',    // 向右移动
  JUMP = 'jump',           // 跳跃
  MOVE_LEFT_JUMP = 'left_jump',   // 左跳
  MOVE_RIGHT_JUMP = 'right_jump', // 右跳
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  x: number;              // 平台中心X坐标
  y: number;              // 平台中心Y坐标
  width: number;          // 平台宽度
  height: number;         // 平台高度
}

/**
 * 关卡配置
 */
export interface LevelConfig {
  platforms: PlatformConfig[];  // 平台数组
  playerStart: {                // 玩家起始位置
    x: number;
    y: number;
  };
  goal: {                       // 目标点位置
    x: number;
    y: number;
  };
}
```

---

### 文件2: `src/game/Level.ts`（关卡配置）

```typescript
import { LevelConfig, PlatformConfig } from './types';

/**
 * 关卡管理类
 * 负责定义关卡布局、创建平台
 */
export class Level {
  private scene: Phaser.Scene;
  private platforms: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // 创建静态物理组（平台不会移动）
    this.platforms = this.scene.physics.add.staticGroup();
  }

  /**
   * 加载预设关卡
   * @param levelId 关卡ID（1, 2, 3...）
   */
  loadLevel(levelId: number): void {
    const config = this.getLevelConfig(levelId);
    this.createPlatforms(config.platforms);
    this.createGoal(config.goal);
  }

  /**
   * 创建平台
   */
  private createPlatforms(configs: PlatformConfig[]): void {
    configs.forEach(config => {
      // 创建矩形平台（用Phaser的图形API）
      const platform = this.scene.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        0x00ff00  // 绿色
      );

      // 添加到物理系统
      this.platforms.add(platform);
    });

    // 刷新物理边界
    this.platforms.refresh();
  }

  /**
   * 创建目标点
   */
  private createGoal(goal: { x: number; y: number }): void {
    this.scene.add.circle(goal.x, goal.y, 20, 0xffff00); // 黄色圆圈
  }

  /**
   * 获取关卡配置
   */
  private getLevelConfig(levelId: number): LevelConfig {
    // 预设关卡1（简单的阶梯）
    if (levelId === 1) {
      return {
        platforms: [
          { x: 400, y: 550, width: 800, height: 50 },  // 地面
          { x: 200, y: 450, width: 200, height: 20 },  // 平台1
          { x: 500, y: 350, width: 200, height: 20 },  // 平台2
          { x: 300, y: 250, width: 200, height: 20 },  // 平台3
        ],
        playerStart: { x: 100, y: 100 },
        goal: { x: 350, y: 200 },
      };
    }

    // 默认空关卡
    return {
      platforms: [{ x: 400, y: 550, width: 800, height: 50 }],
      playerStart: { x: 400, y: 100 },
      goal: { x: 700, y: 500 },
    };
  }

  /**
   * 获取平台物理组（供碰撞检测使用）
   */
  getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    return this.platforms;
  }
}
```

**关键概念：**
- **StaticGroup**: 静态物理组，里面的物体不会动（平台固定）
- **坐标系**: 左上角是(0, 0)，X向右增加，Y向下增加

---

### 文件3: `src/game/Player.ts`（玩家控制）

```typescript
import { PlayerAction } from './types';

/**
 * 玩家类
 * 处理角色移动、跳跃、动作检测
 */
export class Player {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private scene: Phaser.Scene;

  // 运动参数
  private readonly MOVE_SPEED = 200;    // 移动速度（像素/秒）
  private readonly JUMP_VELOCITY = -400; // 跳跃初速度（负数=向上）

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // 创建玩家精灵（用矩形代替，后续可替换为图片）
    this.sprite = scene.physics.add.sprite(x, y, '');
    this.sprite.setDisplaySize(32, 32);
    this.sprite.setTint(0xff0000); // 红色

    // 设置物理属性
    this.sprite.setBounce(0);          // 弹性为0（不反弹）
    this.sprite.setCollideWorldBounds(true); // 不能超出世界边界
    this.sprite.setGravityY(800);      // 重力加速度

    // 绑定键盘
    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

  /**
   * 每帧更新（在GameScene的update中调用）
   */
  update(): void {
    const action = this.getCurrentAction();
    this.handleMovement(action);
  }

  /**
   * 检测当前动作
   */
  getCurrentAction(): PlayerAction {
    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.space!);
    const onGround = this.isOnGround();

    // 组合判断（优先级：跳跃 > 移动）
    if (jump && onGround) {
      if (left) return PlayerAction.MOVE_LEFT_JUMP;
      if (right) return PlayerAction.MOVE_RIGHT_JUMP;
      return PlayerAction.JUMP;
    }

    if (left) return PlayerAction.MOVE_LEFT;
    if (right) return PlayerAction.MOVE_RIGHT;

    return PlayerAction.IDLE;
  }

  /**
   * 处理移动逻辑
   */
  private handleMovement(action: PlayerAction): void {
    // 重置水平速度
    this.sprite.setVelocityX(0);

    switch (action) {
      case PlayerAction.MOVE_LEFT:
      case PlayerAction.MOVE_LEFT_JUMP:
        this.sprite.setVelocityX(-this.MOVE_SPEED);
        break;

      case PlayerAction.MOVE_RIGHT:
      case PlayerAction.MOVE_RIGHT_JUMP:
        this.sprite.setVelocityX(this.MOVE_SPEED);
        break;
    }

    // 处理跳跃
    if (action.includes('jump') && this.isOnGround()) {
      this.sprite.setVelocityY(this.JUMP_VELOCITY);
    }
  }

  /**
   * 检测是否在地面
   */
  isOnGround(): boolean {
    return this.sprite.body!.touching.down;
  }

  /**
   * 获取当前状态（用于记录训练数据）
   */
  getState() {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      velocityX: this.sprite.body!.velocity.x,
      velocityY: this.sprite.body!.velocity.y,
      onGround: this.isOnGround(),
      facingRight: this.sprite.body!.velocity.x >= 0,
    };
  }

  /**
   * 获取Phaser精灵对象（用于碰撞检测）
   */
  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }
}
```

**关键概念：**
- **Sprite**: 游戏对象（可以是角色、敌人、道具）
- **Velocity**: 速度（每秒移动多少像素）
- **JustDown**: 检测按键是否"刚刚按下"（避免连续跳跃）

---

### 文件4: `src/game/GameState.ts`（状态记录）

```typescript
import { GameState, PlayerAction } from './types';

/**
 * 游戏状态管理器
 * 记录每一帧的游戏状态，用于后续AI训练
 */
export class GameStateRecorder {
  private states: GameState[] = [];
  private frameCount: number = 0;
  private startTime: number = Date.now();

  /**
   * 记录当前帧状态
   */
  recordState(playerState: any, action: PlayerAction): void {
    const state: GameState = {
      timestamp: Date.now() - this.startTime,
      player: playerState,
      action: action,
      frame: this.frameCount++,
    };

    this.states.push(state);

    // 限制内存：只保留最近3000帧（约50秒）
    if (this.states.length > 3000) {
      this.states.shift();
    }
  }

  /**
   * 导出所有状态（JSON格式）
   */
  exportStates(): string {
    return JSON.stringify(this.states, null, 2);
  }

  /**
   * 下载为文件
   */
  downloadAsFile(): void {
    const data = this.exportStates();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `game_states_${Date.now()}.json`;
    a.click();
  }

  /**
   * 获取状态总数
   */
  getStateCount(): number {
    return this.states.length;
  }

  /**
   * 清空记录
   */
  clear(): void {
    this.states = [];
    this.frameCount = 0;
    this.startTime = Date.now();
  }
}
```

---

### 文件5: `src/game/GameScene.ts`（主场景）

```typescript
import Phaser from 'phaser';
import { Player } from './Player';
import { Level } from './Level';
import { GameStateRecorder } from './GameState';

/**
 * 游戏主场景
 * 整合所有游戏组件
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private level!: Level;
  private recorder!: GameStateRecorder;

  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * 预加载资源（图片、音频等）
   */
  preload(): void {
    // 暂时不需要加载资源（用纯色矩形代替）
  }

  /**
   * 创建游戏对象
   */
  create(): void {
    // 初始化关卡
    this.level = new Level(this);
    this.level.loadLevel(1);

    // 初始化玩家
    const levelConfig = (this.level as any).getLevelConfig(1);
    this.player = new Player(
      this,
      levelConfig.playerStart.x,
      levelConfig.playerStart.y
    );

    // 设置碰撞
    this.physics.add.collider(
      this.player.getSprite(),
      this.level.getPlatforms()
    );

    // 初始化状态记录器
    this.recorder = new GameStateRecorder();

    // 添加信息文本
    this.infoText = this.add.text(10, 10, '', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });

    // 添加键盘提示
    this.add.text(10, 560, '操作: ← → 移动 | Space 跳跃 | D 下载数据', {
      fontSize: '14px',
      color: '#ffff00',
    });

    // 绑定下载快捷键（D键）
    this.input.keyboard!.on('keydown-D', () => {
      this.recorder.downloadAsFile();
      console.log('数据已下载！');
    });
  }

  /**
   * 游戏循环（每帧执行）
   */
  update(): void {
    // 更新玩家
    this.player.update();

    // 获取当前动作
    const action = this.player.getCurrentAction();

    // 记录状态
    this.recorder.recordState(this.player.getState(), action);

    // 更新信息显示
    const state = this.player.getState();
    this.infoText.setText([
      `帧数: ${this.recorder.getStateCount()}`,
      `位置: (${state.x.toFixed(0)}, ${state.y.toFixed(0)})`,
      `速度: (${state.velocityX.toFixed(0)}, ${state.velocityY.toFixed(0)})`,
      `动作: ${action}`,
      `着地: ${state.onGround ? '是' : '否'}`,
    ]);
  }
}
```

---

### 文件6: `src/main.ts`（入口文件）

```typescript
import Phaser from 'phaser';
import { GameScene } from './game/GameScene';

/**
 * Phaser游戏配置
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,              // 自动选择渲染器（WebGL优先）
  width: 800,                     // 游戏宽度
  height: 600,                    // 游戏高度
  parent: 'game-container',       // 挂载到哪个HTML元素
  backgroundColor: '#1a1a2e',     // 背景色
  physics: {
    default: 'arcade',            // 使用Arcade物理引擎
    arcade: {
      gravity: { y: 0 },          // 全局重力（我们在Player中单独设置）
      debug: false,               // 是否显示调试信息（碰撞框等）
    },
  },
  scene: [GameScene],             // 加载的场景列表
};

// 创建游戏实例
const game = new Phaser.Game(config);

// 开发模式：暴露到全局（方便调试）
if (import.meta.env.DEV) {
  (window as any).game = game;
}
```

---

## 🎮 运行效果

启动游戏后，你会看到：

```
┌─────────────────────────────────┐
│ 帧数: 1234                      │
│ 位置: (123, 456)                │
│ 速度: (0, -200)                 │
│ 动作: jump                      │
│ 着地: 否                        │
├─────────────────────────────────┤
│                                 │
│        🔴 (玩家)                │
│                                 │
│   ▬▬▬▬▬▬                       │
│         ▬▬▬▬▬▬                 │
│  ▬▬▬▬▬▬                        │
│                                 │
│▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│                                 │
│ 操作: ← → 移动 | Space 跳跃 |  │
│       D 下载数据                │
└─────────────────────────────────┘
```

---

## ✅ 验收标准

完成Module 1后，应该能做到：
- [x] 角色能左右移动
- [x] 按空格能跳跃
- [x] 能在平台上站立（不会掉下去）
- [x] 按D键能下载游戏状态JSON文件
- [x] 屏幕左上角显示实时信息

---

## 🐛 常见问题

### Q1: 角色一直往下掉，穿过平台？
**A:** 检查是否添加了碰撞检测：
```typescript
this.physics.add.collider(player.getSprite(), level.getPlatforms());
```

### Q2: 按键没反应？
**A:** 检查键盘绑定：
```typescript
this.cursors = scene.input.keyboard!.createCursorKeys();
```

### Q3: 跳跃太低/太高？
**A:** 调整参数：
```typescript
private readonly JUMP_VELOCITY = -400;  // 数值越大跳得越高
this.sprite.setGravityY(800);          // 重力越大下落越快
```

---

## 🎯 下一步

完成Module 1后，继续学习：
- `02-Module2-状态编码器.md` - 如何把游戏状态转换为AI能理解的数字
