import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../types';
import { loadAllNotes, getStats } from '../services/dataLoader';
import NoteCard from '../components/note/NoteCard';
import { BookOpen, Sparkles, Calendar } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [notesData, statsData] = await Promise.all([
          loadAllNotes(),
          getStats()
        ]);
        setNotes(notesData.slice(0, 10)); // 只显示最新的10篇
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">内在观察者</h1>
          <p className="text-gray-600">温柔地回顾，深刻地洞察</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-primary">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalNotes}</p>
                  <p className="text-sm text-gray-600">篇笔记</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-insights">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-insights" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalNotes}</p>
                  <p className="text-sm text-gray-600">份洞察</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-reflection">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-reflection" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.yearRange[1] - stats.yearRange[0] + 1}
                  </p>
                  <p className="text-sm text-gray-600">年历程</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Notes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">最近的笔记</h2>
            <button
              onClick={() => navigate('/timeline')}
              className="text-primary hover:text-primary/80 font-medium"
            >
              查看全部 →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => navigate(`/note/${note.id}`)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
