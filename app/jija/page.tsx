"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Clipboard, Archive, Sparkles } from "lucide-react";
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

// Utility to shuffle an array in place
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  const [processedMessages, setProcessedMessages] = useState<ProcessedMessage[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const archiveRef = useRef<HTMLDivElement>(null);
  const LIMIT = 3;
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const jobTitle = searchParams.get("jobTitle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasAutoLoadedLatestChat, setHasAutoLoadedLatestChat] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");
  const [recommendedPrompts, setRecommendedPrompts] = useState<string[]>([]);

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
      setPage(0);
      fetchRecentChats(0);
    },
  });

  // Set initial welcome text
  useEffect(() => {
    setWelcomeText(
      welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
    );
  }, []);

  // Generate and shuffle recommended prompts based on chat content.
  // Triggered when a chat is loaded or closed (selectedChatId changes).
  useEffect(() => {
    const getPromptsForChat = () => {
      // If user is searching for a job
      if (jobTitle) {
        return [
          `What are the most important skills for a "${jobTitle}"?`,
          `Can you help me prepare for a "${jobTitle}" interview?`,
          `Show me recent trends in the "${jobTitle}" field.`,
          `What are good certifications for a "${jobTitle}"?`,
          `Suggest some projects to build as a "${jobTitle}".`,
        ];
      } else if (selectedChatId && processedMessages.length > 0) {
        // Use the last user and assistant messages for context
        const lastUserMsg = [...processedMessages].reverse().find(m => m.role === "user")?.content;
        const lastAssistantMsg = [...processedMessages].reverse().find(m => m.role === "assistant")?.content;
        return [
          lastUserMsg ? `Can you expand on: "${lastUserMsg.slice(0, 40)}..."?` : "Can you elaborate on my last question?",
          "What should I ask next based on this conversation?",
          lastAssistantMsg ? `Summarize your last answer: "${lastAssistantMsg.slice(0, 40)}..."` : "Summarize the main points from our conversation.",
          "Give me a list of follow-up questions.",
          "What should be my next action based on this chat?"
        ];
      } else if (recentChats.length > 0) {
        // Suggest follow-up based on last chat
        const lastChat = recentChats[0];
        const lastUserMsg = lastChat.messages.find(m => m.role === "user")?.content;
        return [
          lastUserMsg ? `Can you expand on: "${lastUserMsg.slice(0, 40)}..."?` : "Can you elaborate on my last question?",
          "What should I ask next based on my previous chat?",
          "Summarize the main points from my last conversation.",
          "What did I talk about in my last session?",
          "How can I continue from my last chat?"
        ];
      } else if (userId) {
        // General personalized prompts
        return [
          "What are the best productivity tips for me?",
          "How can I improve my technical skills?",
          "Suggest some learning resources for my career growth.",
          "How do I set effective goals?",
          "What are some good daily habits?"
        ];
      } else {
        // Generic fallback
        return [
          "What can you help me with today?",
          "Give me tips to get started.",
          "How does this assistant work?",
          "Show me some example questions.",
          "What topics can I ask you about?"
        ];
      }
    };

    // Pick 3 shuffled prompts
    const prompts = getPromptsForChat();
    setRecommendedPrompts(shuffleArray(prompts).slice(0, 3));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, processedMessages.length, recentChats.length, jobTitle, userId]);

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [archiveRef]);

  useEffect(() => {
    const processMessages = async () => {
      if (messages.length) {
        const processed = await Promise.all(
          messages.map(async (msg) => {
            if (msg.role === "user" || msg.role === "assistant") {
              if (msg.role === "assistant") {
                try {
                  const response = await fetch("/api/markdown", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
          setRecentChats(data.chats);
        } else {
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
      setSelectedChatId(chatId);
      setInput("");
      const response = await fetch(`/api/chat-history/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map(
            (msg: any, index: number) => ({
              id: `msg-${index}`,
              role: msg.role,
              content: msg.content,
            }),
          );
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

  useEffect(() => { fetchRecentChats(); }, [userId]);

  useEffect(() => {
    if (
      !selectedChatId &&
      recentChats.length > 0 &&
      !hasAutoLoadedLatestChat &&
      !jobTitle
    ) {
      const latestChat = recentChats[0];
      if (latestChat && latestChat.chatId) {
        loadChatSession(latestChat.chatId);
        setHasAutoLoadedLatestChat(true);
      }
    }
  }, [recentChats, selectedChatId, hasAutoLoadedLatestChat]);

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
    <div className="flex flex-col w-full max-w-4xl pb-48 p-10 mx-auto">
      {/* Header - Fixed at the top */}
      <div className="flex justify-between items-center mb-6 w-full">
        <h1 className="text-2xl font-bold">Jija Assistant</h1>
        <div className="flex items-center gap-2">
          {selectedChatId && (
            <Button
              onClick={() => {
                setSelectedChatId(null);
                setMessages([]);
                setInput("");
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <span>Close Conversation</span>
            </Button>
          )}
          {recentChats.length > 0 && (
            <div className="relative" ref={archiveRef}>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowArchive(!showArchive)}
              >
                <Archive size={18} />
                <span>Recent Conversations</span>
              </Button>
              {showArchive && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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
                className={`whitespace-pre-wrap p-3 rounded-lg relative max-w-[80%] ${
                  m.role === "user"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium">
                    {m.role === "user" ? "You: " : "Jija: "}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(m.content);
                      const button = document.getElementById(`copy-btn-${m.id}`);
                      if (button) {
                        button.classList.add("text-green-500");
                        setTimeout(() => {
                          button.classList.remove("text-green-500");
                        }, 2000);
                      }
                    }}
                    id={`copy-btn-${m.id}`}
                    className="text-blue-500 hover:text-blue-700 hover:bg-gray-100 p-1 rounded"
                    title="Copy message"
                  >
                    <Clipboard size={14} />
                  </button>
                </div>
                <div className="mt-1">
                  {m.role === "assistant" && m.html ? (
                    <div
                      className="prose dark:prose-invert max-w-none"
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

          {selectedChatId === null && (
            <div className="mb-2 text-lg text-gray-700 font-semibold text-center">
              {welcomeText}
            </div>
          )}

          {/* Recommended prompts */}
          {recommendedPrompts.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {recommendedPrompts.map((prompt, idx) => (
                <button
                  key={prompt}
                  type="button"
                  className="flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={() => {
                    setInput(prompt);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                >
                  <Sparkles size={16} className="text-blue-500" />
                  <span className="text-sm">{prompt}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <TextareaAutosize
              className="w-full p-2 border border-gray-300 rounded shadow-xl resize-none pr-10"
              value={input}
              placeholder="Ask Jija something..."
              onChange={handleInputChange}
              disabled={status !== "ready"}
              ref={textareaRef}
              style={{ overflow: 'hidden', lineHeight: '28px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && status === "ready") {
                    handleSubmit(e);
                  }
                }
              }}
            />
            <Button
              type="submit"
              disabled={status !== "ready"}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}