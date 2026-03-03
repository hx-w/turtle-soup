import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Bot, Lightbulb, AlertCircle } from 'lucide-react';
import StepperInput from '../StepperInput';

interface AiSettingsPanelProps {
  aiAvailable: boolean;
  aiHostEnabled: boolean;
  aiHostDelayMinutes: number;
  aiHintEnabled: boolean;
  aiHintPerPlayer: number;
  onChange: (field: string, value: boolean | number) => void;
}

export default function AiSettingsPanel({
  aiAvailable,
  aiHostEnabled,
  aiHostDelayMinutes,
  aiHintEnabled,
  aiHintPerPlayer,
  onChange,
}: AiSettingsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-dashed border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium
                   text-text-muted hover:bg-surface/50 transition-colors cursor-pointer"
      >
        <span>高级设置</span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* AI Unavailable Notice */}
              {!aiAvailable && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    <p className="font-medium">AI 服务未配置</p>
                    <p className="mt-0.5 text-amber-500/80">需在服务端配置 AI_PROVIDER、AI_BASE_URL、AI_API_KEY 后可用</p>
                  </div>
                </div>
              )}

              {/* AI Host */}
              <div className={`rounded-lg border border-border p-3 space-y-2 ${!aiAvailable ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-violet-500" />
                    <span className="text-sm font-medium text-text">AI 主持人</span>
                  </div>
                  <label className={`relative inline-flex items-center ${aiAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={aiHostEnabled}
                      onChange={(e) => aiAvailable && onChange('aiHostEnabled', e.target.checked)}
                      disabled={!aiAvailable}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer
                                    peer-checked:after:translate-x-full
                                    after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                    after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                                    peer-checked:bg-primary peer-disabled:opacity-50" />
                  </label>
                </div>
                <p className="text-xs text-text-muted">AI 自动回答超时的问题</p>

                <AnimatePresence>
                  {aiHostEnabled && aiAvailable && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted">超时时间</span>
                          <StepperInput
                            value={aiHostDelayMinutes}
                            min={1}
                            max={30}
                            suffix="分钟"
                            onChange={(v) => onChange('aiHostDelayMinutes', v)}
                          />
                        </div>
                        <p className="text-xs text-text-muted/70">
                          问题无人回答后 AI 自动接管
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI Hints */}
              <div className={`rounded-lg border border-border p-3 space-y-2 ${!aiAvailable ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-500" />
                    <span className="text-sm font-medium text-text">AI 线索</span>
                  </div>
                  <label className={`relative inline-flex items-center ${aiAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={aiHintEnabled}
                      onChange={(e) => aiAvailable && onChange('aiHintEnabled', e.target.checked)}
                      disabled={!aiAvailable}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer
                                    peer-checked:after:translate-x-full
                                    after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                    after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                                    peer-checked:bg-amber-500 peer-disabled:opacity-50" />
                  </label>
                </div>
                <p className="text-xs text-text-muted">允许玩家向 AI 请求线索</p>

                <AnimatePresence>
                  {aiHintEnabled && aiAvailable && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted">每人线索次数</span>
                          <StepperInput
                            value={aiHintPerPlayer}
                            min={1}
                            max={10}
                            suffix="次"
                            onChange={(v) => onChange('aiHintPerPlayer', v)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
