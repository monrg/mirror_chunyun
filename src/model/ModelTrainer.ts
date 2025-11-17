import * as tf from '@tensorflow/tfjs';
import { DynamicsModel } from './DynamicsModel';
import { GameState } from '@/game/types';
import { StateEncoder } from './StateEncoder';

/**
 * 模型训练器
 * 处理数据准备、训练流程
 */
export class ModelTrainer {
  private encoder: StateEncoder;
  private model: DynamicsModel;

  constructor(encoder: StateEncoder) {
    this.encoder = encoder;
    this.model = new DynamicsModel();
  }

  /**
   * 从游戏记录准备训练数据
   */
  prepareTrainingData(states: GameState[]): {
    trainX: tf.Tensor2D;
    trainY: tf.Tensor2D;
  } {
    const inputs: number[][] = [];
    const outputs: number[][] = [];

    for (let i = 0; i < states.length - 1; i++) {
      const currentState = states[i];
      const nextState = states[i + 1];

      // 编码当前状态
      const encodedCurrent = this.encoder.encode(currentState);
      const encodedNext = this.encoder.encode(nextState);

      // 输入：[当前状态(24维) + 当前动作(6维)]
      const input = [
        ...Array.from(encodedCurrent.metadata.playerFeatures),
        ...Array.from(encodedCurrent.metadata.actionFeatures),
        ...Array.from(encodedCurrent.metadata.environmentFeatures),
      ];

      // 输出：[下一帧玩家状态(6维)]
      const output = Array.from(encodedNext.metadata.playerFeatures);

      inputs.push(input);
      outputs.push(output);
    }

    return {
      trainX: tf.tensor2d(inputs),
      trainY: tf.tensor2d(outputs),
    };
  }

  /**
   * 执行训练
   */
  async trainModel(
    states: GameState[],
    options: {
      epochs?: number;
      batchSize?: number;
      onEpochEnd?: (epoch: number, logs: any) => void;
    } = {}
  ): Promise<void> {
    console.log('准备训练数据...');
    const { trainX, trainY } = this.prepareTrainingData(states);

    console.log(`数据集大小: ${trainX.shape[0]} 样本`);
    console.log(`输入维度: ${trainX.shape[1]}`);
    console.log(`输出维度: ${trainY.shape[1]}`);

    // 创建并编译模型
    this.model.createModel(trainX.shape[1], trainY.shape[1]);
    this.model.compile();
    this.model.summary();

    // 训练
    console.log('开始训练...');
    await this.model.train(trainX, trainY, {
      epochs: options.epochs ?? 50,
      batchSize: options.batchSize ?? 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(
            `Epoch ${epoch + 1}: ` +
            `loss=${logs?.loss.toFixed(4)}, ` +
            `val_loss=${logs?.val_loss.toFixed(4)}`
          );
          options.onEpochEnd?.(epoch, logs);
        },
      },
    });

    // 清理
    trainX.dispose();
    trainY.dispose();

    console.log('训练完成！');
  }

  /**
   * 评估模型性能
   */
  evaluate(testStates: GameState[]): {
    mse: number;
    mae: number;
  } {
    const { trainX, trainY } = this.prepareTrainingData(testStates);

    if (testStates.length === 0) {
      trainX.dispose();
      trainY.dispose();
      return { mse: 0, mae: 0 };
    }

    const predictions = this.model.predict(
      trainX.arraySync()[0] as any,
      new Float32Array(6)
    );

    // 计算误差
    const mse = tf.losses.meanSquaredError(trainY, tf.tensor2d([predictions]));
    const mae = tf.metrics.meanAbsoluteError(trainY, tf.tensor2d([predictions]));

    const result = {
      mse: mse.dataSync()[0],
      mae: mae.dataSync()[0],
    };

    trainX.dispose();
    trainY.dispose();
    mse.dispose();
    mae.dispose();

    return result;
  }

  /**
   * 保存模型到本地
   */
  async saveModel(path: string = 'downloads://dynamics-model'): Promise<void> {
    await this.model.save(path);
  }

  getModel(): DynamicsModel {
    return this.model;
  }
}
