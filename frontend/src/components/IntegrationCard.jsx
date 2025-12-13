import { useState } from 'react';
import {
  Loader2,
  Link as LinkIcon,
  Unlink,
  FolderOpen,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';

// SVG Logo Components
const GoogleDriveLogo = () => (
  <svg viewBox="0 0 87.3 78" className="w-7 h-7">
    <path d="M6.6 66.85L3.3 61.45 29.05 17.5h6.6l25.75 43.95-3.3 5.4H6.6z" fill="#0066DA"/>
    <path d="M58.1 66.85l-3.3-5.4 25.75-43.95h6.6l3.3 5.4L64.7 66.85h-6.6z" fill="#00AC47"/>
    <path d="M29.05 17.5L54.8 61.45l-3.3 5.4H6.6l3.3-5.4 19.15-43.95z" fill="#EA4335"/>
    <path d="M83.15 22.9L58.1 66.85h-6.6L77.25 22.9h5.9z" fill="#00832D"/>
    <path d="M29.05 17.5h6.6l25.75 43.95h-6.6L29.05 17.5z" fill="#2684FC"/>
    <path d="M35.65 17.5L9.9 61.45l-3.3 5.4 3.3 5.4h45.2l3.3-5.4-25.75-43.95z" fill="#FFBA00"/>
  </svg>
);

const GmailLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
  </svg>
);

const NotionLogo = () => (
  <svg viewBox="0 0 100 100" className="w-7 h-7">
    <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
  </svg>
);

const HubSpotLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.2 2.2 0 0 0 17.23.836h-.065a2.2 2.2 0 0 0-2.199 2.198v.066c0 .87.507 1.617 1.24 1.974v2.862a6.22 6.22 0 0 0-2.924 1.453l-7.44-5.79a2.691 2.691 0 0 0 .089-.663 2.69 2.69 0 1 0-2.69 2.69c.474 0 .918-.124 1.305-.34l7.299 5.678a6.242 6.242 0 0 0-.627 2.73c0 1.044.256 2.028.708 2.895l-2.264 2.264a2.048 2.048 0 0 0-.621-.098 2.065 2.065 0 1 0 2.065 2.065c0-.22-.036-.432-.099-.632l2.223-2.222a6.24 6.24 0 0 0 3.396 1.003c3.456 0 6.258-2.802 6.258-6.258s-2.802-6.258-6.258-6.258a6.22 6.22 0 0 0-2.66.593zm2.66 9.802a3.545 3.545 0 1 1 0-7.09 3.545 3.545 0 0 1 0 7.09z" fill="#FF7A59"/>
  </svg>
);

// Provider info with real logos
const PROVIDERS = {
  google_drive: {
    name: 'Google Drive',
    description: 'Import documents, spreadsheets, and files from Google Drive',
    color: '#4285F4',
    Logo: GoogleDriveLogo,
  },
  gmail: {
    name: 'Gmail',
    description: 'Import emails to use as knowledge base',
    color: '#EA4335',
    Logo: GmailLogo,
  },
  notion: {
    name: 'Notion',
    description: 'Import pages and databases from Notion',
    color: '#000000',
    Logo: NotionLogo,
  },
  slack: {
    name: 'Slack',
    description: 'Import channel messages from Slack',
    color: '#4A154B',
    Logo: SlackLogo,
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Import contacts, companies, deals and notes from HubSpot CRM',
    color: '#FF7A59',
    Logo: HubSpotLogo,
  },
};

// Default fallback logo
const DefaultLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IntegrationCard = ({
  provider,
  integration,
  onConnect,
  onDisconnect,
  onBrowse,
  connecting,
  comingSoon = false,
}) => {
  const providerInfo = PROVIDERS[provider] || {
    name: provider,
    description: '',
    color: '#666',
    Logo: DefaultLogo,
  };

  const LogoComponent = providerInfo.Logo;

  const isConnected = integration?.status === 'connected';
  const isExpired = integration?.status === 'expired';
  const hasError = integration?.status === 'error';

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 ${comingSoon ? 'overflow-hidden' : ''}`}>
      {/* Coming Soon Overlay */}
      {comingSoon && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg">
            Coming Soon
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${providerInfo.color}15` }}
        >
          <LogoComponent />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{providerInfo.name}</h3>
            {isConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                Expired
              </span>
            )}
            {hasError && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                Error
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{providerInfo.description}</p>
        </div>
      </div>

      {/* Connected State Info */}
      {isConnected && integration && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <span>Account:</span>
            <span className="font-medium text-gray-900 truncate max-w-[200px]">
              {integration.provider_user_email || 'Connected'}
            </span>
          </div>
          {integration.last_sync && (
            <div className="flex items-center justify-between text-gray-600 mt-1">
              <span>Last sync:</span>
              <span className="text-gray-900">{formatDate(integration.last_sync)}</span>
            </div>
          )}
          {integration.sync_stats?.documents_count > 0 && (
            <div className="flex items-center justify-between text-gray-600 mt-1">
              <span>Documents:</span>
              <span className="text-gray-900">{integration.sync_stats.documents_count}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {isConnected || isExpired ? (
          <>
            <button
              onClick={onBrowse}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm font-medium"
            >
              <FolderOpen className="w-4 h-4" />
              Browse & Import
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px] text-sm"
            >
              <Unlink className="w-4 h-4" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm font-medium"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                Connect {providerInfo.name}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default IntegrationCard;
