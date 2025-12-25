import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

const AuditResults = ({ result }) => {
  const [expandedCategories, setExpandedCategories] = useState(['meta', 'technical']);

  if (!result) return null;

  const { overall_score, summary, items } = result;

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      meta: 'Meta Tags',
      technical: 'Technical SEO',
      content: 'Content',
      performance: 'Performance',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const getCategoryStats = (categoryItems) => {
    return {
      pass: categoryItems.filter((i) => i.status === 'pass').length,
      warning: categoryItems.filter((i) => i.status === 'warning').length,
      fail: categoryItems.filter((i) => i.status === 'fail').length,
    };
  };

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreColor(
            overall_score
          )}`}
        >
          <div className="text-center">
            <span className="text-3xl font-bold">{overall_score}</span>
            <span className="text-xs block opacity-75">/100</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {overall_score >= 80
              ? 'Great SEO Health!'
              : overall_score >= 60
              ? 'Good, but room for improvement'
              : 'Needs attention'}
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{summary?.pass || 0}</span> passed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{summary?.warning || 0}</span> warnings
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{summary?.fail || 0}</span> failed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const isExpanded = expandedCategories.includes(category);
          const stats = getCategoryStats(categoryItems);

          return (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{getCategoryLabel(category)}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {stats.pass > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" /> {stats.pass}
                      </span>
                    )}
                    {stats.warning > 0 && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertTriangle className="w-3 h-3" /> {stats.warning}
                      </span>
                    )}
                    {stats.fail > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3 h-3" /> {stats.fail}
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 ${getStatusBg(item.status)} border-l-4 ${
                        item.status === 'pass'
                          ? 'border-l-green-500'
                          : item.status === 'warning'
                          ? 'border-l-yellow-500'
                          : 'border-l-red-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.check_name}</span>
                            {item.page_id && (
                              <span className="text-xs text-gray-400">({item.page_id})</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                          {item.recommendation && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded p-2">
                              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{item.recommendation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timestamp */}
      <p className="text-xs text-gray-400 text-center">
        Audit run on {new Date(result.audit_date).toLocaleString()}
      </p>
    </div>
  );
};

export default AuditResults;
