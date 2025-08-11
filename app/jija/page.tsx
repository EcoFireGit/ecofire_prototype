"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Clipboard, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextareaAutosize from 'react-textarea-autosize';

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

interface ProcessedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  html?: string;
}

export default function Chat() {
  const welcomeMessages = [
    "Welcome! How can I help you today?",
    "Hi there! What would you like to talk about?",
    "Hello! Ask me anything.",
    "Ready when you are. What's on your mind?",
    "Greetings! How can I assist you?",
    "Hey! I'm here to help—what do you need?",
    "Good to see you! How can I support you today?",
    "Hi! Feel free to ask me anything at all.",
    "Need assistance? I'm just a message away!",
    "Let’s get started. What can I do for you?",
    "Hello there! Got questions? I've got answers.",
    "Hi! What brings you here today?",
    "Welcome back! How can I be of service?"
  ];
  
  

  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [showArchive, setShowArchive] = useState(false);
  const archiveRef = useRef<HTMLDivElement>(null);
  const LIMIT = 3;
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "sidepanel";
  const jobId = searchParams.get("jobId") || undefined;
  const taskId = searchParams.get("taskId") || undefined;
  const jobTitle = searchParams.get("jobTitle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasAutoLoadedLatestChat, setHasAutoLoadedLatestChat] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");

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
      setInput(`Can you help me with doing "${jobTitle}?"`);
    }
  }, [jobTitle, setInput]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Close archive dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (archiveRef.current && !archiveRef.current.contains(event.target as Node)) {
        setShowArchive(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [archiveRef]);

  useEffect(() => {
    const processMessages = async () => {
      if (messages.length) {
        const processed = await Promise.all(
          messages.map(async (msg) => {
            // Filter messages to only include user and assistant roles
            if (msg.role === "user" || msg.role === "assistant") {
              if (msg.role === "assistant") {
                try {
                  const response = await fetch("/api/markdown", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ markdown: msg.content }),
                  });

                  if (response.ok) {
                    const { html } = await response.json();
                    return { ...msg, html };
                  }
                } catch (error) {
                  console.error("Error processing markdown:", error);
                }
              }
              return msg;
            }
            return null;
          }),
        );
        // Filter out null values resulted from invalid roles
        setProcessedMessages(
          processed.filter((msg) => msg !== null) as ProcessedMessage[],
        );
      } else {
        setProcessedMessages([]);
      }
    };
    processMessages();
  }, [messages]);

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
      // Clear the current state first for better UX
      setSelectedChatId(chatId);
      setInput("");

      const response = await fetch(`/api/chat-history/${chatId}`);
      if (response.ok) {
        const data = await response.json();

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

          // Use a slight delay to ensure UI updates properly
          setTimeout(() => {
            setMessages(formattedMessages);
          }, 10);
        }
      } else {
        console.error("Failed to fetch chat history:", response.status);
      }
    } catch (error) {
      console.error("Error loading chat session:", error);
    }
  };

  useEffect(() => {
    fetchRecentChats();
  }, [userId]);

  useEffect(() => {
    // Only auto-load if:
    // - We have recent chats
    // - No chat is currently selected
    // - We haven't already auto-loaded
    // - There's no jobTitle parameter (NEW CONDITION)
    if (
      !selectedChatId &&
      recentChats.length > 0 &&
      !hasAutoLoadedLatestChat &&
      !jobTitle  // Don't auto-load if jobTitle is present
    ) {
      const latestChat = recentChats[0]; // Most recent chat is first
      if (latestChat && latestChat.chatId) {
        loadChatSession(latestChat.chatId);
        setHasAutoLoadedLatestChat(true); // Prevent future auto-loads
      }
    }
  }, [recentChats, selectedChatId, hasAutoLoadedLatestChat]);
  


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
    <div className="flex flex-col w-full max-w-4xl pb-48 p-4 sm:p-6 lg:p-10 mx-auto min-h-screen">
      <div className="mb-6 w-full">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-left sm:text-left">
          Jija Assistant
        </h1>
        

        <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-2 sm:gap-3">
          {/* Close Conversation Button - Only visible when a chat is selected */}
          {selectedChatId && (
            <Button
              onClick={() => {
                setSelectedChatId(null);
                setMessages([]);
                setInput("");
              }}
              variant="outline"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm"
            >
              <span>Close Conversation</span>
            </Button>
          )}
          
          {/* Archive Button */}
          {recentChats.length > 0 && (
            <div className="relative w-full sm:w-auto" ref={archiveRef}>
              <Button
                variant="outline"
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm"
                onClick={() => setShowArchive(!showArchive)}
              >
                <Archive size={16} />
                <span className="hidden sm:inline">Recent Conversations</span>
                <span className="sm:hidden">Recent Conversations</span>
              </Button>
              
              {/* Archive Dropdown */}
              {showArchive && (
                <div className="absolute left-0 sm:right-0 mt-2 w-full sm:w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    {recentChats.map((chat) => {
                      const preview = getChatPreview(chat);
                      return (
                        <div
                          key={chat._id}
                          className={`border-b border-gray-100 last:border-0 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedChatId === chat.chatId
                              ? "bg-blue-50"
                              : ""
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            loadChatSession(chat.chatId);
                            setShowArchive(false);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-gray-500">
                              {formatDate(chat.updatedAt)}
                            </span>
                          </div>
                          <div className="mb-1">
                            <span className="font-medium text-sm">You: </span>
                            <span className="text-sm">{preview.userMessage}</span>
                          </div>
                          <div>
                            <span className="font-medium text-sm">Jija: </span>
                            <span className="text-sm">{preview.aiResponse}</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Load More Button */}
                    {hasMoreChats && (
                      <div className="p-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadMoreChats();
                          }}
                          disabled={isLoadingMore}
                          className="w-full py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                        >
                          {isLoadingMore ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current Chat Section */}
      <div className="flex flex-col w-full stretch">
        {/* Chat Messages */}
        <div className="flex flex-col space-y-4">
          {processedMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`whitespace-pre-wrap p-3 rounded-lg relative max-w-[85%] sm:max-w-[80%] ${
                  m.role === "user"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-sm sm:text-base">
                    {m.role === "user" ? "You: " : "Jija: "}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(m.content);
                      // Optional: Add a visual indication that content was copied
                      const button = document.getElementById(`copy-btn-${m.id}`);
                      if (button) {
                        button.classList.add("text-green-500");
                        setTimeout(() => {
                          button.classList.remove("text-green-500");
                        }, 2000);
                      }
                    }}
                    id={`copy-btn-${m.id}`}
                    className="text-blue-500 hover:text-blue-700 hover:bg-gray-100 p-1 rounded flex-shrink-0"
                    title="Copy message"
                  >
                    <Clipboard size={12} className="sm:w-4 sm:h-4" />
                  </button>
                </div>
                <div className="mt-1 text-sm sm:text-base">
                  {m.role === "assistant" && m.html ? (
                    <div
                      className="prose dark:prose-invert max-w-none prose-sm sm:prose-base"
                      dangerouslySetInnerHTML={{ __html: m.html }}
                    />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {(status === "submitted" || status === "streaming") && (
          <div className="mt-4 text-gray-500">
            {status === "submitted" && <div>Loading...</div>}
            <button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md w-full sm:w-auto"
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
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md w-full sm:w-auto"
              onClick={() => reload()}
            >
              Retry
            </button>
          </div>
        )}


        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:relative sm:bottom-auto sm:border-t-0 sm:bg-transparent sm:p-0 sm:mt-8">
          {/* Welcome Text */}
          {selectedChatId === null && (
            <div className="mb-4 text-base sm:text-lg text-gray-700 font-semibold text-center">
              {welcomeText}
            </div>
          )}

          <form
            onSubmit={e => {
              handleSubmit(e, {
                body: {
                  source,
                  jobId,
                  taskId,
                  jobTitle,
                },
              });
            }}
            className="relative flex items-end gap-2 max-w-4xl mx-auto"
          >
            <div className="flex-1 relative">
              <TextareaAutosize
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg shadow-xl resize-none text-sm sm:text-base"
                value={input}
                placeholder="Ask Jija something..."
                onChange={handleInputChange}
                disabled={status !== "ready"}
                ref={textareaRef}
                maxRows={4}
                style={{ overflow: 'hidden', lineHeight: '1.5' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && status === "ready") {
                      handleSubmit(e, {
                        body: {
                          source,
                          jobId,
                          taskId,
                          jobTitle,
                        },
                      });
                    }
                  }
                }}
              />
              <Button
                type="submit"
                disabled={status !== "ready"}
              className="absolute right-2 top-2"
              >
                Send
              </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}