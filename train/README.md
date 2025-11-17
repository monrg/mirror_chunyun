# 模型训练脚本

## 📦 安装依赖

```bash
cd train

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

## 🚀 使用方法

### 1. 准备训练数据

从游戏中收集数据（按D键下载），将JSON文件放到 `../data/` 目录。

### 2. 训练模型

```bash
python train.py --data ../data/training_data.json --epochs 100 --batch-size 64 --output ./saved_model
```

**参数说明：**
- `--data`: 训练数据JSON路径（必需）
- `--epochs`: 训练轮数（默认50）
- `--batch-size`: 批次大小（默认32）
- `--output`: 输出目录（默认./saved_model）

**输出文件：**
- `saved_model/`: TensorFlow SavedModel格式
- `saved_model/checkpoint.h5`: 最佳模型检查点
- `saved_model/training_history.png`: 训练曲线图
- `saved_model/predictions.png`: 预测可视化图

### 3. 转换为浏览器格式

```bash
python convert_to_tfjs.py --input ./saved_model --output ../public/models/dynamics-model
```

**参数说明：**
- `--input`: SavedModel路径
- `--output`: TensorFlow.js输出路径

**输出文件：**
- `model.json`: 模型架构
- `group1-shard*.bin`: 模型权重

## 📊 示例完整流程

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 训练模型
python train.py \
  --data ../data/training_data.json \
  --epochs 100 \
  --batch-size 64 \
  --output ./models/dynamics_v1

# 3. 转换为TF.js
python convert_to_tfjs.py \
  --input ./models/dynamics_v1 \
  --output ../public/models/dynamics-model

# 4. 验证文件
ls ../public/models/dynamics-model/
# 应该看到: model.json, group1-shard1of1.bin
```

## 🔍 训练输出解释

### 训练过程

```
Epoch 1/100
loss=0.0234 - val_loss=0.0189 - mae=0.0456 - val_mae=0.0398
Epoch 2/100
loss=0.0178 - val_loss=0.0156 - mae=0.0389 - val_mae=0.0345
...
```

**指标说明：**
- `loss`: 训练集均方误差（越小越好）
- `val_loss`: 验证集均方误差（主要关注指标）
- `mae`: 平均绝对误差
- `val_mae`: 验证集平均绝对误差

### 最终评估

```
✓ 测试集评估:
  Loss (MSE): 0.012345
  MAE: 0.034567
```

**质量标准：**
- ✅ Excellent: MSE < 0.01, MAE < 0.03
- ✅ Good: MSE < 0.02, MAE < 0.05
- ⚠️ Acceptable: MSE < 0.05, MAE < 0.08
- ❌ Poor: MSE > 0.05

## 🐛 常见问题

### Q1: ImportError: No module named 'tensorflow'
**A:** 确保已安装依赖：`pip install -r requirements.txt`

### Q2: 训练很慢
**A:**
- 减小batch_size：`--batch-size 16`
- 减少epochs：`--epochs 30`
- 使用GPU版本：`pip install tensorflow-gpu`

### Q3: 转换后模型太大
**A:** 已经启用了量化压缩，如需进一步压缩可以：
- 减少隐藏层神经元数量（修改model.py）
- 使用更激进的量化策略

### Q4: 训练loss不下降
**A:**
- 检查数据质量（是否有足够多样的样本）
- 增加学习率：修改model.py中的`learning_rate=0.01`
- 增加模型容量：`hidden_units=[256, 256, 128]`

## 📁 文件说明

```
train/
├─ requirements.txt      # Python依赖
├─ data_loader.py       # 数据加载器
├─ model.py             # 模型定义
├─ train.py             # 主训练脚本
├─ convert_to_tfjs.py   # 模型转换脚本
├─ utils.py             # 工具函数
└─ README.md            # 本文档
```
