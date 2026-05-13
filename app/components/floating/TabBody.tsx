'use client';
import dynamic from 'next/dynamic';
import type { Tab } from '@/lib/store/floating-window';
import { FirstOpenGuide } from './FirstOpenGuide';

const VaultTab     = dynamic(() => import('./VaultTab').then((m) => m.VaultTab),     { ssr: false });
const SettingsTab  = dynamic(() => import('./SettingsTab').then((m) => m.SettingsTab),  { ssr: false });
const StatsTab     = dynamic(() => import('./StatsTab').then((m) => m.StatsTab),     { ssr: false });
const TrendsTab    = dynamic(() => import('./TrendsTab').then((m) => m.TrendsTab),    { ssr: false });
const PersonaTab   = dynamic(() => import('./PersonaTab').then((m) => m.PersonaTab),   { ssr: false });
const DebateTab    = dynamic(() => import('./DebateTab').then((m) => m.DebateTab),    { ssr: false });
const VoiceDiffTab = dynamic(() => import('./VoiceDiffTab').then((m) => m.VoiceDiffTab), { ssr: false });
const ResearchTab  = dynamic(() => import('./ResearchTab').then((m) => m.ResearchTab),  { ssr: false });
const KanshanChatTab = dynamic(() => import('./KanshanChatTab').then((m) => m.KanshanChatTab), { ssr: false });

function renderBody(tab: Tab) {
  switch (tab.kind) {
    case 'vault':         return <VaultTab     {...tab.props} />;
    case 'settings':      return <SettingsTab  {...tab.props} />;
    case 'stats':         return <StatsTab     {...tab.props} />;
    case 'trends':        return <TrendsTab    {...tab.props} />;
    case 'persona':       return <PersonaTab   {...tab.props} />;
    case 'debate':        return <DebateTab    {...tab.props} />;
    case 'voice-diff':    return <VoiceDiffTab {...tab.props} />;
    case 'research':      return <ResearchTab  {...tab.props} />;
    case 'kanshan-chat':  return <KanshanChatTab />;
  }
}

export function TabBody({ tab }: { tab: Tab }) {
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {renderBody(tab)}
      <FirstOpenGuide kind={tab.kind} />
    </div>
  );
}
