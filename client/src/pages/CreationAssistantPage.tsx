import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Send, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCreationAssistant } from '../stores/creationAssistantStore';
import StoryCard from '../components/creation/StoryCard';
import ConfirmDialog from '../components/ConfirmDialog';

/** Strip ```json...``` blocks from AI message content for display */
function stripJsonBlocks(content: string): string {
  return content
    .replace(/```json\n[\s\S]+?\n```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '') // trim start and end
    .trim();
}

export default function CreationAssistantPage() {
  const navigate = useNavigate();
  const {
    messages,
    isLoading,
    isStreaming,
    aiAvailable,
    checkAiAvailability,
    loadSession,
    sendMessage,
    clearSession,
  } = useCreationAssistant();

  const [input, setInput] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [aiCheckDone, setAiCheckDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      await checkAiAvailability();
      setAiCheckDone(true);
      loadSession();
    };
    init();
  }, [checkAiAvailability, loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearSession = async () => {
    await clearSession();
    setShowConfirmClear(false);
  };

  // Show loading while checking AI availability
  if (!aiCheckDone) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (!aiAvailable) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-text-muted" />
          </div>
          <h2 className="text-lg font-heading font-bold text-text mb-2">AI服务暂不可用</h2>
          <p className="text-sm text-text-muted mb-4">
            请联系管理员配置AI服务
          </p>
          <button
            onClick={() => navigate('/create')}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-text
                     hover:bg-card transition-colors cursor-pointer"
          >
            返回创建页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-bg/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/create')}
            className="flex items-center gap-1.5 text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">返回</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <span className="font-heading font-bold text-text text-[15px]">AI创作助手</span>
          </div>

          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     text-text-muted hover:text-text hover:bg-surface/50 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">新建对话</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 min-h-full flex flex-col">
          {/* Welcome message */}
          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <Sparkles size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-heading font-bold text-text mb-2">
                你好！我是AI创作助手
              </h2>
              <p className="text-sm text-text-muted text-center max-w-md mb-6">
                我可以帮你创作海龟汤。告诉我你的想法，或者让我从头开始构思。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                {[
                  '我想创作一个恐怖向的海龟汤',
                  '帮我构思一个关于电梯的故事',
                  '给我一个温情治愈的主题',
                  '从头开始，你来引导我',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-3 rounded-xl text-sm text-left
                             bg-card border border-border text-text-muted
                             hover:text-text hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message list */}
          <div className="flex-1 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] md:max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-[20px] rounded-br-[4px] px-4 py-3 shadow-sm'
                      : 'bg-surface border border-border/50 rounded-[20px] rounded-bl-[4px] px-4 py-3 shadow-sm'
                  }`}
                >
                  <div className={`text-[15px] leading-relaxed break-words ${
                    message.role === 'user' ? 'text-white' : 'text-text'
                  }`}>
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap m-0">{message.content}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="my-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="my-2 pl-4 list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="my-2 pl-4 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="my-0.5">{children}</li>,
                          code: ({ className, children, ...props }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="px-1.5 py-0.5 rounded bg-surface/50 text-sm font-mono" {...props}>{children}</code>
                            ) : (
                              <code className="block my-2 p-3 rounded-lg bg-surface/50 text-sm font-mono overflow-x-auto" {...props}>{children}</code>
                            );
                          },
                          pre: ({ children }) => <pre className="my-2">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="my-2 pl-3 border-l-2 border-border/50 text-text-muted">{children}</blockquote>,
                          h1: ({ children }) => <h1 className="my-3 text-xl font-bold">{children}</h1>,
                          h2: ({ children }) => <h2 className="my-2.5 text-lg font-bold">{children}</h2>,
                          h3: ({ children }) => <h3 className="my-2 text-base font-bold">{children}</h3>,
                        }}
                      >
                        {stripJsonBlocks(message.content)}
                      </ReactMarkdown>
                    )}
                  </div>
                  
                  {/* Single story card */}
                  {message.metadata?.generatedStory && (
                    <div className="mt-3">
                      <StoryCard story={message.metadata.generatedStory} />
                    </div>
                  )}

                  {/* Multiple story cards */}
                  {message.metadata?.generatedStories && (
                    <div className="mt-3 space-y-3">
                      {message.metadata.generatedStories.map((story, idx) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          index={idx + 1}
                          title={story.title}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Streaming indicator — show when streaming and last assistant message is empty */}
            {isStreaming && messages.length > 0 &&
              messages[messages.length - 1]?.role === 'assistant' &&
              messages[messages.length - 1]?.content === '' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-surface border border-border/50 rounded-[20px] rounded-bl-[4px] px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[13px] font-medium">思考中...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border/50 bg-bg/80 backdrop-blur-md pb-safe">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2.5 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你的想法..."
                disabled={isLoading || isStreaming}
                rows={1}
                className="w-full px-4 py-3 rounded-2xl bg-surface border border-border/50
                         text-[15px] text-text placeholder:text-text-muted resize-none
                         focus:outline-none focus:border-primary/40 focus:bg-surface/80
                         transition-all shadow-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  minHeight: '44px',
                  maxHeight: '120px',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isStreaming}
              className="w-11 h-11 rounded-full bg-primary text-white
                       flex items-center justify-center flex-shrink-0 shadow-sm
                       hover:bg-primary-light transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
            >
              {isLoading || isStreaming ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} className="ml-0.5" />
              )}
            </button>
          </form>
          <p className="text-[11px] font-medium text-text-muted/60 text-center mt-2.5">
            AI生成的内容仅供参考，请注意逻辑一致性
          </p>
        </div>
      </div>

      {/* Confirm clear dialog */}
      <AnimatePresence>
        {showConfirmClear && (
          <ConfirmDialog
            title="新建对话"
            message="确定要开始新对话吗？当前对话历史将被清空。"
            confirmLabel="确定新建"
            variant="default"
            onConfirm={handleClearSession}
            onCancel={() => setShowConfirmClear(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
