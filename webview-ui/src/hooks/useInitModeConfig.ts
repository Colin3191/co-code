import { useModelStore, type ModelConfig } from "@/store/useModelStore";
import { useEffect } from "react";

export const useInitModelConfig = () => {
  const setModels = useModelStore((state) => state.setModels);

  useEffect(() => {
    window.vscode.postMessage({
      type: "getModelConfig",
    });
  }, []);

  useEffect(() => {
    const onMessage = (
      e: MessageEvent<{ type: "modelConfig"; data: ModelConfig[] }>
    ) => {
      const data = e.data;
      if (data.type === "modelConfig") {
        setModels(data.data ?? []);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);
};
