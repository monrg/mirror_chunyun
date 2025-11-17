import * as tf from '@tensorflow/tfjs';

/**
 * 动态预测模型
 * 预测：state_t+1 = f(state_t, action_t)
 */
export class DynamicsModel {
  private model: tf.LayersModel | null = null;
  private isReady: boolean = false;

  /**
   * 创建新模型（用于训练）
   */
  createModel(inputDim: number, outputDim: number): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // 输入层
        tf.layers.dense({
          inputShape: [inputDim],  // 30维（24状态 + 6动作）
          units: 128,              // 隐藏层神经元数量
          activation: 'relu',      // ReLU激活函数
          kernelInitializer: 'heNormal', // 权重初始化方式
        }),

        // 隐藏层1
        tf.layers.dense({
          units: 128,
          activation: 'relu',
        }),

        // 隐藏层2（可选）
        tf.layers.dense({
          units: 64,
          activation: 'relu',
        }),

        // 输出层
        tf.layers.dense({
          units: outputDim,        // 6维（只预测玩家状态）
          activation: 'linear',    // 线性输出（回归任务）
        }),
      ],
    });

    this.model = model;
    return model;
  }

  /**
   * 编译模型（设置训练参数）
   */
  compile(): void {
    if (!this.model) throw new Error('模型未创建');

    this.model.compile({
      optimizer: tf.train.adam(0.001),  // Adam优化器，学习率0.001
      loss: 'meanSquaredError',         // MSE损失（回归任务标准）
      metrics: ['mae'],                 // 额外监控平均绝对误差
    });
  }

  /**
   * 训练模型
   */
  async train(
    trainX: tf.Tensor2D,
    trainY: tf.Tensor2D,
    options: {
      epochs?: number;
      batchSize?: number;
      validationSplit?: number;
      callbacks?: tf.CustomCallbackArgs;
    } = {}
  ): Promise<tf.History> {
    if (!this.model) throw new Error('模型未创建');

    const history = await this.model.fit(trainX, trainY, {
      epochs: options.epochs ?? 50,
      batchSize: options.batchSize ?? 32,
      validationSplit: options.validationSplit ?? 0.2,
      shuffle: true,
      callbacks: options.callbacks,
    });

    this.isReady = true;
    return history;
  }

  /**
   * 预测下一帧状态
   * @param currentState 当前状态向量（24维）
   * @param action 动作向量（6维）
   * @returns 预测的下一帧玩家状态（6维）
   */
  predict(currentState: Float32Array, action: Float32Array): Float32Array {
    if (!this.model || !this.isReady) {
      throw new Error('模型未就绪');
    }

    return tf.tidy(() => {
      // 拼接输入
      const input = tf.concat([
        tf.tensor2d([Array.from(currentState)]),
        tf.tensor2d([Array.from(action)]),
      ], 1);

      // 预测
      const prediction = this.model!.predict(input) as tf.Tensor;

      // 转换为数组
      const result = prediction.dataSync();
      return new Float32Array(result);
    });
  }

  /**
   * 多步预测（预测未来N帧）
   */
  predictMultiStep(
    initialState: Float32Array,
    actions: Float32Array[],
    steps: number
  ): Float32Array[] {
    const predictions: Float32Array[] = [];
    let currentState = initialState;

    for (let i = 0; i < steps && i < actions.length; i++) {
      const nextState = this.predict(currentState, actions[i]);
      predictions.push(nextState);

      // 构建下一个输入（保留环境特征，更新玩家状态）
      const newState = new Float32Array(currentState.length);
      newState.set(nextState, 0);            // 玩家状态
      newState.set(actions[i], 6);           // 动作
      newState.set(currentState.slice(12), 12); // 环境（不变）

      currentState = newState;
    }

    return predictions;
  }

  /**
   * 加载预训练模型
   */
  async load(modelPath: string): Promise<void> {
    this.model = await tf.loadLayersModel(modelPath);
    this.isReady = true;
    console.log('模型加载成功:', modelPath);
  }

  /**
   * 保存模型
   */
  async save(savePath: string): Promise<void> {
    if (!this.model) throw new Error('模型未创建');
    await this.model.save(savePath);
    console.log('模型已保存到:', savePath);
  }

  /**
   * 获取模型信息
   */
  summary(): void {
    if (!this.model) throw new Error('模型未创建');
    this.model.summary();
  }

  /**
   * 释放内存
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isReady = false;
    }
  }
}
