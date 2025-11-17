/**
 * 游戏状态快照
 * 每一帧都会记录这些数据，用于后续AI训练
 */
export interface GameState {
  timestamp: number;        // 时间戳（毫秒）
  player: {
    x: number;              // 玩家X坐标（像素）
    y: number;              // 玩家Y坐标（像素）
    velocityX: number;      // 水平速度（像素/秒）
    velocityY: number;      // 垂直速度（像素/秒）
    onGround: boolean;      // 是否在地面上
    facingRight: boolean;   // 是否面朝右边
  };
  action: PlayerAction;     // 当前帧的动作
  frame: number;            // 帧编号
}

/**
 * 玩家动作枚举
 */
export enum PlayerAction {
  IDLE = 'idle',           // 站立不动
  MOVE_LEFT = 'left',      // 向左移动
  MOVE_RIGHT = 'right',    // 向右移动
  JUMP = 'jump',           // 跳跃
  MOVE_LEFT_JUMP = 'left_jump',   // 左跳
  MOVE_RIGHT_JUMP = 'right_jump', // 右跳
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  x: number;              // 平台中心X坐标
  y: number;              // 平台中心Y坐标
  width: number;          // 平台宽度
  height: number;         // 平台高度
}

/**
 * 关卡配置
 */
export interface LevelConfig {
  platforms: PlatformConfig[];  // 平台数组
  playerStart: {                // 玩家起始位置
    x: number;
    y: number;
  };
  goal: {                       // 目标点位置
    x: number;
    y: number;
  };
}
