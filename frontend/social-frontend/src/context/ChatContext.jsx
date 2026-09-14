import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import API from "../utils/api";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPerConversation, setUnreadPerConversation] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [lastReadReceipt, setLastReadReceipt] = useState(null);

  const socketRef = useRef(null);
  const activeChatRef = useRef(activeConversationId);

  useEffect(() => {
    activeChatRef.current = activeConversationId;
  }, [activeConversationId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || !user) {
      setUnreadCount(0);
      setUnreadPerConversation({});
      return;
    }
    try {
      const res = await API.get("/chats/unread-count");
      setUnreadCount(res.data.totalUnread || 0);
      setUnreadPerConversation(res.data.unreadPerConversation || {});
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [token, user]);

  // Establish shared Socket.io connection when authenticated
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setUnreadCount(0);
      setUnreadPerConversation({});
      setOnlineUsers([]);
      return;
    }

    const rawSocketUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const socketUrl = rawSocketUrl.replace(/\/+$/, "");

    const newSocket = io(socketUrl, {
      auth: { token }
    });
    socketRef.current = newSocket;

    newSocket.on("getUsers", (users) => {
      setOnlineUsers(users.map((u) => u.userId));
    });

    newSocket.on("getMessage", (data) => {
      const myId = (user._id || user.id)?.toString();
      const senderId = (data.senderId || data.sender)?._id || (data.senderId || data.sender);
      if (senderId?.toString() === myId) return;

      const isCurrentChat = activeChatRef.current && 
        data.conversationId && 
        activeChatRef.current.toString() === data.conversationId.toString();

      if (isCurrentChat) {
        // Automatically mark as read if currently open in view
        API.put(`/chats/conversations/${data.conversationId}/read`).catch(console.error);
      } else {
        // Increment pending counts
        setUnreadCount((prev) => prev + 1);
        if (data.conversationId) {
          setUnreadPerConversation((prev) => ({
            ...prev,
            [data.conversationId]: (prev[data.conversationId] || 0) + 1
          }));
        }
      }
    });

    newSocket.on("messagesRead", (data) => {
      setLastReadReceipt(data);
    });

    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, fetchUnreadCount]);

  const markConversationAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      await API.put(`/chats/conversations/${conversationId}/read`);
      
      setUnreadPerConversation((prev) => {
        const currentConvoUnread = prev[conversationId] || 0;
        setUnreadCount((total) => Math.max(0, total - currentConvoUnread));
        return {
          ...prev,
          [conversationId]: 0
        };
      });
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        unreadPerConversation,
        onlineUsers,
        socket: socketRef.current,
        socketRef,
        activeConversationId,
        setActiveConversationId,
        markConversationAsRead,
        fetchUnreadCount,
        lastReadReceipt
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
