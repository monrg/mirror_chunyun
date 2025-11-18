import type { Note, Analysis, NoteWithAnalysis } from '../types';

// 使用Vite的glob导入功能动态加载所有文件
// 从当前文件(web/src/services/dataLoader.ts)向上两级到项目根目录
const noteFiles = import.meta.glob('../../note/emotion_monthly_md/*.md', {
  query: '?raw',
  import: 'default'
});

const analysisFiles = import.meta.glob('../../统计/内在观察者分析_*.json');

// 从文件路径中提取日期信息
function extractDateFromPath(path: string): { year: number; month: number; date: string } | null {
  // 匹配格式: emotion_entries_YYYY-MM.md 或 YYYY-MM-DD.md
  const match = path.match(/(\d{4})-(\d{2})(?:-(\d{2}))?\.md/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = match[3] ? parseInt(match[3], 10) : 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, date };
  }
  return null;
}

// 从文件路径生成ID
function generateNoteId(filePath: string): string {
  const dateInfo = extractDateFromPath(filePath);
  if (dateInfo) {
    return dateInfo.date;
  }
  // 如果无法提取日期，使用文件名作为ID
  return filePath.split('/').pop()?.replace('.md', '') || 'unknown';
}

// 加载所有笔记
export async function loadAllNotes(): Promise<Note[]> {
  console.log('📚 [dataLoader] 开始加载笔记文件...');
  console.log('📁 [dataLoader] 找到的笔记文件数量:', Object.keys(noteFiles).length);
  console.log('📁 [dataLoader] 笔记文件路径:', Object.keys(noteFiles));

  const notes: Note[] = [];

  for (const [path, loader] of Object.entries(noteFiles)) {
    try {
      console.log(`⏳ [dataLoader] 正在加载: ${path}`);
      const content = await loader() as string;
      console.log(`✓ [dataLoader] 加载成功，内容长度: ${content?.length || 0} 字符`);

      const dateInfo = extractDateFromPath(path);
      console.log(`📅 [dataLoader] 提取日期信息:`, dateInfo);

      if (dateInfo) {
        const noteId = generateNoteId(path);
        notes.push({
          id: noteId,
          date: dateInfo.date,
          year: dateInfo.year,
          month: dateInfo.month,
          content,
          filePath: path,
          hasAnalysis: true, // 暂时假设都有分析
        });
        console.log(`✅ [dataLoader] 添加笔记: ${noteId}`);
      } else {
        console.warn(`⚠️ [dataLoader] 无法从路径提取日期: ${path}`);
      }
    } catch (error) {
      console.error(`❌ [dataLoader] 加载失败 ${path}:`, error);
    }
  }

  // 按日期倒序排序（最新的在前）
  console.log(`🎉 [dataLoader] 成功加载 ${notes.length} 篇笔记`);
  return notes.sort((a, b) => b.date.localeCompare(a.date));
}

// 加载单个笔记
export async function loadNote(noteId: string): Promise<Note | null> {
  const notes = await loadAllNotes();
  return notes.find(note => note.id === noteId) || null;
}

// 加载单个分析
export async function loadAnalysis(noteId: string): Promise<Analysis | null> {
  // 从noteId推断分析文件路径
  // noteId格式: YYYY-MM-DD 或 YYYY-MM
  const yearMonth = noteId.substring(0, 7); // 取YYYY-MM部分
  const analysisPath = `../../统计/内在观察者分析_${yearMonth}.json`;

  try {
    const loader = analysisFiles[analysisPath];
    if (loader) {
      const data = await loader() as { default: Analysis };
      return {
        ...data.default,
        noteId,
      };
    }
  } catch (error) {
    console.error(`Failed to load analysis for ${noteId}:`, error);
  }

  return null;
}

// 加载笔记和对应的分析
export async function loadNoteWithAnalysis(noteId: string): Promise<NoteWithAnalysis | null> {
  const note = await loadNote(noteId);
  if (!note) return null;

  const analysis = await loadAnalysis(noteId);

  return {
    note,
    analysis,
  };
}

// 加载所有笔记和分析
export async function loadAllNotesWithAnalysis(): Promise<NoteWithAnalysis[]> {
  const notes = await loadAllNotes();

  const notesWithAnalysis = await Promise.all(
    notes.map(async (note) => {
      const analysis = await loadAnalysis(note.id);
      return {
        note,
        analysis,
      };
    })
  );

  return notesWithAnalysis;
}

// 按年份分组笔记
export async function loadNotesByYear(): Promise<Record<number, Note[]>> {
  const notes = await loadAllNotes();

  const notesByYear: Record<number, Note[]> = {};
  notes.forEach(note => {
    if (!notesByYear[note.year]) {
      notesByYear[note.year] = [];
    }
    notesByYear[note.year].push(note);
  });

  return notesByYear;
}

// 获取统计信息
export async function getStats() {
  const notes = await loadAllNotes();

  const years = notes.map(n => n.year);
  const yearRange: [number, number] = [
    Math.min(...years),
    Math.max(...years),
  ];

  return {
    totalNotes: notes.length,
    yearRange,
    years: Array.from(new Set(years)).sort((a, b) => b - a),
  };
}
