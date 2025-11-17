import Phaser from 'phaser';
import { LevelConfig, PlatformConfig } from './types';

/**
 * 关卡管理类
 * 负责定义关卡布局、创建平台
 */
export class Level {
  private scene: Phaser.Scene;
  private platforms: Phaser.Physics.Arcade.StaticGroup;
  private goalSprite: Phaser.GameObjects.Arc | null = null;

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
    this.goalSprite = this.scene.add.circle(goal.x, goal.y, 20, 0xffff00); // 黄色圆圈
  }

  /**
   * 获取关卡配置
   */
  getLevelConfig(levelId: number): LevelConfig {
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

  /**
   * 获取目标点
   */
  getGoal(): Phaser.GameObjects.Arc | null {
    return this.goalSprite;
  }
}
