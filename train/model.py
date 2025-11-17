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
