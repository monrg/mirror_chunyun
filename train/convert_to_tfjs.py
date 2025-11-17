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
