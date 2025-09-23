import { ChatInterface } from "@/pages/chat";
import { SettingsPanel } from "@/pages/setting";
import { ThemeProvider } from "./components/theme-provider";
import { useTabStore } from "./store/useTabStore";
import { useInitModelConfig } from "./hooks/useInitModeConfig";
import { useOpenSettingPanel } from "./hooks/useOpenSettingPanel";

const App = () => {
  const currentTab = useTabStore((state) => state.currentTab);

  useOpenSettingPanel();
  useInitModelConfig();

  return (
    <ThemeProvider>
      {currentTab === "chat" && <ChatInterface />}
      {currentTab === "settings" && <SettingsPanel />}
    </ThemeProvider>
  );
};

export { App };
