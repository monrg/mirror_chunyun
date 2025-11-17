import Phaser from 'phaser';
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
    return (this.sprite.body as Phaser.Physics.Arcade.Body).touching.down;
  }

  /**
   * 获取当前状态（用于记录训练数据）
   */
  getState() {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
      onGround: this.isOnGround(),
      facingRight: body.velocity.x >= 0,
    };
  }

  /**
   * 获取Phaser精灵对象（用于碰撞检测）
   */
  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }
}
