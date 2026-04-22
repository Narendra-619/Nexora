import { memo } from "react";

const ConversationItem = memo(({ conversation, currentUser, active }) => {
  const otherUser = conversation.participants.find((p) => {
    const pId = p._id?.toString() || p.id?.toString();
    const myId = (currentUser._id || currentUser.id)?.toString();
    return pId !== myId;
  });

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group ${
      active 
      ? 'bg-blue-50 dark:bg-blue-900/10' 
      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
    }`}>
      <div className="relative">
        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-colors ${
          active ? 'border-blue-500' : 'border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-700'
        }`}>
          {otherUser?.profilePicture ? (
            <img src={otherUser.profilePicture} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 bg-blue-50 dark:bg-zinc-900">
              {otherUser?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`font-black truncate text-[15px] ${active ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-200'}`}>
            {otherUser?.username || "Unknown"}
          </h3>
          {conversation.lastMessage && (
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tabular-nums">
              {new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className={`text-xs truncate font-medium ${active ? 'text-blue-500/80 dark:text-blue-400/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {conversation.lastMessage?.text || "Started a new chat"}
        </p>
      </div>
    </div>
  );
});

export default ConversationItem;
