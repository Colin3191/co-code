import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Send, Settings, Square } from 'lucide-react';
import { type ModelConfig } from '@/store/useModelStore';
import { type WorkspaceFileItem } from '@/types/context';

interface FilePickerConfig {
  open: boolean;
  query: string;
  items: WorkspaceFileItem[];
  highlightedIndex: number;
  loading: boolean;
  error?: string;
  onSelect: (item: WorkspaceFileItem) => void;
  onNavigate: (direction: 'up' | 'down') => void;
  onConfirm: () => void;
  onClose: () => void;
  onHover: (index: number) => void;
  onRefresh: () => void;
}

interface ChatComposerProps {
  inputValue: string;
  onInputChange: (value: string, caret: number) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  mode: 'ask' | 'agent';
  onModeChange: (mode: 'ask' | 'agent') => void;
  models: ModelConfig[];
  currentModelId: string | null;
  onSelectModel: (id: string) => void;
  isSending: boolean;
  onSend: () => void;
  onStop: () => void;
  onTriggerFileContext: (range: { start: number; end: number }) => void;
  selectionRange?: { start: number; end: number } | null;
  onSelectionRangeApplied?: () => void;
  filePicker?: FilePickerConfig;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  inputValue,
  onInputChange,
  onKeyDown,
  mode,
  onModeChange,
  models,
  currentModelId,
  onSelectModel,
  isSending,
  onSend,
  onStop,
  onTriggerFileContext,
  selectionRange,
  onSelectionRangeApplied,
  filePicker,
}) => {
  const isSendDisabled = !inputValue.trim() || !currentModelId || isSending;
  const composerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const ITEM_HEIGHT = 44;
  const LIST_HEIGHT = 220;
  const OVERSCAN = 3;

  useEffect(() => {
    if (!selectionRange || !textareaRef.current) {
      return;
    }
    const target = textareaRef.current;
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(selectionRange.start, selectionRange.end);
      onSelectionRangeApplied?.();
    });
  }, [selectionRange, onSelectionRangeApplied]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (filePicker?.open) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        filePicker.onNavigate('down');
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        filePicker.onNavigate('up');
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        filePicker.onConfirm();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        filePicker.onClose();
        return;
      }
    }

    onKeyDown(event);

    if (event.defaultPrevented || event.repeat) {
      return;
    }

    if (
      event.key === '@' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const target = event.currentTarget;
      onTriggerFileContext({
        start: target.selectionStart ?? inputValue.length,
        end: target.selectionEnd ?? inputValue.length,
      });
    }
  };

  useEffect(() => {
    if (!filePicker?.open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!composerRef.current) {
        return;
      }
      if (composerRef.current.contains(event.target as Node)) {
        return;
      }
      filePicker.onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [filePicker?.open, filePicker?.onClose]);

  useEffect(() => {
    if (!filePicker?.open) {
      return;
    }
    if (!listRef.current) {
      return;
    }
    const container = listRef.current;
    const targetTop = filePicker.highlightedIndex * ITEM_HEIGHT;
    const targetBottom = targetTop + ITEM_HEIGHT;
    const currentTop = container.scrollTop;
    const currentBottom = currentTop + LIST_HEIGHT;

    if (targetTop < currentTop) {
      container.scrollTo({ top: targetTop });
      setScrollTop(targetTop);
    } else if (targetBottom > currentBottom) {
      const nextTop = targetBottom - LIST_HEIGHT;
      container.scrollTo({ top: nextTop });
      setScrollTop(nextTop);
    }
  }, [filePicker?.highlightedIndex, filePicker?.open, filePicker?.items]);
  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    const maxScroll = Math.max(
      0,
      filePicker ? filePicker.items.length * ITEM_HEIGHT - LIST_HEIGHT : 0,
    );
    if (scrollTop > maxScroll) {
      setScrollTop(maxScroll);
      listRef.current.scrollTop = maxScroll;
    }
  }, [filePicker?.items, scrollTop]);

  const totalItems = filePicker?.items.length ?? 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(LIST_HEIGHT / ITEM_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(totalItems, startIndex + visibleCount);
  const visibleItems = filePicker ? filePicker.items.slice(startIndex, endIndex) : [];
  const offsetY = startIndex * ITEM_HEIGHT;

  return (
    <div
      ref={composerRef}
      className="relative flex items-end gap-2 p-2 border rounded-lg bg-background"
    >
      <div className="flex-1 space-y-2">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(event) =>
            onInputChange(
              event.target.value,
              event.target.selectionStart ?? event.target.value.length,
            )
          }
          onKeyDown={handleKeyDown}
          placeholder="输入您的消息... (Shift+Enter 换行，Enter 发送)"
          className="min-h-[40px] max-h-[100px] resize-none border-0 p-0 focus-visible:ring-0 text-sm"
          rows={1}
        />

        <div className="flex items-center gap-2">
          <Select
            value={mode}
            onValueChange={(value) => onModeChange(value as 'ask' | 'agent')}
            options={[
              { value: 'ask', label: 'Ask' },
              { value: 'agent', label: 'Agent' },
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

          {models.length > 0 ? (
            <Select
              value={currentModelId || ''}
              onValueChange={onSelectModel}
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
                  <SelectItem key={model.id} value={model.id} className="truncate">
                    <span className="truncate block" title={model.name}>
                      {model.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Settings className="h-3 w-3" />
              <span>请先配置模型</span>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={onSend}
        disabled={isSendDisabled}
        size="icon"
        className="h-8 w-8 flex-shrink-0"
      >
        <Send className="h-3 w-3" />
      </Button>

      {isSending && (
        <Button
          onClick={onStop}
          size="icon"
          variant="secondary"
          className="h-8 w-8 flex-shrink-0"
        >
          <Square className="h-3 w-3" />
        </Button>
      )}

      {filePicker?.open && (
        <div
          className="absolute left-0 right-0 z-50 mb-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
          style={{ bottom: 'calc(100% + 6px)' }}
        >
          <div className="border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
            @{filePicker.query}
          </div>
          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1"
            style={{ height: LIST_HEIGHT }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          >
            {filePicker.loading ? (
              <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                正在加载...
              </div>
            ) : filePicker.error ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-destructive">
                <span>{filePicker.error}</span>
                <button
                  type="button"
                  className="rounded border border-destructive/30 px-2 py-1 text-[11px] text-destructive"
                  onClick={filePicker.onRefresh}
                >
                  重试
                </button>
              </div>
            ) : filePicker.items.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                未找到匹配的文件
              </div>
            ) : (
              <>
                <div style={{ height: totalItems * ITEM_HEIGHT }}>
                  <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => {
                      const realIndex = startIndex + index;
                      return (
                        <button
                          key={item.uri}
                          type="button"
                          onMouseEnter={() => filePicker.onHover(realIndex)}
                          onClick={() => filePicker.onSelect(item)}
                          className={`group flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                            filePicker.highlightedIndex === realIndex
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-muted/70'
                          }`}
                          style={{ height: ITEM_HEIGHT }}
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="truncate text-[13px] font-medium leading-tight">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground group-hover:text-foreground/80">
                            {item.description && <span>{item.description}</span>}
                            {item.isTooLarge && <span className="text-orange-500">超大文件</span>}
                            {item.truncated && <span className="text-orange-500">截断</span>}
                            {item.isRecent && <span className="text-primary">最近</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
