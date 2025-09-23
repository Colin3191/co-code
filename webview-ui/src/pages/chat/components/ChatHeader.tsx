import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Trash2 } from 'lucide-react';

interface ChatHeaderProps {
  hasMessages: boolean;
  onClear: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ hasMessages, onClear }) => {
  return (
    <Card className="rounded-none border-b">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI 聊天助手
          </div>
          {hasMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              清空
            </Button>
          )}
        </CardTitle>
      </CardHeader>
    </Card>
  );
};
