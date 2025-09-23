import React from 'react';
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

interface ChatComposerProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  mode: 'ask' | 'agent';
  onModeChange: (mode: 'ask' | 'agent') => void;
  models: ModelConfig[];
  currentModelId: string | null;
  onSelectModel: (id: string) => void;
  isSending: boolean;
  onSend: () => void;
  onStop: () => void;
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
}) => {
  const isSendDisabled = !inputValue.trim() || !currentModelId || isSending;

  return (
    <div className="relative flex items-end gap-2 p-2 border rounded-lg bg-background">
      <div className="flex-1 space-y-2">
        <Textarea
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
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
    </div>
  );
};
