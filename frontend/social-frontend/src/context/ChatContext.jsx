import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import API from "../utils/api";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPerConversation, setUnreadPerConversation] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [lastReadReceipt, setLastReadReceipt] = useState(null);
  const [socket, setSocket] = useState(null);
  const [lastIncomingMessage, setLastIncomingMessage] = useState(null);
  const [resetInboxTrigger, setResetInboxTrigger] = useState(0);

  const socketRef = useRef(null);
  const activeChatRef = useRef(activeConversationId);

  useEffect(() => {
    activeChatRef.current = activeConversationId;
  }, [activeConversationId]);

  const resetInbox = useCallback(() => {
    setResetInboxTrigger((prev) => prev + 1);
  }, []);

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
      setSocket(null);
      setUnreadCount(0);
      setUnreadPerConversation({});
      return;
    }

    const rawSocketUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const socketUrl = rawSocketUrl.replace(/\/+$/, "");

    const newSocket = io(socketUrl, {
      auth: { token }
    });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("getMessage", (data) => {
      const myId = (user._id || user.id)?.toString();
      const senderId = (data.senderId || data.sender)?._id || (data.senderId || data.sender);
      if (senderId?.toString() === myId) return;

      const convoIdStr = (data.conversationId?._id || data.conversationId)?.toString();

      setLastIncomingMessage({
        ...data,
        conversationId: convoIdStr,
        senderId: senderId?.toString()
      });

      const isCurrentChat = activeChatRef.current &&
        convoIdStr &&
        activeChatRef.current.toString() === convoIdStr;

      if (isCurrentChat) {
        if (convoIdStr) {
          API.put(`/chats/conversations/${convoIdStr}/read`).catch(console.error);
        }
      } else {
        setUnreadCount((prev) => prev + 1);
        if (convoIdStr) {
          setUnreadPerConversation((prev) => ({
            ...prev,
            [convoIdStr]: (prev[convoIdStr] || 0) + 1
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
      setSocket(null);
    };
  }, [token, user, fetchUnreadCount]);

  const markConversationAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    const convoIdStr = (conversationId?._id || conversationId)?.toString();
    try {
      await API.put(`/chats/conversations/${convoIdStr}/read`);

      setUnreadPerConversation((prev) => {
        const currentConvoUnread = prev[convoIdStr] || 0;
        setUnreadCount((total) => Math.max(0, total - currentConvoUnread));
        return {
          ...prev,
          [convoIdStr]: 0
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
        socket,
        socketRef,
        lastIncomingMessage,
        resetInboxTrigger,
        resetInbox,
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

