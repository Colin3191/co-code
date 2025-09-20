import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useTabStore } from "@/store/useTabStore";
import { useModelStore } from "@/store/useModelStore";
import type { ModelConfig } from "@/store/useModelStore";

const modelProviders = [
  {
    value: "DeepSeek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
  },
];

const modelOptions = {
  DeepSeek: [
    { value: "deepseek-chat", label: "deepseek-chat" },
    { value: "deepseek-reasoner", label: "deepseek-reasoner" },
  ],
};

export const SettingsPanel = () => {
  const setCurrentTab = useTabStore((state) => state.setCurrentTab);

  const models = useModelStore((state) => state.models);
  const addModel = useModelStore((state) => state.addModel);
  const updateModel = useModelStore((state) => state.updateModel);
  const deleteModel = useModelStore((state) => state.deleteModel);
  const setModels = useModelStore((state) => state.setModels);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<ModelConfig, "id">>({
    name: "",
    provider: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
  });

  const handleProviderChange = (provider: string) => {
    const selectedProvider = modelProviders.find((p) => p.value === provider);
    setFormData((prev) => ({
      ...prev,
      provider,
      baseUrl: selectedProvider?.baseUrl || "",
      name: "", // 重置模型名称，让用户重新选择
    }));
  };

  const handleModelChange = (modelName: string) => {
    setFormData((prev) => ({
      ...prev,
      name: modelName,
    }));
  };

  const getCurrentModelOptions = () => {
    return modelOptions[formData.provider as keyof typeof modelOptions] || [];
  };

  const openAddDialog = () => {
    setEditingModel(null);
    setFormData({
      name: "",
      provider: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (model: ModelConfig) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
    });
    setIsDialogOpen(true);
  };

  const handleSaveModel = async () => {
    if (!formData.name || !formData.baseUrl || !formData.apiKey) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingModel) {
        // 编辑现有模型
        updateModel(editingModel.id, formData);
      } else {
        // 添加新模型
        addModel(formData);
      }
      setIsDialogOpen(false);
      console.log("模型配置已保存");
    } catch (error) {
      console.error("保存模型配置失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModel = (modelId: string) => {
    deleteModel(modelId);
    setDeletingModelId(null);
  };

  const openDeleteConfirm = (modelId: string) => {
    setDeletingModelId(modelId);
  };

  const handleBack = () => {
    setCurrentTab("chat");
  };

  const isFormValid = formData.name && formData.baseUrl && formData.apiKey;

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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <Card className="rounded-none border-b">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              设置
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* 设置内容 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                模型配置
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={openAddDialog}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      添加模型
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingModel ? "编辑模型" : "添加模型"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* 供应商选择 */}
                      <div className="space-y-2">
                        <Label htmlFor="provider-select">供应商</Label>
                        <Select
                          value={formData.provider}
                          onValueChange={handleProviderChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择供应商" />
                          </SelectTrigger>
                          <SelectContent>
                            {modelProviders.map((provider) => (
                              <SelectItem
                                key={provider.value}
                                value={provider.value}
                              >
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 模型名称 */}
                      <div className="space-y-2">
                        <Label htmlFor="model-name">模型名称</Label>
                        <Select
                          value={formData.name}
                          onValueChange={handleModelChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCurrentModelOptions().map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Base URL */}
                      <div className="space-y-2">
                        <Label htmlFor="base-url">Base URL</Label>
                        <Input
                          id="base-url"
                          value={formData.baseUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              baseUrl: e.target.value,
                            }))
                          }
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={formData.apiKey}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              apiKey: e.target.value,
                            }))
                          }
                          placeholder="请输入您的 API Key"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isSaving}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleSaveModel}
                        disabled={!isFormValid || isSaving}
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>暂无配置的模型</p>
                  <p className="text-sm mt-1">点击"添加模型"开始配置</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10">
                        <TableHead className="py-2">模型名称</TableHead>
                        <TableHead className="hidden sm:table-cell py-2">
                          供应商
                        </TableHead>
                        <TableHead className="hidden md:table-cell py-2">
                          Base URL
                        </TableHead>
                        <TableHead className="text-right py-2">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.id} className="h-12">
                          <TableCell className="font-medium py-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-sm">{model.name}</span>
                              <div className="text-xs text-muted-foreground sm:hidden">
                                {modelProviders.find(
                                  (p) => p.value === model.provider
                                )?.label || model.provider}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell py-2 text-sm">
                            {modelProviders.find(
                              (p) => p.value === model.provider
                            )?.label || model.provider}
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-2 font-mono text-xs text-muted-foreground">
                            {model.baseUrl}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(model)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog
                                open={deletingModelId === model.id}
                                onOpenChange={(open) =>
                                  !open && setDeletingModelId(null)
                                }
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteConfirm(model.id)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      确认删除
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      您确定要删除模型 "{model.name}"
                                      吗？此操作无法撤销。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteModel(model.id)
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      删除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 支持配置多个AI模型，使用时可以自由选择</p>
              <p>• 选择供应商会自动设置对应的 Base URL，也可手动修改</p>
              <p>• API Key 仅存储在内存中，刷新页面后会重置</p>
              <p>• 配置保存后会立即生效，无需重启扩展</p>
              <p>• 支持兼容 OpenAI API 格式的任意第三方模型服务</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
