export const REACTION_EMOJIS = [
  // 通用
  '👍', '👎', '❤️', '🔥', '💦', '😀', '😂', '🤣', '😎', '🥳', '🎉',
  // 思考
  '🤔', '💡', '🧠', '👀', '😮', '🫢', '🫵🏻',
  // 情绪
  '😱', '😨', '😭', '🤯', '😈', '😢', '😠',
  // 推理
  '🤗', '🫣', '🤠', '🤮', '💩',
] as const;

export type ReactionEmoji = typeof REACTION_EMOJIS[number];
