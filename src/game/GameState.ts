import { GameState, PlayerAction } from './types';

/**
 * 游戏状态管理器
 * 记录每一帧的游戏状态，用于后续AI训练
 */
export class GameStateRecorder {
  private states: GameState[] = [];
  private frameCount: number = 0;
  private startTime: number = Date.now();

  /**
   * 记录当前帧状态
   */
  recordState(playerState: any, action: PlayerAction): void {
    const state: GameState = {
      timestamp: Date.now() - this.startTime,
      player: playerState,
      action: action,
      frame: this.frameCount++,
    };

    this.states.push(state);

    // 限制内存：只保留最近3000帧（约50秒）
    if (this.states.length > 3000) {
      this.states.shift();
    }
  }

  /**
   * 导出所有状态（JSON格式）
   */
  exportStates(): string {
    return JSON.stringify(this.states, null, 2);
  }

  /**
   * 下载为文件
   */
  downloadAsFile(): void {
    const data = this.exportStates();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `game_states_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * 获取状态总数
   */
  getStateCount(): number {
    return this.states.length;
  }

  /**
   * 清空记录
   */
  clear(): void {
    this.states = [];
    this.frameCount = 0;
    this.startTime = Date.now();
  }
}
