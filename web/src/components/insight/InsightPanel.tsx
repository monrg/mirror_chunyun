import { Analysis } from '../../types';
import { Heart, Lightbulb, Sparkles, MessageCircle } from 'lucide-react';

interface InsightPanelProps {
  analysis: Analysis;
}

export default function InsightPanel({ analysis }: InsightPanelProps) {
  return (
    <div className="space-y-6">
      {/* 需求分析 */}
      <section className="bg-white rounded-lg p-6 shadow-sm border border-needs/20">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-needs" />
          <h3 className="text-lg font-semibold text-needs">你真正需要的</h3>
        </div>

        {analysis.needs.explicit_needs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">显性需求</h4>
            <ul className="space-y-1">
              {analysis.needs.explicit_needs.map((need, idx) => (
                <li key={idx} className="text-gray-600 pl-4 border-l-2 border-needs/30">
                  {need}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.needs.implicit_needs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">隐性需求</h4>
            <ul className="space-y-1">
              {analysis.needs.implicit_needs.map((need, idx) => (
                <li key={idx} className="text-gray-600 pl-4 border-l-2 border-needs/50">
                  {need}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.needs.tensions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">内在张力</h4>
            <ul className="space-y-1">
              {analysis.needs.tensions.map((tension, idx) => (
                <li key={idx} className="text-gray-600 pl-4 border-l-2 border-orange-300">
                  {tension}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 闪光的思想 */}
      <section className="bg-white rounded-lg p-6 shadow-sm border border-insights/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-insights" />
          <h3 className="text-lg font-semibold text-insights">闪光的思想</h3>
        </div>

        {analysis.shining_thoughts.insights.length > 0 && (
          <div className="space-y-4 mb-4">
            {analysis.shining_thoughts.insights.map((insight, idx) => (
              <div key={idx} className="bg-orange-50 rounded-lg p-4">
                <p className="font-medium text-gray-800 mb-2">{insight.summary}</p>
                <p className="text-sm text-gray-600 mb-2">{insight.why_it_matters}</p>
                {insight.related_quote && (
                  <blockquote className="text-sm italic text-gray-500 border-l-2 border-insights pl-3 mt-2">
                    "{insight.related_quote}"
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        )}

        {analysis.shining_thoughts.good_questions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              有价值的问题
            </h4>
            <div className="space-y-2">
              {analysis.shining_thoughts.good_questions.map((q, idx) => (
                <div key={idx} className="bg-yellow-50 rounded p-3">
                  <p className="font-medium text-gray-800">{q.question}</p>
                  <p className="text-sm text-gray-600 mt-1">{q.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.shining_thoughts.strengths_visible.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">看到的品质</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.shining_thoughts.strengths_visible.map((strength, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-strengths/10 text-strengths rounded-full text-sm"
                >
                  {strength}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 温柔的反思 */}
      <section className="bg-white rounded-lg p-6 shadow-sm border border-reflection/20">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-reflection" />
          <h3 className="text-lg font-semibold text-reflection">温柔的反思</h3>
        </div>

        <div className="bg-teal-50 rounded-lg p-4 mb-3">
          <p className="text-gray-700 leading-relaxed">
            {analysis.gentle_reflection.summary_in_friend_tone}
          </p>
        </div>

        {analysis.gentle_reflection.soft_reminder && (
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-reflection">
            <p className="text-sm text-gray-600">
              {analysis.gentle_reflection.soft_reminder}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
