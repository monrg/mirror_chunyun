#!/usr/bin/env python3
"""
主训练脚本
"""

import os
import argparse
from tensorflow import keras
from data_loader import GameDataLoader
from model import DynamicsModel
from utils import plot_training_history, visualize_predictions, print_data_statistics

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

    # 打印数据统计
    print_data_statistics(X_train, Y_train)

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

        # 模型检查点
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(args.output, 'checkpoint.h5'),
            monitor='val_loss',
            save_best_only=True
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
    print("\n生成可视化图表...")
    plot_training_history(history, save_path=f'{args.output}/training_history.png')
    visualize_predictions(model.model, X_test[:100], Y_test[:100],
                         save_path=f'{args.output}/predictions.png')

    print("\n" + "="*50)
    print("✅ 训练完成！")
    print(f"📁 模型保存在: {args.output}")
    print(f"📊 Loss (MSE): {metrics['loss']:.6f}")
    print(f"📊 MAE: {metrics['mae']:.6f}")
    print("="*50)

if __name__ == '__main__':
    main()
