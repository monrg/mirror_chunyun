// 笔记数据模型
export interface Note {
  id: string;                    // 唯一标识
  date: string;                  // 日期 (YYYY-MM-DD)
  year: number;
  month: number;
  content: string;               // 原始Markdown内容
  filePath: string;              // 文件路径
  hasAnalysis: boolean;          // 是否有分析
}

// 洞察分析数据模型
export interface Analysis {
  noteId: string;                // 关联的笔记ID
  needs: {
    explicit_needs: string[];
    implicit_needs: string[];
    tensions: string[];
    evidence_quotes: string[];
  };
  shining_thoughts: {
    insights: Insight[];
    good_questions: GoodQuestion[];
    strengths_visible: string[];
  };
  gentle_reflection: {
    summary_in_friend_tone: string;
    soft_reminder: string;
  };
}

export interface Insight {
  summary: string;
  why_it_matters: string;
  related_quote: string;
}

export interface GoodQuestion {
  question: string;
  comment: string;
}

// 年度总结模型
export interface YearSummary {
  year: number;
  theme: string;                 // 年度主题
  mainChanges: string[];         // 主要变化
  breakthroughs: string[];       // 突破点
  patterns: string[];            // 模式和规律
  noteCount: number;             // 笔记数量
}

// 成长统计模型
export interface GrowthStats {
  totalNotes: number;
  yearRange: [number, number];
  keywordFrequency: Record<string, number>;
  emotionTrends: Array<{
    date: string;
    sentiment: number;          // 情感倾向值
  }>;
}

// 笔记和分析的组合类型
export interface NoteWithAnalysis {
  note: Note;
  analysis: Analysis | null;
}
