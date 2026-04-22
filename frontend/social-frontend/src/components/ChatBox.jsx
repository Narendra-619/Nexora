import { memo } from "react";

const ChatBox = memo(({ message, own }) => {
  return (
    <div className={`flex flex-col ${own ? 'items-end' : 'items-start'} mb-1`}>
      <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 shadow-sm transition-all duration-200 ${
        own 
        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
        : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700 rounded-2xl rounded-tl-none'
      }`}>
        <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap font-medium">
          {message.text}
        </p>
      </div>
      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mt-1 opacity-70">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
});

export default ChatBox;
