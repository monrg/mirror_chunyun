import Phaser from 'phaser';
import { DynamicsModel } from '@/model/DynamicsModel';
import { StateEncoder } from '@/model/StateEncoder';
import { PlayerAction } from '@/game/types';

/**
 * 预测可视化器
 * 负责渲染模型预测结果
 */
export class PredictionVisualizer {
  private scene: Phaser.Scene;
  private model: DynamicsModel;
  private encoder: StateEncoder;

  // 可视化对象
  private predictedSprites: Phaser.GameObjects.Rectangle[] = [];
  private trajectoryLine: Phaser.GameObjects.Graphics;
  private errorText: Phaser.GameObjects.Text;

  // 配置
  private readonly PREDICTION_STEPS = 5;  // 预测未来5帧
  private readonly GHOST_ALPHA = 0.5;     // 半透明度

  // 上一次预测（用于计算误差）
  private lastPrediction: Float32Array | null = null;

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
      const sprite = this.scene.add.rectangle(0, 0, 32, 32, 0x00ffff); // 青色
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
  update(currentState: any, currentAction: PlayerAction): void {
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

    // 计算并显示误差
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
   * 编码动作（临时方法）
   */
  private encodeAction(action: PlayerAction): Float32Array {
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
