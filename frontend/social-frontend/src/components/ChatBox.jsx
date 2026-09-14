import { memo } from "react";

const ChatBox = memo(({ message, own, isUnread, isSeen }) => {
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const getFullTimestamp = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const isOnlyEmoji = (str) => {
    if (!str) return false;
    const trimmed = str.trim();
    const regex = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u;
    return regex.test(trimmed) && [...trimmed].length <= 5;
  };

  const emojiOnly = isOnlyEmoji(message.text);

  return (
    <div className={`flex flex-col ${own ? 'items-end' : 'items-start'} mb-1 group`}>
      <div className={`max-w-[80%] md:max-w-[70%] transition-all duration-500 relative ${
        emojiOnly
          ? 'p-1 text-3xl sm:text-4xl bg-transparent shadow-none select-none'
          : `px-4 py-2.5 shadow-sm ${
              own 
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                : isUnread
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 text-zinc-950 dark:text-white border-2 border-blue-500/80 dark:border-blue-400/80 rounded-2xl rounded-tl-none shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700 rounded-2xl rounded-tl-none'
            }`
      }`}>
        {isUnread && !emojiOnly && (
          <span className="absolute -top-2.5 -left-1 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider rounded-full shadow-sm animate-bounce">
            New
          </span>
        )}
        <p className={`${emojiOnly ? 'leading-none' : `text-[14.5px] leading-relaxed break-words whitespace-pre-wrap ${isUnread ? 'font-semibold' : 'font-medium'}`}`}>
          {message.text}
        </p>
      </div>
      <div className="flex items-center gap-1.5 px-2 mt-1 select-none">
        <span 
          title={getFullTimestamp(message.createdAt)}
          className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums"
        >
          {formatTime(message.createdAt)}
        </span>
        {own && isSeen && (
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            Seen
          </span>
        )}
      </div>
    </div>
  );
});

export default ChatBox;
