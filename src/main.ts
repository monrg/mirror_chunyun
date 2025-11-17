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
      gravity: { y: 0, x: 0 },    // 全局重力（我们在Player中单独设置）
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
