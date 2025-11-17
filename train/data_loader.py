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
