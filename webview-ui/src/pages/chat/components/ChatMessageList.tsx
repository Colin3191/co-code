import React, { useEffect, useRef } from 'react';
import { Bot, Loader2, User } from 'lucide-react';
import { type Message } from '../store/useChatStore';

interface ChatMessageListProps {
  messages: Message[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
    }
  }, []);

  return (
    <div ref={ref} className="flex-1 flex flex-col-reverse overflow-auto">
      <div className="space-y-4 my-4 mx-2">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
};

interface ChatMessageItemProps {
  message: Message;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isAssistantStreaming =
    message.role === 'assistant' && message.status === 'streaming';

  return (
    <div
      className={`flex items-start gap-3 ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {message.role === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {message.role === 'assistant' && message.reasoning && (
          <div className="mb-2 text-[11px] whitespace-pre-wrap text-muted-foreground border-l-2 border-primary/30 pl-2">
            {message.reasoning}
          </div>
        )}

        {isAssistantStreaming && !message.content ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

      </div>

      {message.role === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
};
