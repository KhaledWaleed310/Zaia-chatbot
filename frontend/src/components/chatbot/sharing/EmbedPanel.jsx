import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Code, Check, Loader2 } from 'lucide-react';
import { chatbots } from '@/utils/api';

const EmbedPanel = () => {
  const { bot } = useOutletContext();

  const [embedCode, setEmbedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEmbedCode();
  }, [bot?.id]);

  const loadEmbedCode = async () => {
    if (!bot?.id) return;
    try {
      const response = await chatbots.getEmbed(bot.id);
      setEmbedCode(response.data);
    } catch (error) {
      console.error('Failed to load embed code:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode?.full_snippet || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Embed Code</h3>
            <p className="text-sm text-gray-500">Add this code to your website</p>
          </div>
          <button
            onClick={copyEmbedCode}
            className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Code className="w-5 h-5 mr-2" />
                Copy Code
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100">
            <code>{embedCode?.full_snippet}</code>
          </pre>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Copy the embed code above</li>
            <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
            <li>The chat widget will appear automatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export { EmbedPanel };
