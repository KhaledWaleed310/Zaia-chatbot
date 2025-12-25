import { useNavigate } from 'react-router-dom';
import { MessageSquare, PlayCircle, ExternalLink } from 'lucide-react';
import { FeatureBadge } from '@/components/shared/FeatureBadge';
import { Button } from '@/components/ui/button';

const ChatbotHeader = ({ bot, features, isPersonal }) => {
  const navigate = useNavigate();

  const handleTestBot = () => {
    if (isPersonal) {
      // Open in new tab for personal mode
      window.open(`/chat/${bot.id}`, '_blank');
    } else {
      // Navigate to test page
      navigate(`/test-chatbot?botId=${bot.id}`);
    }
  };

  return (
    <div className="p-4 border-b bg-white">
      {/* Bot Info */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bot?.primary_color || '#3B82F6' }}
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900 truncate text-sm">
            {bot?.name || 'Loading...'}
          </h2>
          {/* Feature Badges */}
          <div className="flex flex-wrap gap-1 mt-1">
            {features?.leads && <FeatureBadge type="leads" size="xs" />}
            {features?.handoff && <FeatureBadge type="livechat" size="xs" />}
            {features?.bookings && <FeatureBadge type="bookings" size="xs" />}
            {features?.multiLanguage && <FeatureBadge type="multilang" size="xs" />}
          </div>
        </div>
      </div>

      {/* Test Button */}
      <Button
        onClick={handleTestBot}
        variant="outline"
        size="sm"
        className="w-full mt-3"
      >
        {isPersonal ? (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Chat
          </>
        ) : (
          <>
            <PlayCircle className="w-4 h-4 mr-2" />
            Test Chatbot
          </>
        )}
      </Button>
    </div>
  );
};

export { ChatbotHeader };
