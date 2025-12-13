import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { admin } from '../utils/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Cpu,
  Server,
  PieChart,
  BarChart3,
  Calculator,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const AdminFinance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await admin.getFinanceAnalytics();
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load finance analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  const { summary, cost_breakdown, per_user_costs, daily_trend, usage_distribution, pricing_recommendations, break_even, api_pricing } = data;

  // Find max value for chart scaling
  const maxCost = Math.max(...daily_trend.map(d => d.api_cost), 0.001);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Analytics</h1>
            <p className="text-gray-500 mt-1">Cost analysis and pricing recommendations</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total API Cost</p>
                <p className="text-2xl font-bold text-gray-900">${summary.total_api_cost.toFixed(4)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{summary.total_api_calls} API calls</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Server Cost</p>
                <p className="text-2xl font-bold text-gray-900">${summary.server_monthly_cost}/mo</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Fixed monthly cost</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Projection</p>
                <p className="text-2xl font-bold text-gray-900">${summary.total_monthly_projection.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">API + Server costs</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cost per Call</p>
                <p className="text-2xl font-bold text-gray-900">${summary.avg_cost_per_call.toFixed(6)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">~{summary.avg_tokens_per_call} tokens/call</p>
          </div>
        </div>

        {/* Cost Breakdown & API Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Token Cost Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Input Tokens</span>
                <span className="font-mono text-gray-900">{cost_breakdown.input_tokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Output Tokens</span>
                <span className="font-mono text-gray-900">{cost_breakdown.output_tokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cached Tokens</span>
                <span className="font-mono text-green-600">{cost_breakdown.cached_tokens.toLocaleString()}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Input Cost</span>
                <span className="font-mono text-gray-900">${cost_breakdown.input_cost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Output Cost</span>
                <span className="font-mono text-gray-900">${cost_breakdown.output_cost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span>Cache Savings</span>
                <span className="font-mono">${cost_breakdown.cache_savings.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* API Pricing Info */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              DeepSeek API Pricing
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Provider: <span className="font-medium text-gray-900">{api_pricing.provider}</span></p>
                <p className="text-sm text-gray-500">Model: <span className="font-medium text-gray-900">{api_pricing.model}</span></p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Input (cache miss)</span>
                  <span className="font-mono text-gray-900">${api_pricing.input_per_million}/1M tokens</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Input (cache hit)</span>
                  <span className="font-mono text-green-600">${api_pricing.input_cached_per_million}/1M tokens</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Output</span>
                  <span className="font-mono text-gray-900">${api_pricing.output_per_million}/1M tokens</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <strong>Tip:</strong> DeepSeek's cache saves up to 87% on repeated prompts!
              </div>
            </div>
          </div>
        </div>

        {/* Daily Cost Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Daily API Cost (Last 30 Days)
          </h3>
          <div className="h-48 flex items-end gap-1">
            {daily_trend.map((day, idx) => (
              <div
                key={idx}
                className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t transition-all cursor-pointer group relative"
                style={{ height: `${Math.max((day.api_cost / maxCost) * 100, 2)}%` }}
                title={`${day.date}: $${day.api_cost.toFixed(4)} (${day.calls} calls)`}
              >
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {day.date}<br/>${day.api_cost.toFixed(4)}<br/>{day.calls} calls
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{daily_trend[0]?.date}</span>
            <span>{daily_trend[daily_trend.length - 1]?.date}</span>
          </div>
        </div>

        {/* Per User Costs */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Cost Per User Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{per_user_costs.total_users}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{per_user_costs.active_users}</p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">${per_user_costs.avg_cost_per_user.toFixed(4)}</p>
              <p className="text-sm text-gray-500">Avg Cost/User</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">${per_user_costs.avg_cost_per_active_user.toFixed(4)}</p>
              <p className="text-sm text-gray-500">Avg Cost/Active User</p>
            </div>
          </div>

          {per_user_costs.top_cost_users.length > 0 && (
            <>
              <h4 className="font-medium text-gray-700 mb-3">Top Users by Cost</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">User</th>
                      <th className="pb-2">Company</th>
                      <th className="pb-2 text-right">Calls</th>
                      <th className="pb-2 text-right">Tokens</th>
                      <th className="pb-2 text-right">Total Cost</th>
                      <th className="pb-2 text-right">Avg/Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {per_user_costs.top_cost_users.map((user, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 font-medium">{user.email}</td>
                        <td className="py-2 text-gray-600">{user.company}</td>
                        <td className="py-2 text-right">{user.call_count}</td>
                        <td className="py-2 text-right">{user.total_tokens.toLocaleString()}</td>
                        <td className="py-2 text-right font-mono">${user.total_cost.toFixed(4)}</td>
                        <td className="py-2 text-right font-mono text-gray-500">${user.avg_cost_per_call.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Usage Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            User Usage Distribution (Last 30 Days)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{usage_distribution.light}</p>
              <p className="text-sm text-gray-600 mt-1">Light</p>
              <p className="text-xs text-gray-400">&lt;100 msgs/mo</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{usage_distribution.moderate}</p>
              <p className="text-sm text-gray-600 mt-1">Moderate</p>
              <p className="text-xs text-gray-400">100-500 msgs/mo</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{usage_distribution.heavy}</p>
              <p className="text-sm text-gray-600 mt-1">Heavy</p>
              <p className="text-xs text-gray-400">500-2000 msgs/mo</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">{usage_distribution.enterprise}</p>
              <p className="text-sm text-gray-600 mt-1">Enterprise</p>
              <p className="text-xs text-gray-400">&gt;2000 msgs/mo</p>
            </div>
          </div>
        </div>

        {/* Pricing Recommendations */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Recommended Pricing Tiers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(pricing_recommendations).map(([key, tier]) => (
              <div key={key} className={`rounded-xl p-5 border-2 ${
                key === 'pro_tier' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}>
                {key === 'pro_tier' && (
                  <span className="text-xs font-bold text-blue-600 uppercase">Recommended</span>
                )}
                <h4 className="text-lg font-bold text-gray-900 mt-1">{tier.name}</h4>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${tier.recommended_price}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{tier.limits.chatbots} chatbot{tier.limits.chatbots !== 1 && tier.limits.chatbots !== 'Unlimited' ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{tier.limits.documents_per_bot} docs/bot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{tier.limits.messages_per_day} msgs/day</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  <p>Est. cost: ${tier.estimated_cost_per_user}/user</p>
                  <p>Margin: {tier.margin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Break-even Analysis */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Break-even Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Users Needed to Cover Server Cost (${break_even.server_cost}/mo)</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">Starter @ $9/mo</span>
                  <span className="font-bold text-gray-900">{break_even.users_needed.starter_at_9} users</span>
                </div>
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                  <span className="text-gray-600">Pro @ $29/mo</span>
                  <span className="font-bold text-blue-600">{break_even.users_needed.pro_at_29} user</span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">Enterprise @ $99/mo</span>
                  <span className="font-bold text-gray-900">{break_even.users_needed.enterprise_at_99} user</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Revenue Projections</h4>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-5">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Costs</span>
                    <span className="font-bold text-red-600">-${summary.total_monthly_projection.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Projected Revenue (10% conv.)</span>
                    <span className="font-bold text-green-600">+${break_even.projected_revenue.toFixed(2)}</span>
                  </div>
                  <hr className="border-gray-300" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Net Profit/Loss</span>
                    <span className={`font-bold text-xl ${break_even.profit_projection >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {break_even.profit_projection >= 0 ? '+' : ''}${break_even.profit_projection.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {break_even.profit_projection < 0 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Increase paid conversions or reduce costs to reach profitability</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Key Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-medium mb-2">Cost Efficiency</h4>
              <ul className="text-sm space-y-1 text-blue-100">
                <li>* Average cost per message: ~${(summary.avg_cost_per_call).toFixed(4)}</li>
                <li>* DeepSeek is 30x cheaper than GPT-4</li>
                <li>* Enable caching to save up to 87% on input costs</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-medium mb-2">Pricing Strategy</h4>
              <ul className="text-sm space-y-1 text-blue-100">
                <li>* Free tier as loss leader for acquisition</li>
                <li>* Focus on converting to Pro tier ($29/mo)</li>
                <li>* Just {break_even.users_needed.pro_at_29} Pro user covers server costs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminFinance;
