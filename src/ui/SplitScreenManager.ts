import Phaser from 'phaser';

/**
 * 分屏管理器
 * 创建左右分屏视图
 */
export class SplitScreenManager {
  private scene: Phaser.Scene;
  private mainCamera: Phaser.Cameras.Scene2D.Camera;
  private predictionCamera: Phaser.Cameras.Scene2D.Camera | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 获取主相机
    this.mainCamera = scene.cameras.main;

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

    // 创建右侧预测相机
    this.predictionCamera = this.scene.cameras.add(
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
    if (this.predictionCamera) {
      this.predictionCamera.startFollow(target, false, 0.1, 0.1);
    }
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
      if (this.predictionCamera) {
        this.predictionCamera.setViewport(0, 0, 0, 0); // 隐藏
      }
    }
  }
}
