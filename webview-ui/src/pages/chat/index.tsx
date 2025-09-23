import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useModelStore } from '@/store/useModelStore';
import { generateUniqueId } from '@/utils/generateUniqueId';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { useChatStore, type Message } from './store/useChatStore';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatComposer } from './components/ChatComposer';
import { ClearHistoryDialog } from './components/ClearHistoryDialog';

export const ChatInterface = () => {
  const models = useModelStore((state) => state.models);
  const currentModelId = useModelStore((state) => state.currentModelId);
  const setCurrentModel = useModelStore((state) => state.setCurrentModel);
  const getCurrentModel = useModelStore((state) => state.getCurrentModel);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const messages = useChatStore((state) => state.messages);

  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [isSending, setIsSending] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentModelId || isSending) return;

    const currentModel = getCurrentModel();
    if (!currentModel) return;

    if (currentModel.provider.toLowerCase() !== 'deepseek') {
      addMessage({
        id: generateUniqueId(),
        content: `当前仅支持 DeepSeek 模型，请在设置中选择 DeepSeek 提供商。`,
        role: 'assistant',
      });
      return;
    }

    const userMessage: Message = {
      id: generateUniqueId(),
      content: inputValue,
      role: 'user',
    };

    if (!currentModel.apiKey) {
      addMessage({
        id: generateUniqueId(),
        content: '未检测到 API Key，请在设置中填写后重试。',
        role: 'assistant',
      });
      return;
    }

    const conversationMessages = [
      ...useChatStore.getState().messages,
      userMessage,
    ].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    addMessage(userMessage);
    const aiMessageId = generateUniqueId();
    addMessage({
      id: aiMessageId,
      content: '',
      role: 'assistant',
      status: 'streaming',
    });

    setInputValue('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const deepseek = createDeepSeek({
      apiKey: currentModel.apiKey,
      baseURL: currentModel.baseUrl || undefined,
    });

    try {
      setIsSending(true);

      const modelId = (currentModel.name || 'deepseek-chat') as Parameters<
        ReturnType<typeof createDeepSeek>['chat']
      >[0];

      const stream = streamText({
        model: deepseek.chat(modelId),
        messages: conversationMessages,
        abortSignal: abortController.signal,
      });

      let fullText = '';
      let reasoningText = '';

      for await (const part of stream.fullStream) {
        if (part.type === 'text-delta') {
          fullText += part.text;
          updateMessage(aiMessageId, {
            content: fullText,
            status: 'streaming',
          });
          continue;
        }

        if (part.type === 'reasoning-start') {
          reasoningText = '';
          updateMessage(aiMessageId, {
            reasoning: '',
            status: 'streaming',
          });
          continue;
        }

        if (part.type === 'reasoning-delta') {
          reasoningText += part.text;
          updateMessage(aiMessageId, {
            reasoning: reasoningText,
            status: 'streaming',
          });
          continue;
        }

        if (part.type === 'reasoning-end') {
          updateMessage(aiMessageId, {
            reasoning: reasoningText || undefined,
            status: 'streaming',
          });
        }
      }

      updateMessage(aiMessageId, {
        content: fullText,
        reasoning: reasoningText || undefined,
        status: 'complete',
      });
    } catch (error) {
      const errorName =
        error &&
        typeof error === 'object' &&
        'name' in error &&
        typeof (error as { name?: unknown }).name === 'string'
          ? (error as { name?: string }).name ?? ''
          : '';
      const isAbort = errorName === 'AbortError';
      updateMessage(aiMessageId, {
        content: isAbort
          ? '已终止对话。'
          : `请求 DeepSeek 失败：${
              error instanceof Error ? error.message : '未知错误'
            }`,
        reasoning: undefined,
        status: 'complete',
      });
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearMessages = () => {
    if (messages.length > 0) {
      setShowClearDialog(true);
    }
  };

  const confirmClearMessages = () => {
    clearMessages();
    setShowClearDialog(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        hasMessages={messages.length > 0}
        onClear={handleClearMessages}
      />

      <ChatMessageList messages={messages} />

      <Card className="rounded-none border-t">
        <CardContent className="p-3">
          <ChatComposer
            inputValue={inputValue}
            onInputChange={(value) => setInputValue(value)}
            onKeyDown={handleKeyPress}
            mode={mode}
            onModeChange={(value) => setMode(value)}
            models={models}
            currentModelId={currentModelId}
            onSelectModel={setCurrentModel}
            isSending={isSending}
            onSend={handleSendMessage}
            onStop={handleStop}
          />
        </CardContent>
      </Card>

      <ClearHistoryDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        onConfirm={confirmClearMessages}
      />
    </div>
  );
};
