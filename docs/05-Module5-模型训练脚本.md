# Module 5: 模型训练脚本设计文档

## 🎯 模块目标

使用**Python + TensorFlow**训练更强大的动态预测模型，然后转换为浏览器可用格式。

**为什么用Python？**
- 训练速度更快（GPU支持更好）
- 工具库更丰富（数据处理、可视化）
- 更灵活的模型调试

---

## 🧰 技术栈解释

### Python生态 vs JavaScript

| 功能 | Python | JavaScript (TF.js) |
|------|--------|-------------------|
| **训练速度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **GPU支持** | CUDA (NVIDIA) | WebGL (所有GPU) |
| **数据处理** | NumPy, Pandas | 手动处理 |
| **可视化** | Matplotlib, TensorBoard | Chart.js |
| **部署** | 需要服务器 | 浏览器直接运行 |

**最佳实践：** Python训练 → 转换为TF.js → 浏览器推理

### TensorFlow vs PyTorch

| 特性 | TensorFlow | PyTorch |
|------|-----------|---------|
| **学习曲线** | 较陡峭 | 较平缓 |
| **浏览器支持** | ✅ TensorFlow.js | ❌ 需要ONNX转换 |
| **工业应用** | Google, Uber | Meta, Tesla |
| **文档** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**我们选择TensorFlow** - 因为能直接转换为TF.js

---

## 📐 架构设计

### 训练流程

```
1. 数据加载
   ├─ 读取JSON文件
   ├─ 解析状态转换
   └─ 分割训练/验证/测试集 (70%/15%/15%)

2. 数据预处理
   ├─ 编码为数值向量
   ├─ 归一化
   └─ 创建批次 (Batch)

3. 模型构建
   ├─ 定义网络结构
   ├─ 初始化权重
   └─ 配置优化器

4. 训练循环
   ├─ 前向传播 (预测)
   ├─ 计算损失
   ├─ 反向传播 (更新权重)
   └─ 验证集评估

5. 模型评估
   ├─ 测试集性能
   ├─ 可视化预测结果
   └─ 误差分析

6. 模型导出
   ├─ 保存为SavedModel格式
   ├─ 转换为TensorFlow.js
   └─ 优化模型大小
```

---

## 📝 代码框架详解

### 文件1: `train/requirements.txt`（依赖列表）

```txt
tensorflow==2.15.0
tensorflowjs==4.17.0
numpy==1.24.3
pandas==2.1.4
matplotlib==3.8.2
scikit-learn==1.3.2
tqdm==4.66.1
```

**安装：**
```bash
pip install -r requirements.txt
```

---

### 文件2: `train/data_loader.py`（数据加载器）

```python
import json
import numpy as np
from typing import Tuple, Dict
from sklearn.model_selection import train_test_split

class GameDataLoader:
    """
    游戏数据加载器
    """

    def __init__(self, json_path: str):
        """
        Args:
            json_path: 训练数据JSON文件路径
        """
        self.json_path = json_path
        self.raw_data = None
        self.metadata = None

    def load(self) -> Dict:
        """加载JSON文件"""
        with open(self.json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.raw_data = data.get('samples', data.get('data', []))
        self.metadata = data.get('metadata', {})

        print(f"✓ 加载数据: {len(self.raw_data)} 条样本")
        print(f"  收集时间: {self.metadata.get('collectedAt', 'Unknown')}")

        return data

    def preprocess(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        预处理数据

        Returns:
            X: 输入特征 (N, input_dim)
            Y: 输出标签 (N, output_dim)
        """
        if not self.raw_data:
            raise ValueError("请先调用 load() 加载数据")

        X_list = []
        Y_list = []

        for sample in self.raw_data:
            # 提取当前状态
            state = sample['state']
            next_state = sample['nextState']

            # 编码输入（状态 + 动作）
            x = self._encode_state(state)

            # 编码输出（下一帧玩家状态）
            y = self._encode_player(next_state['player'])

            X_list.append(x)
            Y_list.append(y)

        X = np.array(X_list, dtype=np.float32)
        Y = np.array(Y_list, dtype=np.float32)

        print(f"✓ 预处理完成: X{X.shape}, Y{Y.shape}")

        return X, Y

    def _encode_state(self, state: Dict) -> np.ndarray:
        """
        编码完整状态（24维）

        结构: [player(6) + action(6) + environment(12)]
        """
        player = state['player']
        action = state['action']

        # 玩家状态 (6维)
        player_vec = self._encode_player(player)

        # 动作 (6维 One-Hot)
        action_vec = self._encode_action(action)

        # 环境 (12维, 暂时填0)
        env_vec = np.zeros(12, dtype=np.float32)

        return np.concatenate([player_vec, action_vec, env_vec])

    def _encode_player(self, player: Dict) -> np.ndarray:
        """编码玩家状态 (6维)"""
        return np.array([
            player['x'] / 800.0,         # 归一化位置
            player['y'] / 600.0,
            player['velocityX'] / 500.0, # 归一化速度
            player['velocityY'] / 500.0,
            1.0 if player['onGround'] else 0.0,
            1.0 if player['facingRight'] else 0.0,
        ], dtype=np.float32)

    def _encode_action(self, action: str) -> np.ndarray:
        """编码动作为One-Hot (6维)"""
        action_map = {
            'idle': 0, 'left': 1, 'right': 2,
            'jump': 3, 'left_jump': 4, 'right_jump': 5,
        }

        vec = np.zeros(6, dtype=np.float32)
        idx = action_map.get(action, 0)
        vec[idx] = 1.0

        return vec

    def split_data(
        self,
        X: np.ndarray,
        Y: np.ndarray,
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
    ) -> Tuple:
        """
        分割数据集

        Returns:
            (X_train, X_val, X_test, Y_train, Y_val, Y_test)
        """
        # 先分出测试集
        X_temp, X_test, Y_temp, Y_test = train_test_split(
            X, Y, test_size=(1 - train_ratio - val_ratio), random_state=42
        )

        # 再分出验证集
        val_size = val_ratio / (train_ratio + val_ratio)
        X_train, X_val, Y_train, Y_val = train_test_split(
            X_temp, Y_temp, test_size=val_size, random_state=42
        )

        print(f"✓ 数据分割:")
        print(f"  训练集: {X_train.shape[0]} ({train_ratio*100:.0f}%)")
        print(f"  验证集: {X_val.shape[0]} ({val_ratio*100:.0f}%)")
        print(f"  测试集: {X_test.shape[0]} ({(1-train_ratio-val_ratio)*100:.0f}%)")

        return X_train, X_val, X_test, Y_train, Y_val, Y_test
```

---

### 文件3: `train/model.py`（模型定义）

```python
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

class DynamicsModel:
    """
    动态预测模型
    """

    def __init__(self, input_dim: int = 24, output_dim: int = 6):
        """
        Args:
            input_dim: 输入维度（状态+动作）
            output_dim: 输出维度（玩家状态）
        """
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.model = None

    def build(self, hidden_units: list = [128, 128, 64]) -> keras.Model:
        """
        构建模型

        Args:
            hidden_units: 隐藏层神经元数量列表
        """
        inputs = layers.Input(shape=(self.input_dim,), name='input')

        x = inputs

        # 隐藏层
        for i, units in enumerate(hidden_units):
            x = layers.Dense(
                units,
                activation='relu',
                kernel_initializer='he_normal',
                name=f'hidden_{i+1}'
            )(x)

            # Dropout 防止过拟合
            x = layers.Dropout(0.2, name=f'dropout_{i+1}')(x)

        # 输出层
        outputs = layers.Dense(
            self.output_dim,
            activation='linear',
            name='output'
        )(x)

        self.model = keras.Model(inputs=inputs, outputs=outputs, name='DynamicsModel')

        return self.model

    def compile(
        self,
        learning_rate: float = 0.001,
        loss: str = 'mse',
        metrics: list = ['mae']
    ):
        """编译模型"""
        optimizer = keras.optimizers.Adam(learning_rate=learning_rate)

        self.model.compile(
            optimizer=optimizer,
            loss=loss,
            metrics=metrics
        )

        print("✓ 模型已编译")
        self.model.summary()

    def train(
        self,
        X_train, Y_train,
        X_val, Y_val,
        epochs: int = 50,
        batch_size: int = 32,
        callbacks: list = None
    ) -> keras.callbacks.History:
        """训练模型"""
        history = self.model.fit(
            X_train, Y_train,
            validation_data=(X_val, Y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks or [],
            verbose=1
        )

        return history

    def evaluate(self, X_test, Y_test) -> dict:
        """评估模型"""
        results = self.model.evaluate(X_test, Y_test, verbose=0)

        metrics_dict = {
            'loss': results[0],
            'mae': results[1] if len(results) > 1 else None,
        }

        print(f"\n✓ 测试集评估:")
        print(f"  Loss (MSE): {metrics_dict['loss']:.6f}")
        print(f"  MAE: {metrics_dict['mae']:.6f}")

        return metrics_dict

    def save(self, path: str = 'saved_model'):
        """保存模型"""
        self.model.save(path)
        print(f"✓ 模型已保存到: {path}")

    def load(self, path: str):
        """加载模型"""
        self.model = keras.models.load_model(path)
        print(f"✓ 模型已加载: {path}")
```

---

### 文件4: `train/train.py`（主训练脚本）

```python
#!/usr/bin/env python3
"""
主训练脚本
"""

import os
import argparse
from tensorflow import keras
from data_loader import GameDataLoader
from model import DynamicsModel
from utils import plot_training_history, visualize_predictions

def main():
    parser = argparse.ArgumentParser(description='训练动态预测模型')
    parser.add_argument('--data', type=str, required=True, help='训练数据JSON路径')
    parser.add_argument('--epochs', type=int, default=50, help='训练轮数')
    parser.add_argument('--batch-size', type=int, default=32, help='批次大小')
    parser.add_argument('--output', type=str, default='./saved_model', help='输出目录')

    args = parser.parse_args()

    print("="*50)
    print("🚀 开始训练动态预测模型")
    print("="*50)

    # 1. 加载数据
    print("\n[1/6] 加载数据...")
    loader = GameDataLoader(args.data)
    loader.load()

    # 2. 预处理
    print("\n[2/6] 预处理数据...")
    X, Y = loader.preprocess()
    X_train, X_val, X_test, Y_train, Y_val, Y_test = loader.split_data(X, Y)

    # 3. 构建模型
    print("\n[3/6] 构建模型...")
    model = DynamicsModel(input_dim=X.shape[1], output_dim=Y.shape[1])
    model.build(hidden_units=[128, 128, 64])
    model.compile(learning_rate=0.001)

    # 4. 设置回调
    callbacks = [
        # 早停：验证损失不再下降时停止
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        ),

        # 学习率衰减
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6
        ),

        # TensorBoard日志
        keras.callbacks.TensorBoard(
            log_dir='./logs',
            histogram_freq=1
        ),
    ]

    # 5. 训练
    print("\n[4/6] 开始训练...")
    history = model.train(
        X_train, Y_train,
        X_val, Y_val,
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks
    )

    # 6. 评估
    print("\n[5/6] 评估模型...")
    metrics = model.evaluate(X_test, Y_test)

    # 7. 保存
    print("\n[6/6] 保存模型...")
    os.makedirs(args.output, exist_ok=True)
    model.save(args.output)

    # 可视化
    plot_training_history(history, save_path=f'{args.output}/training_history.png')
    visualize_predictions(model.model, X_test[:100], Y_test[:100],
                         save_path=f'{args.output}/predictions.png')

    print("\n" + "="*50)
    print("✅ 训练完成！")
    print(f"📁 模型保存在: {args.output}")
    print("="*50)

if __name__ == '__main__':
    main()
```

**使用方法：**
```bash
python train/train.py \
  --data data/training_data.json \
  --epochs 100 \
  --batch-size 64 \
  --output ./models/dynamics_v1
```

---

### 文件5: `train/convert_to_tfjs.py`（转换为TF.js）

```python
#!/usr/bin/env python3
"""
将TensorFlow模型转换为TensorFlow.js格式
"""

import argparse
import tensorflowjs as tfjs

def convert_model(input_path: str, output_path: str):
    """
    转换模型

    Args:
        input_path: SavedModel路径
        output_path: TF.js输出路径
    """
    print(f"Converting {input_path} -> {output_path}")

    tfjs.converters.convert_tf_saved_model(
        input_path,
        output_path,
        quantization_dtype_map={'uint8': '*'},  # 量化压缩
    )

    print("✓ 转换完成！")
    print(f"模型文件: {output_path}/model.json")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='转换为TensorFlow.js格式')
    parser.add_argument('--input', type=str, required=True, help='SavedModel路径')
    parser.add_argument('--output', type=str, required=True, help='输出路径')

    args = parser.parse_args()
    convert_model(args.input, args.output)
```

**使用方法：**
```bash
python train/convert_to_tfjs.py \
  --input ./models/dynamics_v1 \
  --output ./public/models/dynamics-model
```

---

### 文件6: `train/utils.py`（工具函数）

```python
import matplotlib.pyplot as plt
import numpy as np

def plot_training_history(history, save_path: str = None):
    """绘制训练曲线"""
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    # 损失曲线
    axes[0].plot(history.history['loss'], label='Train Loss')
    axes[0].plot(history.history['val_loss'], label='Val Loss')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss (MSE)')
    axes[0].set_title('Training & Validation Loss')
    axes[0].legend()
    axes[0].grid(True)

    # MAE曲线
    axes[1].plot(history.history['mae'], label='Train MAE')
    axes[1].plot(history.history['val_mae'], label='Val MAE')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('MAE')
    axes[1].set_title('Mean Absolute Error')
    axes[1].legend()
    axes[1].grid(True)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"✓ 训练曲线已保存: {save_path}")

    plt.show()

def visualize_predictions(model, X_test, Y_test, save_path: str = None):
    """可视化预测结果"""
    predictions = model.predict(X_test)

    fig, axes = plt.subplots(2, 3, figsize=(15, 8))
    labels = ['X', 'Y', 'VelocityX', 'VelocityY', 'OnGround', 'FacingRight']

    for i, ax in enumerate(axes.flat):
        if i >= Y_test.shape[1]:
            break

        ax.scatter(Y_test[:, i], predictions[:, i], alpha=0.5, s=10)
        ax.plot([Y_test[:, i].min(), Y_test[:, i].max()],
                [Y_test[:, i].min(), Y_test[:, i].max()],
                'r--', lw=2)
        ax.set_xlabel(f'True {labels[i]}')
        ax.set_ylabel(f'Predicted {labels[i]}')
        ax.set_title(labels[i])
        ax.grid(True)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"✓ 预测可视化已保存: {save_path}")

    plt.show()
```

---

## 🚀 完整训练流程

```bash
# 1. 安装依赖
cd train
pip install -r requirements.txt

# 2. 训练模型
python train.py \
  --data ../data/training_data.json \
  --epochs 100 \
  --batch-size 64 \
  --output ../models/dynamics_v1

# 3. 转换为TF.js
python convert_to_tfjs.py \
  --input ../models/dynamics_v1 \
  --output ../public/models/dynamics-model

# 4. 验证模型文件
ls ../public/models/dynamics-model/
# 应该看到: model.json, group1-shard1of1.bin
```

---

## ✅ 验收标准

完成Module 5后，应该能做到：
- [x] 成功训练模型（loss < 0.01）
- [x] 生成训练曲线图
- [x] 转换为TF.js格式
- [x] 模型文件可以在浏览器加载

---

## 🐛 常见问题

### Q1: 训练很慢？
**A:** 使用GPU：
```bash
# 检查GPU
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"

# 安装GPU版本
pip install tensorflow-gpu==2.15.0
```

### Q2: 内存不足？
**A:** 减小批次大小：
```bash
python train.py --batch-size 16
```

### Q3: 转换后模型太大？
**A:** 使用量化压缩（已包含在转换脚本中）

---

## 🎯 下一步

完成Module 5后，继续学习：
- `06-Module6-预测可视化.md` - 如何在游戏中展示AI预测
