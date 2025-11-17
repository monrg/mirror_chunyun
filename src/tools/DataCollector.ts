import { GameState, PlayerAction } from '@/game/types';
import { AIPlayer, GameContext } from './AIPlayer';

/**
 * 训练数据样本
 */
export interface TrainingSample {
  state: GameState;
  nextState: GameState;
}

/**
 * 数据收集器
 * 运行多局游戏，收集状态转换数据
 */
export class DataCollector {
  private samples: TrainingSample[] = [];
  private currentEpisode: GameState[] = [];
  private episodeCount: number = 0;

  private aiPlayer: AIPlayer;
  private isCollecting: boolean = false;

  constructor(aiStrategy: 'random' | 'heuristic' | 'mixed' = 'mixed') {
    this.aiPlayer = new AIPlayer(aiStrategy);
  }

  /**
   * 开始收集数据
   */
  startCollection(): void {
    this.isCollecting = true;
    this.samples = [];
    this.episodeCount = 0;
    console.log('📊 开始数据收集...');
  }

  /**
   * 停止收集
   */
  stopCollection(): void {
    this.isCollecting = false;
    console.log(`✓ 收集完成: ${this.samples.length} 个样本`);
  }

  /**
   * 记录一帧数据
   */
  recordFrame(state: GameState): void {
    if (!this.isCollecting) return;

    this.currentEpisode.push(state);
  }

  /**
   * 一局游戏结束
   */
  endEpisode(): void {
    if (!this.isCollecting || this.currentEpisode.length < 2) {
      this.currentEpisode = [];
      return;
    }

    // 转换为训练样本
    for (let i = 0; i < this.currentEpisode.length - 1; i++) {
      this.samples.push({
        state: this.currentEpisode[i],
        nextState: this.currentEpisode[i + 1],
      });
    }

    this.episodeCount++;
    console.log(
      `Episode ${this.episodeCount} 完成: ${this.currentEpisode.length} 帧`
    );

    this.currentEpisode = [];
  }

  /**
   * 获取AI动作（供游戏调用）
   */
  getAIAction(player: any, context: GameContext): PlayerAction {
    const action = this.aiPlayer.getAction(player, context);
    this.aiPlayer.recordAction(action);
    return action;
  }

  /**
   * 导出数据
   */
  exportData(): string {
    const data = {
      metadata: {
        collectedAt: new Date().toISOString(),
        totalSamples: this.samples.length,
        episodes: this.episodeCount,
        averageEpisodeLength: this.episodeCount > 0
          ? Math.floor(this.samples.length / this.episodeCount)
          : 0,
      },
      samples: this.samples,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 下载为文件
   */
  downloadData(filename?: string): void {
    const data = this.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `training_data_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('✓ 数据已下载:', a.download);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalSamples: this.samples.length,
      episodes: this.episodeCount,
      currentEpisodeFrames: this.currentEpisode.length,
      isCollecting: this.isCollecting,
    };
  }
}
