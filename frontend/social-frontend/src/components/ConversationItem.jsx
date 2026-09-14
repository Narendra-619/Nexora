import { memo } from "react";

const formatConversationTime = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - targetDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
};

const ConversationItem = memo(({ conversation, currentUser, active, unreadCount }) => {
  if (!conversation?.participants) return null;
  const myId = (currentUser?._id || currentUser?.id)?.toString();
  const otherUser = conversation.participants.find((p) => {
    const pId = (p?._id || p?.id || p)?.toString();
    return pId && pId !== myId;
  });

  const timestamp = conversation.lastMessage?.createdAt || conversation.updatedAt;

  const lastSenderId = (conversation.lastMessage?.sender?._id || conversation.lastMessage?.sender)?.toString();
  const isFromOther = lastSenderId && lastSenderId !== myId;
  const hasUnreadLast = isFromOther && conversation.lastMessage?.read === false;

  const count = typeof unreadCount === "number" 
    ? unreadCount 
    : (conversation.unreadCount || (hasUnreadLast ? 1 : 0));

  const isUnread = count > 0;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group relative ${
      active
        ? 'bg-blue-50 dark:bg-blue-900/10'
        : isUnread
          ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/30'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
    }`}>
      <div className="relative">
        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-colors ${
          active 
            ? 'border-blue-500' 
            : isUnread
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-700'
        }`}>
          {otherUser?.profilePicture ? (
            <img src={otherUser.profilePicture} alt={otherUser.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 bg-blue-50 dark:bg-zinc-900">
              {otherUser?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`truncate text-[15px] ${
            active 
              ? 'font-bold text-blue-600 dark:text-blue-400' 
              : isUnread
                ? 'font-black text-zinc-950 dark:text-white'
                : 'font-semibold text-zinc-800 dark:text-zinc-200'
          }`}>
            {otherUser?.username || "Unknown"}
          </h3>
          {timestamp && !isNaN(new Date(timestamp).getTime()) && (
            <span className={`text-[10px] tabular-nums ${
              isUnread 
                ? 'font-bold text-blue-600 dark:text-blue-400' 
                : 'font-medium text-zinc-400 dark:text-zinc-500'
            }`}>
              {formatConversationTime(timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${
            active 
              ? 'text-blue-500/80 dark:text-blue-400/80 font-medium' 
              : isUnread
                ? 'font-bold text-zinc-950 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 font-normal'
          }`}>
            {conversation.lastMessage?.text || "Started a new chat"}
          </p>
          {isUnread && (
            <span className="shrink-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default ConversationItem;
