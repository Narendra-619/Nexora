import { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../utils/api";
import { io } from "socket.io-client";
import ConversationItem from "../components/ConversationItem";
import ChatBox from "../components/ChatBox";

export default function Messenger() {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const location = useLocation();
  const socket = useRef();
  const scrollRef = useRef();

  useEffect(() => {
    socket.current = io("http://localhost:3000");
    socket.current.on("getMessage", (data) => {
      setArrivalMessage({
        sender: data.senderId,
        text: data.text,
        createdAt: Date.now(),
      });
    });
    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!arrivalMessage) return;

    // Check if message belongs to current chat
    const isParticipant = (p) => {
      const pId = p._id?.toString() || p.id?.toString() || p.toString();
      const aId = arrivalMessage.sender?.toString();
      return pId === aId;
    };
    
    if (currentChat?.participants.some(isParticipant)) {
      setMessages((prev) => [...prev, arrivalMessage]);
    }

    // Always update conversations list to show last message
    setConversations((prev) => {
      return prev.map(c => {
        if (c.participants.some(isParticipant)) {
          return {
            ...c,
            lastMessage: { text: arrivalMessage.text, sender: arrivalMessage.sender },
            updatedAt: new Date()
          };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  }, [arrivalMessage, currentChat]);

  useEffect(() => {
    if (user) {
      socket.current.emit("addUser", user._id || user.id);
    }
  }, [user]);

  useEffect(() => {
    const getConversations = async () => {
      try {
        const res = await API.get("/chats/conversations");
        setConversations(res.data);
        
        // Handle starting chat from Profile
        if (location.state?.startChatWith) {
          const targetUser = location.state.startChatWith;
          const targetId = targetUser._id?.toString() || targetUser.id?.toString();
          
          const existingConvo = res.data.find(c => 
            c.participants.some(p => (p._id?.toString() || p.id?.toString()) === targetId)
          );
          
          if (existingConvo) {
            setCurrentChat(existingConvo);
          } else {
            // Mock a new conversation object
            setCurrentChat({
              _id: null, // Indicates it's a new conversation
              participants: [user, targetUser],
              isNew: true
            });
          }
        }
      } catch (err) {
        console.log(err);
      }
    };
    getConversations();
  }, [user._id, user.id, location.state]);

  useEffect(() => {
    const getMessages = async () => {
      try {
        const res = await API.get("/chats/messages/" + currentChat?._id);
        setMessages(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    if (currentChat && !currentChat.isNew) getMessages();
    else if (currentChat?.isNew) setMessages([]);
  }, [currentChat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      sender: user._id || user.id,
      text: newMessage,
      conversationId: currentChat._id,
    };

    const receiver = currentChat.participants.find(
      (p) => {
        const pId = p._id?.toString() || p.id?.toString();
        const myId = (user._id || user.id)?.toString();
        return pId !== myId;
      }
    );
    const receiverId = receiver?._id || receiver?.id;

    socket.current.emit("sendMessage", {
      senderId: user._id || user.id,
      receiverId,
      text: newMessage,
    });

    try {
      const res = await API.post("/chats/messages", {
        ...message,
        recipientId: receiverId,
        conversationId: currentChat.isNew ? null : currentChat._id
      });
      
      if (currentChat.isNew) {
        // We need to refresh conversations list to get the real conversation ID
        const convosRes = await API.get("/chats/conversations");
        setConversations(convosRes.data);
        const newConvo = convosRes.data.find(c => 
          c.participants.some(p => (p._id?.toString() || p.id?.toString()) === receiverId?.toString())
        );
        setCurrentChat(newConvo);
      } else {
        setMessages([...messages, res.data]);
        // Update sidebar
        setConversations(prev => prev.map(c => 
          c._id === currentChat._id 
          ? { ...c, lastMessage: res.data, updatedAt: new Date() } 
          : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      }
      setNewMessage("");
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 transition-colors overflow-hidden">
      {/* Conversations List */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-2xl font-black dark:text-white tracking-tight">Messages</h2>
          <div className="w-10 h-10 bg-blue-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-blue-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 113.536 3.536L12 14.036H8v-4z" /></svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {conversations.map((c, index) => (
            <div key={c._id || index} onClick={() => setCurrentChat(c)}>
              <ConversationItem 
                conversation={c} 
                currentUser={user} 
                active={(currentChat?._id === c._id && c._id !== null) || (currentChat?.isNew && !c._id && currentChat.participants.some(p => c.participants.includes(p._id)))}
              />
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-400 font-medium">No active chats</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Box */}
      <div className="hidden md:flex flex-1 flex-col bg-gray-50 dark:bg-gray-950 relative">
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
              {(() => {
                const otherUser = currentChat.participants.find((p) => {
                  const pId = p._id?.toString() || p.id?.toString();
                  const myId = (user._id || user.id)?.toString();
                  return pId !== myId;
                });
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px]">
                        <div className="w-full h-full rounded-full bg-blue-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                          {otherUser?.profilePicture ? (
                            <img src={otherUser.profilePicture} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-blue-600">
                              {otherUser?.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="font-black dark:text-white block leading-tight">{otherUser?.username || "Unknown User"}</span>
                      <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Now</span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && !currentChat.isNew && (
                <div className="flex justify-center items-center h-full">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              {messages.map((m, index) => (
                <div key={m._id || m.createdAt || index} ref={scrollRef} className="fade-in">
                  <ChatBox 
                    message={m} 
                    own={(m.sender?._id || m.sender?.id || m.sender)?.toString() === (user?._id || user?.id)?.toString()} 
                  />
                </div>
              ))}
              {currentChat.isNew && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                   <div className="w-20 h-20 bg-blue-50 dark:bg-gray-900 rounded-3xl flex items-center justify-center text-blue-600 mb-4 rotate-3">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                   </div>
                   <h3 className="text-xl font-black dark:text-white">Say hello!</h3>
                   <p className="text-gray-400 mt-1 max-w-[200px]">Send your first message to start a conversation.</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
              <form onSubmit={handleSubmit} className="flex gap-3 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl items-center">
                <button type="button" className="p-2 text-gray-400 hover:text-blue-500 transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white py-2"
                  placeholder="Message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-blue-50 dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center text-blue-500 mb-6 shadow-inner">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <h3 className="text-2xl font-black dark:text-white tracking-tight">Your Inbox</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-[280px]">Select a conversation to start messaging your friends.</p>
          </div>
        )}
      </div>
    </div>
  );
}
