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
    const levelConfig = this.level.getLevelConfig(1);
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
