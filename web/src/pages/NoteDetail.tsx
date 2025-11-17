import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NoteWithAnalysis } from '../types';
import { loadNoteWithAnalysis } from '../services/dataLoader';
import InsightPanel from '../components/insight/InsightPanel';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function NoteDetail() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NoteWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!noteId) return;

      try {
        const result = await loadNoteWithAnalysis(noteId);
        setData(result);
      } catch (error) {
        console.error('Failed to load note:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [noteId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">未找到笔记</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const { note, analysis } = data;

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：原始笔记 */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-center gap-2 text-gray-600 mb-6">
                <Calendar className="w-5 h-5" />
                <span className="text-lg">{formatDate(note.date)}</span>
              </div>

              <article className="prose prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content}
                </ReactMarkdown>
              </article>
            </div>
          </div>

          {/* 右侧：洞察分析 */}
          <div>
            {analysis ? (
              <div className="sticky top-24">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  🔍 内在观察者的洞察
                </h2>
                <InsightPanel analysis={analysis} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                <p>暂无分析</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
