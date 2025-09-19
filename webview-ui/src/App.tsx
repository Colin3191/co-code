import { ChatInterface } from '@/components/ChatInterface';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ThemeProvider } from './components/theme-provider';
import { useTabStore } from './store/useTabStore';
import { useEffect } from 'react';

const App = () => {
  const currentTab = useTabStore((state) => state.currentTab);
  const setCurrentTab = useTabStore((state) => state.setCurrentTab);

  useEffect(() => {
    const handleMessage = (e: MessageEvent<{ type: 'openSettingPanel' }>) => {
      const data = e.data;
      if (data.type === 'openSettingPanel') {
        setCurrentTab('settings');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setCurrentTab]);

  return (
    <ThemeProvider defaultTheme="dark">
      {currentTab === 'chat' && <ChatInterface />}
      {currentTab === 'settings' && <SettingsPanel />}
    </ThemeProvider>
  );
};

export { App };
