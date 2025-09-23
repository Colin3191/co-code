import { generateUniqueId } from '@/utils/generateUniqueId';
import { create } from 'zustand';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
}

interface ModelState {
  models: ModelConfig[];
  currentModelId: string | null;
  addModel: (model: Omit<ModelConfig, 'id'>) => void;
  updateModel: (id: string, model: Omit<ModelConfig, 'id'>) => void;
  deleteModel: (id: string) => void;
  setModels: (models: ModelConfig[]) => void;
  setCurrentModel: (id: string) => void;
  getCurrentModel: () => ModelConfig | null;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  currentModelId: null,
  addModel: (model) => {
    const newModel = { ...model, id: generateUniqueId() };
    set((state) => ({
      models: [...state.models, newModel],
      currentModelId: state.currentModelId || newModel.id, // 如果没有当前模型，设置为第一个
    }));
    window.vscode.postMessage({
      type: 'saveModelConfig',
      data: get().models,
    });
  },
  updateModel: (id, model) => {
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...model, id } : m)),
    }));
    window.vscode.postMessage({
      type: 'saveModelConfig',
      data: get().models,
    });
  },
  deleteModel: (id) => {
    set((state) => {
      const newModels = state.models.filter((m) => m.id !== id);
      return {
        models: newModels,
        currentModelId:
          state.currentModelId === id
            ? newModels.length > 0
              ? newModels[0].id
              : null
            : state.currentModelId,
      };
    });
    window.vscode.postMessage({
      type: 'saveModelConfig',
      data: get().models,
    });
  },
  setModels: (models) =>
    set((state) => ({
      models,
      currentModelId:
        state.currentModelId || (models.length > 0 ? models[0].id : null),
    })),
  setCurrentModel: (id) => set({ currentModelId: id }),
  getCurrentModel: () => {
    const { models, currentModelId } = get();
    return models.find((m) => m.id === currentModelId) || null;
  },
}));
