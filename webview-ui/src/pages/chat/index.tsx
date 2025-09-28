import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useModelStore } from '@/store/useModelStore';
import { generateUniqueId } from '@/utils/generateUniqueId';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { useChatStore, type Message } from './store/useChatStore';
import { useContextStore } from '@/store/useContextStore';
import { type WorkspaceFileItem, type ContextEntryFile } from '@/types/context';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatComposer } from './components/ChatComposer';
import { ClearHistoryDialog } from './components/ClearHistoryDialog';
import { ContextSummary } from './components/ContextSummary';
import { useMentionTracker } from '@/hooks/useMentionTracker';

const isWhitespace = (character: string) => /\s/.test(character);

const findActiveMention = (
  text: string,
  caret: number,
): { start: number; end: number } | null => {
  if (caret <= 0 || caret > text.length) {
    return null;
  }

  let index = caret - 1;

  while (index >= 0) {
    const character = text[index];
    if (character === '@') {
      return { start: index, end: caret };
    }
    if (isWhitespace(character)) {
      break;
    }
    index -= 1;
  }

  return null;
};

export const ChatInterface = () => {
  const models = useModelStore((state) => state.models);
  const currentModelId = useModelStore((state) => state.currentModelId);
  const setCurrentModel = useModelStore((state) => state.setCurrentModel);
  const getCurrentModel = useModelStore((state) => state.getCurrentModel);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const messages = useChatStore((state) => state.messages);
  const contextEntries = useContextStore((state) => state.entries);
  const lastAddedContextEntry = useContextStore((state) => state.lastAddedEntry);
  const clearLastAddedContextEntry = useContextStore(
    (state) => state.clearLastAddedEntry,
  );

  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [isSending, setIsSending] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pendingMentionRange, setPendingMentionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [pendingSelectionRange, setPendingSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileItem[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [fileListError, setFileListError] = useState<string | undefined>(undefined);
  const [filePickerQuery, setFilePickerQuery] = useState('');
  const [filePickerHighlightedIndex, setFilePickerHighlightedIndex] = useState(0);

  const requestWorkspaceFiles = () => {
    setFileListLoading(true);
    setFileListError(undefined);
    window.vscode.postMessage({ type: 'context:listFiles' });
  };

  useEffect(() => {
    if (!pendingMentionRange || !lastAddedContextEntry) {
      return;
    }

    const placeholder = `@{${lastAddedContextEntry.relativePath}}`;
    let caretPosition = 0;

    setInputValue((prev) => {
      const mentionRange = findActiveMention(
        prev,
        pendingMentionRange?.end ?? prev.length,
      ) ?? pendingMentionRange;

      if (!mentionRange) {
        return prev;
      }

      const replaceStart = Math.max(0, mentionRange.start);
      const replaceEnd = Math.max(mentionRange.end, replaceStart + 1);
      const before = prev.slice(0, replaceStart);
      const after = prev.slice(replaceEnd);
      const nextValue = `${before}${placeholder}${after}`;
      caretPosition = before.length + placeholder.length;
      return nextValue;
    });

    setPendingSelectionRange({
      start: caretPosition,
      end: caretPosition,
    });

    clearLastAddedContextEntry();
    setPendingMentionRange(null);
    setIsFilePickerOpen(false);
    setFilePickerQuery('');
    setFilePickerHighlightedIndex(0);
  }, [
    pendingMentionRange,
    lastAddedContextEntry,
    clearLastAddedContextEntry,
  ]);

  useEffect(() => {
    setFilePickerHighlightedIndex(0);
  }, [filePickerQuery]);

  const filteredFiles = useMemo(() => {
    if (!filePickerQuery.trim()) {
      return workspaceFiles;
    }
    const lower = filePickerQuery.toLowerCase();
    return workspaceFiles.filter((file) =>
      file.label.toLowerCase().includes(lower) ||
      (file.description && file.description.toLowerCase().includes(lower)),
    );
  }, [workspaceFiles, filePickerQuery]);

  useEffect(() => {
    const handleMessage = (
      event: MessageEvent<{
        type: string;
        data?: { files?: WorkspaceFileItem[]; error?: string };
      }>,
    ) => {
      if (event.data?.type === 'context:fileList') {
        setFileListLoading(false);
        setWorkspaceFiles(event.data.data?.files ?? []);
        setFileListError(event.data.data?.error);
        setFilePickerHighlightedIndex(0);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const { syncMentionCounts } = useMentionTracker({ getContent: () => inputValue });

  useEffect(() => {
    syncMentionCounts();
  }, [inputValue, contextEntries, syncMentionCounts]);

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

    const expandUserContent = (content: string) => {
      const mentionRegex = /@\{([^}]+)\}/g;
      const matches = Array.from(content.matchAll(mentionRegex));
      if (matches.length === 0) {
        return content;
      }

      const blocks: string[] = [];
      const seen = new Set<string>();

      matches.forEach((match) => {
        const relativePath = match[1];
        if (!relativePath || seen.has(relativePath)) {
          return;
        }
        seen.add(relativePath);
        const entry = contextEntries.find(
          (item): item is ContextEntryFile =>
            item.kind === 'file' && item.relativePath === relativePath,
        );
        if (!entry) {
          return;
        }
        const header = entry.truncated
          ? `[文件 ${relativePath} (已截断)]`
          : `[文件 ${relativePath}]`;
        blocks.push(`${header}\n${entry.preview}`);
      });

      if (blocks.length === 0) {
        return content;
      }

      return `${content}\n\n${blocks.join('\n\n')}`;
    };

    const conversationMessages = [
      ...useChatStore.getState().messages,
      userMessage,
    ].map((message) => ({
      role: message.role,
      content:
        message.role === 'user'
          ? expandUserContent(message.content)
          : message.content,
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

  const handleTriggerFileContext = (range: { start: number; end: number }) => {
    setPendingMentionRange(range);
    setPendingSelectionRange(null);
    setIsFilePickerOpen(true);
    setFilePickerQuery('');
    setFilePickerHighlightedIndex(0);
    requestWorkspaceFiles();
  };

  const handleSelectionRangeApplied = () => {
    setPendingSelectionRange(null);
  };

  const handleInputChange = (value: string, caret: number) => {
    setInputValue(value);

    const mentionRange = findActiveMention(value, caret);

    if (!mentionRange) {
      if (pendingMentionRange) {
        setPendingMentionRange(null);
        setIsFilePickerOpen(false);
        setFilePickerQuery('');
      }
      return;
    }

    setPendingMentionRange(mentionRange);
    setFilePickerQuery(value.slice(mentionRange.start + 1, mentionRange.end));
    if (!pendingMentionRange) {
      requestWorkspaceFiles();
    }
    setIsFilePickerOpen(true);

    syncMentionCounts();
  };

  const handleFilePickerSelect = (file: WorkspaceFileItem) => {
    if (!pendingMentionRange) {
      return;
    }
    window.vscode.postMessage({
      type: 'context:addFile',
      data: { uri: file.uri },
    });
    setIsFilePickerOpen(false);
    setFilePickerQuery('');
  };

  const handleFilePickerClose = () => {
    setIsFilePickerOpen(false);
    setPendingMentionRange(null);
    setFilePickerQuery('');
    setFilePickerHighlightedIndex(0);
  };

  const handleFilePickerNavigate = (direction: 'up' | 'down') => {
    setFilePickerHighlightedIndex((prev) => {
      if (filteredFiles.length === 0) {
        return 0;
      }
      if (direction === 'down') {
        return (prev + 1) % filteredFiles.length;
      }
      return (prev - 1 + filteredFiles.length) % filteredFiles.length;
    });
  };

  const handleFilePickerConfirm = () => {
    if (filteredFiles.length === 0) {
      return;
    }
    handleFilePickerSelect(
      filteredFiles[Math.min(filePickerHighlightedIndex, filteredFiles.length - 1)],
    );
  };

  const handleFilePickerHover = (index: number) => {
    setFilePickerHighlightedIndex(index);
  };

  const handleFilePickerRefresh = () => {
    requestWorkspaceFiles();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        hasMessages={messages.length > 0}
        onClear={handleClearMessages}
      />

      <ChatMessageList messages={messages} />

      <Card className="rounded-none border-t">
        <CardContent className="p-3 space-y-3">
          <ContextSummary />
          <ChatComposer
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyPress}
            mode={mode}
            onModeChange={(value) => setMode(value)}
            models={models}
            currentModelId={currentModelId}
            onSelectModel={setCurrentModel}
            isSending={isSending}
            onSend={handleSendMessage}
            onStop={handleStop}
            onTriggerFileContext={handleTriggerFileContext}
            selectionRange={pendingSelectionRange}
            onSelectionRangeApplied={handleSelectionRangeApplied}
            filePicker={{
              open: isFilePickerOpen,
              query: filePickerQuery,
              items: filteredFiles,
              highlightedIndex: Math.min(
                filePickerHighlightedIndex,
                Math.max(filteredFiles.length - 1, 0),
              ),
              loading: fileListLoading,
              error: fileListError,
              onSelect: handleFilePickerSelect,
              onNavigate: handleFilePickerNavigate,
              onConfirm: handleFilePickerConfirm,
              onClose: handleFilePickerClose,
              onHover: handleFilePickerHover,
              onRefresh: handleFilePickerRefresh,
            }}
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
