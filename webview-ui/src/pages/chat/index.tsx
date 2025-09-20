import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Settings } from "lucide-react";
import { useModelStore } from "@/store/useModelStore";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export const ChatInterface = () => {
  const models = useModelStore((state) => state.models);
  const currentModelId = useModelStore((state) => state.currentModelId);
  const setCurrentModel = useModelStore((state) => state.setCurrentModel);
  const getCurrentModel = useModelStore((state) => state.getCurrentModel);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "你好！我是 AI 助手，有什么可以帮助您的吗？",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<"ask" | "agent">("ask");

  const handleSendMessage = () => {
    if (!inputValue.trim() || !currentModelId) return;

    const currentModel = getCurrentModel();
    if (!currentModel) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = inputValue;
    setInputValue("");

    // 模拟 AI 回复（后续可以替换为真实的 AI 调用）
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `[使用 ${currentModel.provider} - ${currentModel.name}] 我收到了您的消息："${messageContent}"。这是一个模拟的 AI 回复。`,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <Card className="rounded-none border-b">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI 聊天助手
          </CardTitle>
        </CardHeader>
      </Card>

      {/* 消息区域 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.sender === "ai" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.sender === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 输入区域 */}
      <Card className="rounded-none border-t">
        <CardContent className="p-3">
          {/* 输入框容器 */}
          <div className="relative flex items-end gap-2 p-2 border rounded-lg bg-background">
            <div className="flex-1 space-y-2">
              {/* 输入框 */}
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="输入您的消息... (Shift+Enter 换行，Enter 发送)"
                className="min-h-[40px] max-h-[100px] resize-none border-0 p-0 focus-visible:ring-0 text-sm"
                rows={1}
              />

              {/* 模式和模型选择器 */}
              <div className="flex items-center gap-2">
                {/* 模式切换 */}
                <Select
                  value={mode}
                  onValueChange={(value) => setMode(value as "ask" | "agent")}
                  options={[
                    { value: "ask", label: "Ask" },
                    { value: "agent", label: "Agent" }
                  ]}
                >
                  <SelectTrigger className="h-6 w-auto text-xs gap-2 px-2 py-1 border-muted bg-muted/10 rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-24">
                    <SelectItem value="ask">Ask</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>

                {/* 模型选择器 */}
                {models.length > 0 && (
                  <Select
                    value={currentModelId || ""}
                    onValueChange={setCurrentModel}
                    options={models.map((model) => ({
                      value: model.id,
                      label: model.name,
                    }))}
                  >
                    <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none gap-1">
                      <SelectValue
                        placeholder="选择模型"
                        className="truncate"
                      />
                    </SelectTrigger>
                    <SelectContent className="w-40">
                      {models.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="truncate"
                        >
                          <span className="truncate block" title={model.name}>
                            {model.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {models.length === 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Settings className="h-3 w-3" />
                    <span>请先配置模型</span>
                  </div>
                )}
              </div>
            </div>

            {/* 发送按钮 */}
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !currentModelId}
              size="icon"
              className="h-8 w-8 flex-shrink-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
