import { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../utils/api";
import { io } from "socket.io-client";
import ConversationItem from "../components/ConversationItem";
import ChatBox from "../components/ChatBox";
import EmojiPicker from "../components/EmojiPicker";

function formatDateSeparator(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - msgDay) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function shouldShowDateSeparator(messages, index) {
  if (index === 0) return true;
  const curr = new Date(messages[index].createdAt);
  const prev = new Date(messages[index - 1].createdAt);
  return curr.toDateString() !== prev.toDateString();
}

export default function Messenger() {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const location = useLocation();
  const socket = useRef();
  const conversationsRef = useRef([]);
  const messagesEndRef = useRef();
  const messagesContainerRef = useRef();
  const messageInputRef = useRef();
  const searchTimeout = useRef();
  const currentChatRef = useRef(currentChat);

  useEffect(() => {
    currentChatRef.current = currentChat;
    setShowEmojiPicker(false);
  }, [currentChat]);

  useEffect(() => {
    const rawSocketUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const socketUrl = rawSocketUrl.replace(/\/+$/, "");
    const token = localStorage.getItem("token");
    socket.current = io(socketUrl, {
      auth: { token }
    });
    socket.current.on("getMessage", (data) => {
      setArrivalMessage({
        sender: data.senderId,
        text: data.text,
        createdAt: data.createdAt || Date.now(),
        _id: data._id,
        conversationId: data.conversationId,
      });
    });
    socket.current.on("getUsers", (users) => {
      setOnlineUsers(users.map(u => u.userId));
    });
    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!arrivalMessage) return;

    const isParticipant = (p) => {
      const pId = (p?._id || p?.id || p)?.toString();
      const aId = (arrivalMessage.sender?._id || arrivalMessage.sender?.id || arrivalMessage.sender)?.toString();
      return pId && aId && pId === aId;
    };
    
    if (currentChatRef.current?.participants?.some(isParticipant)) {
      setMessages((prev) => {
        if (arrivalMessage._id && prev.some((m) => m._id && m._id.toString() === arrivalMessage._id.toString())) {
          return prev;
        }
        return [...prev, arrivalMessage];
      });
    }

    setConversations((prev) => {
      const exists = prev.some(c => c.participants?.some(isParticipant));
      if (!exists) {
        API.get("/chats/conversations").then((res) => {
          setConversations(res.data);
          conversationsRef.current = res.data;
        }).catch(console.error);
        return prev;
      }
      const updated = prev.map(c => {
        if (c.participants?.some(isParticipant)) {
          return {
            ...c,
            lastMessage: { 
              text: arrivalMessage.text, 
              sender: arrivalMessage.sender,
              createdAt: arrivalMessage.createdAt || new Date()
            },
            updatedAt: arrivalMessage.createdAt || new Date()
          };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      conversationsRef.current = updated;
      return updated;
    });
  }, [arrivalMessage]);

  useEffect(() => {
    // Server identifies user from JWT token, no need to emit addUser
  }, [user]);

  useEffect(() => {
    const getConversations = async () => {
      try {
        const res = await API.get("/chats/conversations");
        setConversations(res.data);
        conversationsRef.current = res.data;
        
        if (location.state?.startChatWith) {
          const targetUser = location.state.startChatWith;
          const targetId = (targetUser._id || targetUser.id)?.toString();
          const myId = (user?._id || user?.id)?.toString();
          
          const existingConvo = res.data.find(c => 
            c.participants?.some(p => (p?._id || p?.id || p)?.toString() === targetId)
          );
          
          if (existingConvo) {
            setCurrentChat(existingConvo);
            setShowChat(true);
          } else {
            setCurrentChat({
              _id: null,
              participants: [
                { _id: myId, id: myId, username: user?.username },
                { _id: targetId, id: targetId, username: targetUser.username, profilePicture: targetUser.profilePicture }
              ],
              isNew: true
            });
            setShowChat(true);
          }
        }
      } catch (err) {
        console.log(err);
      }
    };
    getConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id || user?.id, location.state]);

  useEffect(() => {
    const getMessages = async () => {
      setMessagesLoading(true);
      try {
        const res = await API.get("/chats/messages/" + currentChat?._id);
        setMessages(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setMessagesLoading(false);
      }
    };
    if (currentChat && !currentChat.isNew) getMessages();
    else if (currentChat?.isNew) {
      setMessages([]);
      setMessagesLoading(false);
    }
  }, [currentChat]);

  // M14: Clear search timeout on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => clearTimeout(searchTimeout.current);
  }, []);

  useEffect(() => {
    if (showNewChat) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [showNewChat]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await API.get(`/users/search?q=${encodeURIComponent(query)}`);
        const myId = (user._id || user.id)?.toString();
        setSearchResults(res.data.filter(u => (u._id?.toString() || u.id?.toString()) !== myId));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleStartChat = (targetUser) => {
    const targetId = (targetUser._id || targetUser.id)?.toString();
    const myId = (user?._id || user?.id)?.toString();
    const existingConvo = conversationsRef.current.find(c => 
      c.participants?.some(p => (p?._id || p?.id || p)?.toString() === targetId)
    );
    
    if (existingConvo) {
      setCurrentChat(existingConvo);
    } else {
      setCurrentChat({
        _id: null,
        participants: [
          { _id: myId, id: myId, username: user?.username },
          { _id: targetId, id: targetId, username: targetUser.username, profilePicture: targetUser.profilePicture }
        ],
        isNew: true
      });
    }
    setShowNewChat(false);
    setShowChat(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    const myId = (user?._id || user?.id)?.toString();
    if (!myId || !currentChat) return;

    const receiver = currentChat.participants?.find(
      (p) => {
        const pId = (p?._id || p?.id || p)?.toString();
        return pId && pId !== myId;
      }
    );
    const receiverId = (receiver?._id || receiver?.id || receiver)?.toString();

    if (!receiverId && !currentChat._id) {
      console.error("Cannot determine recipient ID");
      return;
    }

    setSending(true);
    try {
      const res = await API.post("/chats/messages", {
        text: trimmed,
        recipientId: receiverId,
        conversationId: currentChat.isNew ? null : currentChat._id
      });

      const savedMessage = res.data;

      // Add to messages UI immediately
      setMessages(prev => [...prev, savedMessage]);
      setNewMessage("");
      setShowEmojiPicker(false);

      if (currentChat.isNew) {
        const convosRes = await API.get("/chats/conversations");
        setConversations(convosRes.data);
        conversationsRef.current = convosRes.data;
        const newConvo = convosRes.data.find(c => 
          c._id?.toString() === savedMessage.conversationId?.toString()
        ) || convosRes.data.find(c => 
          c.participants?.some(p => (p?._id || p?.id || p)?.toString() === receiverId)
        );
        if (newConvo) {
          setCurrentChat(newConvo);
        } else {
          setCurrentChat(prev => ({ ...prev, _id: savedMessage.conversationId, isNew: false }));
        }
      } else {
        setConversations(prev => {
          const updated = prev.map(c => 
            c._id === currentChat._id 
            ? { 
                ...c, 
                lastMessage: { 
                  text: savedMessage.text, 
                  sender: savedMessage.sender,
                  createdAt: savedMessage.createdAt || new Date()
                }, 
                updatedAt: savedMessage.createdAt || new Date() 
              } 
            : c
          ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          conversationsRef.current = updated;
          return updated;
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (convo) => {
    setCurrentChat(convo);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getOtherUser = (convo) => {
    if (!convo?.participants) return null;
    const myId = (user?._id || user?.id)?.toString();
    return convo.participants.find((p) => {
      const pId = (p?._id || p?.id || p)?.toString();
      return pId && pId !== myId;
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-zinc-50 dark:bg-black transition-colors overflow-hidden">
      {/* Conversations List */}
      <div className={`${showChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 border-r border-zinc-200 dark:border-zinc-800 flex-col bg-white dark:bg-zinc-900`}>
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-white">Messages</h2>
          <button 
            onClick={() => setShowNewChat(true)}
            className="w-9 h-9 bg-blue-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-100 dark:hover:bg-zinc-700 transition-colors"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {conversations.map((c, index) => (
            <div key={c._id || index} onClick={() => handleSelectConversation(c)}>
              <ConversationItem 
                conversation={c} 
                currentUser={user} 
                active={(currentChat?._id === c._id && c._id !== null) || (currentChat?.isNew && !c._id && currentChat.participants.some(p => c.participants.some(cp => (cp._id || cp.id || cp).toString() === (p._id || p.id || p).toString())))}
              />
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No conversations yet</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Start a new chat below</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Box */}
      <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-zinc-50 dark:bg-black relative`}>
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="md:hidden p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mr-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                {(() => {
                  const otherUser = getOtherUser(currentChat);
                  const isOnline = onlineUsers.includes(otherUser?._id?.toString());
                  return (
                    <>
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 p-[2px]">
                            <div className="w-full h-full rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                              {otherUser?.profilePicture ? (
                                <img src={otherUser.profilePicture} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-semibold text-blue-600 text-sm">
                                  {otherUser?.username?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold dark:text-white text-sm block leading-tight">{otherUser?.username || "Unknown User"}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">{isOnline ? "Online" : "Offline"}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative"
            >
              {messagesLoading && !currentChat.isNew && (
                <div className="flex justify-center items-center h-full">
                   <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-blue-600"></div>
                </div>
              )}
              {!messagesLoading && messages.length === 0 && !currentChat.isNew && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                   <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mb-3">
                     <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                   </div>
                   <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">No messages in this chat yet.</p>
                   <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">Send a message to get started!</p>
                </div>
              )}
              {messages.map((m, index) => (
                <div key={m._id || m.createdAt || index}>
                  {shouldShowDateSeparator(messages, index) && (
                    <div className="flex items-center justify-center my-4">
                      <div className="px-3 py-1 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          {formatDateSeparator(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={index === messages.length - 1 ? messagesEndRef : null} className="fade-in">
                    <ChatBox 
                      message={m} 
                      own={(m.sender?._id || m.sender?.id || m.sender)?.toString() === (user?._id || user?.id)?.toString()} 
                    />
                  </div>
                </div>
              ))}
              {currentChat.isNew && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                   <div className="w-16 h-16 bg-blue-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                   </div>
                   <h3 className="text-lg font-bold dark:text-white">Say hello!</h3>
                   <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm max-w-[200px]">Send your first message to start chatting.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 right-6 w-10 h-10 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </button>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 relative">
              {showEmojiPicker && (
                <EmojiPicker
                  onSelectEmoji={(emoji) => {
                    setNewMessage((prev) => prev + emoji);
                    if (messageInputRef.current) messageInputRef.current.focus();
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
              <form onSubmit={handleSubmit} className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2 rounded-xl transition-all ${
                    showEmojiPicker
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                  }`}
                  title="Choose emoji"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <input
                  ref={messageInputRef}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white py-2 px-2 outline-none"
                  placeholder="Message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center min-w-[40px] min-h-[40px]"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center text-zinc-400 mb-6">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <h3 className="text-xl font-bold dark:text-white">Your Inbox</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm max-w-[280px]">Select a conversation or start a new chat.</p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl fade-in">
          <div className="card w-full max-w-md p-6 shadow-2xl relative border-zinc-200 dark:border-zinc-800 animate-modal-pop">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-zinc-900 dark:text-white">New Message</h3>
              <button onClick={() => setShowNewChat(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                className="input-field pl-10 w-full"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {searching && (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-28" />
                        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-md w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!searching && searchQuery && searchResults.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">No users found</p>
                </div>
              )}
              {!searching && searchResults.map(u => (
                <button
                  key={u._id}
                  onClick={() => handleStartChat(u)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-semibold text-blue-600 text-sm">
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-white text-sm">{u.username}</span>
                </button>
              ))}
              {!searchQuery && (
                <div className="py-8 text-center">
                  <p className="text-zinc-400 dark:text-zinc-500 text-sm">Type a name to search</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
