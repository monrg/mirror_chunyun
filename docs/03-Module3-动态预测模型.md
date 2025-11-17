# Module 3: 动态预测模型设计文档

## 🎯 模块目标

训练一个**神经网络模型**，能够根据当前状态和动作，预测下一帧的游戏状态。

**核心功能：** `下一帧状态 = 模型(当前状态 + 动作)`

**类比：** 就像物理公式 `s = v×t + ½at²`，但用神经网络"学习"游戏的物理规律。

---

## 🧰 技术栈解释

### TensorFlow.js - 浏览器端机器学习

**是什么？**
- Google开发的机器学习库
- 能在浏览器中运行神经网络（无需后端）
- 支持模型训练和推理

**为什么选它？**
- 纯前端方案，部署简单
- 与Python的TensorFlow兼容（可以互转模型）
- GPU加速支持（WebGL）

**官方文档：** https://www.tensorflow.org/js

### 神经网络架构：MLP（多层感知机）

```
输入层                隐藏层              输出层
(24+6=30维)          (128维)             (24维)

[状态向量]  →  [Dense] → ReLU  →  [Dense] → ReLU  →  [Dense]  →  [下一帧状态]
[动作向量]      全连接    激活     全连接    激活     全连接      (只有玩家状态)

权重参数: 30×128 + 128×128 + 128×24 ≈ 20,000 个参数
```

**为什么用MLP？**
- 结构简单，训练快
- 对于状态转移这种"映射"问题效果好
- 参数量小，浏览器能轻松运行

**完整项目可以用：**
- RNN/LSTM（处理时间序列）
- Transformer（更强的表达能力）

---

## 📐 架构设计

### 模型输入输出

```typescript
输入：
┌─────────────────────┐
│ 当前状态向量 (24维)  │  ← 来自StateEncoder
│ 动作向量 (6维)       │  ← One-Hot编码
└─────────────────────┘
         ↓ concat拼接
┌─────────────────────┐
│ 合并向量 (30维)      │
└─────────────────────┘
         ↓ 神经网络
┌─────────────────────┐
│ 预测状态 (24维)      │  ← 只预测玩家状态(6维)
└─────────────────────┘
```

**为什么只预测玩家状态？**
- 动作不需要预测（已知）
- 环境信息不变（平台是静态的）
- 简化模型，提高准确度

### 训练流程

```
1. 数据准备
   ├─ 读取游戏记录JSON
   ├─ 编码为向量
   └─ 构建训练对(X, Y)
       X = [state_t, action_t]
       Y = [state_t+1]

2. 模型训练
   ├─ 定义模型结构
   ├─ 编译模型（选择优化器、损失函数）
   ├─ 训练（反向传播）
   └─ 验证（测试集评估）

3. 模型导出
   ├─ 保存为TensorFlow.js格式
   └─ 放到 public/models/ 目录
```

---

## 📝 代码框架详解

### 文件1: `src/model/DynamicsModel.ts`（模型定义）

```typescript
import * as tf from '@tensorflow/tfjs';
import { EncodedState } from './types';

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
```

**关键概念解释：**

1. **tf.tidy()** - 自动内存管理
   ```typescript
   // TensorFlow.js需要手动管理GPU内存
   tf.tidy(() => {
     // 这里创建的Tensor会自动释放
     const result = model.predict(input);
     return result.dataSync(); // 只返回JavaScript数组
   });
   ```

2. **激活函数**
   - **ReLU**: `f(x) = max(0, x)` - 防止梯度消失，训练快
   - **Linear**: 直接输出（回归任务用）

3. **损失函数**
   - **MSE**: 均方误差，`(预测值 - 真实值)²` 的平均

---

### 文件2: `src/model/ModelTrainer.ts`（训练辅助）

```typescript
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
```

---

### 文件3: `train/train_dynamics.html`（浏览器端训练界面）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>模型训练 - 动态预测模型</title>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 5px;
    }
    button:hover { background: #45a049; }
    #log {
      background: #1e1e1e;
      color: #00ff00;
      padding: 15px;
      border-radius: 4px;
      height: 300px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      margin-top: 20px;
    }
    .progress {
      width: 100%;
      height: 30px;
      background: #ddd;
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-bar {
      height: 100%;
      background: #4CAF50;
      width: 0%;
      transition: width 0.3s;
      text-align: center;
      line-height: 30px;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧠 动态预测模型训练</h1>

    <div>
      <input type="file" id="dataFile" accept=".json">
      <button onclick="loadData()">1. 加载训练数据</button>
    </div>

    <div id="dataInfo" style="margin: 10px 0; color: #666;"></div>

    <button onclick="startTraining()" id="trainBtn" disabled>2. 开始训练</button>
    <button onclick="saveModel()" id="saveBtn" disabled>3. 保存模型</button>

    <div class="progress">
      <div class="progress-bar" id="progress">0%</div>
    </div>

    <div id="log"></div>
  </div>

  <script type="module">
    let trainingData = null;
    let model = null;

    window.loadData = async function() {
      const file = document.getElementById('dataFile').files[0];
      if (!file) return alert('请选择文件');

      const text = await file.text();
      trainingData = JSON.parse(text);

      log(`✓ 加载成功: ${trainingData.length} 条记录`);
      document.getElementById('dataInfo').textContent =
        `数据集: ${trainingData.length} 帧 (${(trainingData.length/60).toFixed(1)}秒游戏时间)`;
      document.getElementById('trainBtn').disabled = false;
    };

    window.startTraining = async function() {
      if (!trainingData) return;

      log('开始训练...');
      document.getElementById('trainBtn').disabled = true;

      // 准备数据（简化版，实际使用ModelTrainer）
      const inputs = [], outputs = [];
      for (let i = 0; i < trainingData.length - 1; i++) {
        const curr = trainingData[i].player;
        const next = trainingData[i + 1].player;

        inputs.push([
          curr.x / 800, curr.y / 600,
          curr.velocityX / 500, curr.velocityY / 500,
          curr.onGround ? 1 : 0, curr.facingRight ? 1 : 0
        ]);

        outputs.push([
          next.x / 800, next.y / 600,
          next.velocityX / 500, next.velocityY / 500,
          next.onGround ? 1 : 0, next.facingRight ? 1 : 0
        ]);
      }

      const xs = tf.tensor2d(inputs);
      const ys = tf.tensor2d(outputs);

      // 创建模型
      model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [6], units: 128, activation: 'relu' }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dense({ units: 6, activation: 'linear' }),
        ],
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae'],
      });

      // 训练
      await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = ((epoch + 1) / 50 * 100).toFixed(0);
            document.getElementById('progress').style.width = progress + '%';
            document.getElementById('progress').textContent = progress + '%';

            log(`Epoch ${epoch + 1}/50 - loss: ${logs.loss.toFixed(4)}, val_loss: ${logs.val_loss.toFixed(4)}`);
          },
        },
      });

      xs.dispose();
      ys.dispose();

      log('✓ 训练完成！');
      document.getElementById('saveBtn').disabled = false;
    };

    window.saveModel = async function() {
      if (!model) return;

      await model.save('downloads://dynamics-model');
      log('✓ 模型已下载！');
    };

    function log(message) {
      const logDiv = document.getElementById('log');
      logDiv.innerHTML += `<div>${new Date().toLocaleTimeString()} - ${message}</div>`;
      logDiv.scrollTop = logDiv.scrollHeight;
    }
  </script>
</body>
</html>
```

---

## 🎮 使用示例

### 在游戏中加载模型

```typescript
// src/game/GameScene.ts

import { DynamicsModel } from '@/model/DynamicsModel';

export class GameScene extends Phaser.Scene {
  private dynamicsModel!: DynamicsModel;

  async create(): Promise<void> {
    // ... 其他初始化 ...

    // 加载预训练模型
    this.dynamicsModel = new DynamicsModel();
    await this.dynamicsModel.load('/models/dynamics-model/model.json');

    console.log('动态预测模型已加载');
  }

  update(): void {
    // 获取当前状态
    const state = this.encoder.encode(this.getCurrentState());

    // 预测下一帧（假设玩家跳跃）
    const jumpAction = new Float32Array([0, 0, 0, 1, 0, 0]); // JUMP
    const prediction = this.dynamicsModel.predict(
      state.vector,
      jumpAction
    );

    // prediction 就是预测的下一帧玩家状态
    console.log('预测位置:', prediction[0] * 800, prediction[1] * 600);
  }
}
```

---

## ✅ 验收标准

完成Module 3后，应该能做到：
- [x] 能创建并训练神经网络模型
- [x] 训练loss收敛到 < 0.01
- [x] 能保存和加载模型
- [x] 预测误差在合理范围（位置误差 < 10像素）
- [x] 能多步预测（预测未来3-5帧）

---

## 🐛 常见问题

### Q1: 训练loss不下降？
**A:** 检查：
1. 学习率是否太小（试试0.01）
2. 数据是否归一化
3. 模型是否太简单（增加层数/神经元）

### Q2: 预测结果全是NaN？
**A:** 检查输入数据是否有NaN：
```typescript
console.log('输入:', state.vector.some(v => isNaN(v)));
```

### Q3: 浏览器卡死？
**A:** 数据量太大，使用Web Worker训练或减少epochs。

---

## 🎯 下一步

完成Module 3后，继续学习：
- `04-Module4-数据收集工具.md` - 如何自动化收集训练数据
