import { create } from 'zustand';

const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
}

interface ModelState {
  models: ModelConfig[];
  addModel: (model: Omit<ModelConfig, 'id'>) => void;
  updateModel: (id: string, model: Omit<ModelConfig, 'id'>) => void;
  deleteModel: (id: string) => void;
  getModelById: (id: string) => ModelConfig | undefined;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  addModel: (model) =>
    set((state) => ({
      models: [
        ...state.models,
        { ...model, id: generateUniqueId() },
      ],
    })),
  updateModel: (id, model) =>
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id ? { ...model, id } : m
      ),
    })),
  deleteModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
    })),
  getModelById: (id) => {
    const { models } = get();
    return models.find((m) => m.id === id);
  },
}));
