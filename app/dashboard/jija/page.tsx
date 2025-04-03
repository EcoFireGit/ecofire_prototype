"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

interface ChatSession {
  _id: string;
  userId: string;
  chatId: string;
  messages: {
    role: "user" | "assistant";
    content: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface ChatResponse {
  chats: ChatSession[];
  total: number;
  hasMore: boolean;
}

export default function Chat() {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const LIMIT = 3;
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const jobTitle = searchParams.get("jobTitle");

  const {
    error,
    input,
    status,
    handleInputChange,
    handleSubmit,
    messages,
    reload,
    stop,
    setMessages,
    setInput,
  } = useChat({
    id: selectedChatId || undefined,
    onFinish(message, { usage, finishReason }) {
      console.log("Usage", usage);
      console.log("FinishReason", finishReason);
      // Reset pagination and fetch fresh chats
      setPage(0);
      fetchRecentChats(0);
    },
  });

  // Set prefilled input when jobTitle is present
  useEffect(() => {
    if (jobTitle) {
      setInput(`Can you help me with how to do the job "${jobTitle}?"`);
    }
  }, [jobTitle, setInput]);

  const fetchRecentChats = async (pageToFetch = page) => {
    if (!userId) return;

    try {
      const skip = pageToFetch * LIMIT;
      const response = await fetch(
        `/api/recent-chats?limit=${LIMIT}&skip=${skip}`,
      );

      if (response.ok) {
        const data = (await response.json()) as ChatResponse;

        if (pageToFetch === 0) {
          // First page - replace current chats
          setRecentChats(data.chats);
        } else {
          // Additional pages - append to current chats
          setRecentChats((prev) => [...prev, ...data.chats]);
        }

        setHasMoreChats(data.hasMore);
      }
    } catch (error) {
      console.error("Error fetching recent chats:", error);
    }
  };

  const loadMoreChats = async () => {
    if (isLoadingMore || !hasMoreChats) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchRecentChats(nextPage);
    setIsLoadingMore(false);
  };

  const loadChatSession = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat-history/${chatId}`);
      if (response.ok) {
        const data = await response.json();

        // Set the selected chat ID
        setSelectedChatId(chatId);

        // Set the chat messages to continue the conversation
        if (data && data.messages && data.messages.length > 0) {
          // Create messages in the format expected by useChat
          const formattedMessages = data.messages.map(
            (msg: any, index: number) => ({
              id: `msg-${index}`,
              role: msg.role,
              content: msg.content,
            }),
          );

          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error("Error loading chat session:", error);
    }
  };

  useEffect(() => {
    fetchRecentChats();
  }, [userId]);

  // Get a preview of the conversation (first user message and assistant response)
  const getChatPreview = (chat: ChatSession) => {
    const userMessage =
      chat.messages.find((m) => m.role === "user")?.content || "No message";
    const aiResponse =
      chat.messages.find((m) => m.role === "assistant")?.content ||
      "No response";

    return {
      userMessage:
        userMessage.length > 60
          ? `${userMessage.substring(0, 60)}...`
          : userMessage,
      aiResponse:
        aiResponse.length > 60
          ? `${aiResponse.substring(0, 60)}...`
          : aiResponse,
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex flex-col w-full max-w-4xl pb-48 py-24 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Jija Assistant</h1>

      {/* Recent Chats Section */}
      {recentChats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
          <div className="grid grid-cols-1 gap-4">
            {recentChats.map((chat) => {
              const preview = getChatPreview(chat);
              return (
                <div
                  key={chat._id}
                  className={`border rounded-lg p-4 shadow-sm cursor-pointer transition-colors ${
                    selectedChatId === chat.chatId
                      ? "bg-blue-50 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => loadChatSession(chat.chatId)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(chat.updatedAt)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">You: </span>
                    <span>{preview.userMessage}</span>
                  </div>
                  <div>
                    <span className="font-medium">Jija: </span>
                    <span>{preview.aiResponse}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMoreChats && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMoreChats}
                disabled={isLoadingMore}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
              >
                {isLoadingMore ? "Loading..." : "Load More Conversations"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Chat Section */}
      <div className="flex flex-col w-full stretch">
        {messages.map((m) => (
          <div
            key={m.id}
            className="whitespace-pre-wrap mb-4 p-3 rounded-lg bg-gray-50"
          >
            <span className="font-medium">
              {m.role === "user" ? "You: " : "Jija: "}
            </span>
            {m.content}
          </div>
        ))}

        {(status === "submitted" || status === "streaming") && (
          <div className="mt-4 text-gray-500">
            {status === "submitted" && <div>Loading...</div>}
            <button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
              onClick={stop}
            >
              Stop
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <div className="text-red-500">An error occurred.</div>
            <button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
              onClick={() => reload()}
            >
              Retry
            </button>
          </div>
        )}

        <div className="fixed bottom-0 w-full max-w-4xl mb-8">
          <form onSubmit={handleSubmit}>
            <input
              className="w-full p-2 border border-gray-300 rounded shadow-xl"
              value={input}
              placeholder="Ask Jija something..."
              onChange={handleInputChange}
              disabled={status !== "ready"}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
