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

def print_data_statistics(X, Y):
    """打印数据统计信息"""
    print("\n" + "="*50)
    print("数据统计信息")
    print("="*50)

    print(f"\n输入特征 (X):")
    print(f"  形状: {X.shape}")
    print(f"  最小值: {X.min():.4f}")
    print(f"  最大值: {X.max():.4f}")
    print(f"  均值: {X.mean():.4f}")
    print(f"  标准差: {X.std():.4f}")

    print(f"\n输出标签 (Y):")
    print(f"  形状: {Y.shape}")
    print(f"  最小值: {Y.min():.4f}")
    print(f"  最大值: {Y.max():.4f}")
    print(f"  均值: {Y.mean():.4f}")
    print(f"  标准差: {Y.std():.4f}")

    print("\n" + "="*50)
