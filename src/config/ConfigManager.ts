import * as vscode from "vscode";

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
}

export class ConfigManager {
  private context: vscode.ExtensionContext;
  private static readonly MODEL_CONFIG_KEY = "co-code.modelConfig";
  private static readonly API_KEY_SECRET = "co-code.apiKey";

  private secretStorage: vscode.SecretStorage;
  // 缓存模型配置，用来删除apiKey
  private modelConfig: Omit<ModelConfig, "apiKey">[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.secretStorage = context.secrets;
  }

  /**
   * 获取模型配置
   */
  async getModelConfig() {
    const res: ModelConfig[] = [];
    const modelConfig = this.context.globalState.get(
      ConfigManager.MODEL_CONFIG_KEY
    ) as Omit<ModelConfig, "apiKey">[] | undefined;
    if (!modelConfig) {
      this.modelConfig = res;
      return res;
    }
    this.modelConfig = res;
    for (const item of modelConfig) {
      const apiKey = await this.getModelApiKey(item.id);
      res.push({ ...item, apiKey: apiKey || "" });
    }
    return res;
  }

  /**
   * 保存模型配置
   */
  setModelConfig(value: ModelConfig[]) {
    const res: Omit<ModelConfig, "apiKey">[] = [];
    value.forEach((item) => {
      this.storeModelApiKey(item.id, item.apiKey);
      res.push({
        id: item.id,
        name: item.name,
        provider: item.provider,
        baseUrl: item.baseUrl,
      });
    });

    const deleteModelIds = this.modelConfig
      .filter((item) => !value.some((v) => v.id === item.id))
      .map((item) => item.id);
    deleteModelIds.forEach((id) => {
      this.deleteModelApiKey(id);
    });
    this.modelConfig = res;
    return this.context.globalState.update(ConfigManager.MODEL_CONFIG_KEY, res);
  }

  /**
   * 获取模型API密钥
   */
  private async getModelApiKey(modelId: string) {
    return this.secretStorage.get(ConfigManager.API_KEY_SECRET + modelId);
  }

  /**
   * 保存模型API密钥
   */
  private async storeModelApiKey(modelId: string, apiKey: string) {
    return this.secretStorage.store(
      ConfigManager.API_KEY_SECRET + modelId,
      apiKey
    );
  }

  /**
   * 删除模型API密钥
   */
  private async deleteModelApiKey(modelId: string) {
    return this.secretStorage.delete(ConfigManager.API_KEY_SECRET + modelId);
  }
}
