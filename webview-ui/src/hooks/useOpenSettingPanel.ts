import { useTabStore } from "@/store/useTabStore";
import { useEffect } from "react";

export const useOpenSettingPanel = () => {
  const setCurrentTab = useTabStore((state) => state.setCurrentTab);
  useEffect(() => {
    const handleMessage = (e: MessageEvent<{ type: "openSettingPanel" }>) => {
      const data = e.data;
      if (data.type === "openSettingPanel") {
        setCurrentTab("settings");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setCurrentTab]);
};
