import { Note } from '../../types';
import { Calendar, FileText } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
  // 提取笔记预览（前150个字符）
  const preview = note.content.substring(0, 150).replace(/[#*\n]/g, ' ').trim() + '...';

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 cursor-pointer border border-gray-100 hover:border-primary/30"
    >
      <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(note.date)}</span>
        </div>
        {note.hasAnalysis && (
          <div className="flex items-center gap-1 text-insights">
            <FileText className="w-4 h-4" />
            <span>有洞察</span>
          </div>
        )}
      </div>

      <p className="text-gray-700 leading-relaxed line-clamp-3">
        {preview}
      </p>

      <div className="mt-4 text-sm text-primary font-medium">
        查看详情 →
      </div>
    </div>
  );
}
