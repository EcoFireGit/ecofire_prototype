"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Clipboard, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";

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

interface Task {
  id: string;
  name: string;
  isDone?: boolean;
}

interface Job {
  id: string;
  title: string;
  impactValue?: number;
  tasks?: Task[];
  isDone?: boolean;
}

const WELCOME_MESSAGES = [
  "👋 Welcome back! What can I help you accomplish today?",
  "Hi there! Ready to tackle your top priorities?",
  "Welcome! Ask me anything about your jobs or tasks.",
  "Hello again! What job are we working on today?",
  "Hey! How can I assist you with your current goals?"
];

// Utility to robustly extract JSON array of suggestions from a string (handles code blocks, plain text, etc)
function extractJsonArray(text: string): string[] {
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/im;
  let jsonStr = text;
  const match = text.match(codeBlockRegex);
  if (match) {
    jsonStr = match[1];
  }
  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return jsonStr
    .split("\n")
    .map((s) => s.replace(/^- /, "").replace(/^["']|["']$/g, "").trim())
    .filter(
      (line) =>
        !!line &&
        !/^```/.test(line) &&
        !/^These Image numbers:/i.test(line) &&
        !/may be referenced by subsequent user messages\./i.test(line) &&
        line !== "["
    );
}

export default function Chat() {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [processedMessages, setProcessedMessages] = useState<any[]>([]);
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const suggestionsCallCountRef = useRef(0);

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
    onFinish() {
      setPage(0);
      fetchRecentChats(0);
    },
  });

  // Fetch Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch("/api/jobs");
        if (response.ok) {
          const jobsData = await response.json();
          const jobsArr = Array.isArray(jobsData.data) ? jobsData.data : [];
          setJobs(jobsArr);
        }
      } catch (e) {
        setJobs([]);
      }
    };
    fetchJobs();
  }, []);

  // Prefill input if jobTitle is present
  useEffect(() => {
    if (jobTitle) {
      setInput(`Can you help me with the job "${jobTitle}"?`);
    }
  }, [jobTitle, setInput]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (archiveRef.current && !archiveRef.current.contains(event.target as Node)) {
        setShowArchive(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const processMessages = async () => {
      if (messages.length) {
        const processed = await Promise.all(
          messages.map(async (msg) => {
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
              } catch {
                // ignore
              }
            }
            return msg;
          })
        );
        setProcessedMessages(processed);
      } else {
        setProcessedMessages([]);
      }
    };
    processMessages();
  }, [messages]);

  // Fetch recent chats on mount
  useEffect(() => {
    fetchRecentChats(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // When recentChats is updated, auto-open the last conversation if none is open
  useEffect(() => {
    if (recentChats.length > 0 && !selectedChatId) {
      // Sort by updatedAt descending just in case
      const sorted = [...recentChats].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSelectedChatId(sorted[0].chatId);
      loadChatSession(sorted[0].chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentChats]);

  // Welcome message
  useEffect(() => {
    setWelcomeMessage(
      WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
    );
  }, []);

  // Only include jobs and tasks that are not completed
  function getTopUncompletedJobs(jobs: Job[], count: number = 3): Job[] {
    const filteredJobs = jobs.filter(job => job.isDone !== true);
    const jobsWithUncompletedTasks = filteredJobs.map(job => ({
      ...job,
      tasks: job.tasks
        ? job.tasks.filter(task => task.isDone !== true)
        : [],
    }));
    const validJobs = jobsWithUncompletedTasks.filter(
      job => !job.tasks || job.tasks.length > 0
    );
    return validJobs.sort((a, b) => (b.impactValue || 0) - (a.impactValue || 0)).slice(0, count);
  }

  // Track last assistant response to trigger suggestions after a new answer
  const lastAssistantResponseRef = useRef<string | null>(null);
  // Track last jobs snapshot for proper suggestions on load
  const jobsSnapshotRef = useRef<string>("");

  // Fetch suggestions
  async function fetchAISuggestionsOnce() {
    let contextJobTitles: string[] = [];
    let contextJobTasks: { [jobTitle: string]: string[] } = {};
    let convoContext: string[] = [];
    const topJobs = getTopUncompletedJobs(jobs, 3);

    if (selectedChatId && messages.length > 0) {
      convoContext = messages.slice(-10).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`);
      for (const msg of messages) {
        if (msg.role === "user") {
          topJobs.forEach((job) => {
            if (
              msg.content
                .toLocaleLowerCase()
                .includes(job.title.toLocaleLowerCase())
            ) {
              if (!contextJobTitles.includes(job.title))
                contextJobTitles.push(job.title);
              if (job.tasks) {
                contextJobTasks[job.title] = job.tasks.map((t) => t.name);
              }
            }
          });
        }
      }
      if (contextJobTitles.length === 0) {
        contextJobTitles = topJobs.map((j) => j.title);
        topJobs.forEach((job) => {
          if (job.tasks) contextJobTasks[job.title] = job.tasks.map((t) => t.name);
        });
      }
    } else {
      contextJobTitles = topJobs.map((j) => j.title);
      topJobs.forEach((job) => {
        if (job.tasks) contextJobTasks[job.title] = job.tasks.map((t) => t.name);
      });
      convoContext = [];
    }

    if (contextJobTitles.length === 0) {
      setAiSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    suggestionsCallCountRef.current += 1;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generateSuggestionsForJobs: contextJobTitles.map((title) => ({
            title,
            tasks: contextJobTasks[title] ?? [],
          })),
          conversationContext: convoContext,
        }),
      });
      const data = await response.json();
      let all: string[] = [];
      if (Array.isArray(data.suggestions)) {
        for (const sug of data.suggestions) {
          if (Array.isArray(sug.suggestions)) {
            sug.suggestions.forEach((s: string) => {
              extractJsonArray(s).forEach(str => all.push(str));
            });
          }
          if (all.length >= 3) break;
        }
      }
      setAiSuggestions(all.slice(0, 3));
    } catch {
      setAiSuggestions([]);
    }
    setLoadingSuggestions(false);
  }

  // Always run on jobs load or change (including initial load and jobs update)
  useEffect(() => {
    const jobsString = JSON.stringify(jobs.map(j => ({
      title: j.title,
      completed: j.isDone,
      tasks: j.tasks?.map(t => ({ name: t.name, done: t.isDone }))
    })));
    if (jobsString !== jobsSnapshotRef.current) {
      jobsSnapshotRef.current = jobsString;
      fetchAISuggestionsOnce();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  // Run suggestions after a new assistant response
  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === "assistant");
    const latestAssistantMsg = assistantMessages.length
      ? assistantMessages[assistantMessages.length - 1].content
      : null;
    if (
      status === "ready" &&
      latestAssistantMsg &&
      latestAssistantMsg !== lastAssistantResponseRef.current
    ) {
      fetchAISuggestionsOnce();
      lastAssistantResponseRef.current = latestAssistantMsg;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);

  // Always show suggestions bar, even if no convo is open
  const suggestionsBar = showSuggestions ? (
    <div className="flex flex-wrap gap-2 px-2 py-2 bg-white border-t border-gray-200 justify-center items-center relative"
         style={{ borderRadius: "0 0 0.75rem 0.75rem" }}>
      <button
        onClick={() => setShowSuggestions(false)}
        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="Close suggestions"
      >
        <X size={14} />
      </button>
      {loadingSuggestions && (
        <span className="text-gray-400 text-sm">Loading suggestions...</span>
      )}
      {!loadingSuggestions &&
        aiSuggestions.slice(0, 3).map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            className="transition bg-blue-50 border border-blue-100 text-blue-800 text-xs md:text-sm font-medium px-3 py-1 rounded-full hover:bg-blue-100 hover:border-blue-200 focus:outline-none"
            onClick={() => setInput(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      <span className="ml-4 text-xs text-gray-400 font-mono" title="Suggestions API call count">
      </span>
    </div>
  ) : null;

  const fetchRecentChats = async (pageToFetch = page) => {
    if (!userId) return;
    try {
      const skip = pageToFetch * LIMIT;
      const response = await fetch(`/api/recent-chats?limit=${LIMIT}&skip=${skip}`);
      if (response.ok) {
        const data = await response.json();
        if (pageToFetch === 0) {
          setRecentChats(data.chats);
        } else {
          setRecentChats((prev) => [...prev, ...data.chats]);
        }
        setHasMoreChats(data.hasMore);
      }
    } catch {}
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
            })
          );
          setTimeout(() => {
            setMessages(formattedMessages);
          }, 10);
        }
      }
    } catch {}
  };

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
                            setSelectedChatId(chat.chatId);
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
          {processedMessages.map((m, i) => (
            <div
              key={m.id || i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
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
                      const button = document.getElementById(`copy-btn-${m.id || i}`);
                      if (button) {
                        button.classList.add("text-green-500");
                        setTimeout(() => {
                          button.classList.remove("text-green-500");
                        }, 2000);
                      }
                    }}
                    id={`copy-btn-${m.id || i}`}
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
            <Button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md w-full sm:w-auto"
              onClick={stop}
            >
              Stop
            </Button>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <div className="text-red-500">An error occurred.</div>
            <Button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md w-full sm:w-auto"
              onClick={() => reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* --- Welcome message, suggestions bar, and input at the bottom --- */}
        <div className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-4xl bg-white z-50 shadow-[0_-2px_16px_#0001] rounded-b-2xl px-3 pt-2">
          {welcomeMessage && (
            <div className="w-full pb-1 text-center text-base md:text-lg text-gray-700 font-semibold tracking-tight">
              {welcomeMessage}
            </div>
          )}
          {suggestionsBar}
          <form onSubmit={handleSubmit} className="relative flex items-center pb-2">
            <TextareaAutosize
              className="w-full p-2 border border-gray-300 rounded shadow-xl resize-none pr-10"
              value={input}
              placeholder="Ask Jija something..."
              onChange={handleInputChange}
              disabled={status !== "ready"}
              ref={textareaRef}
              style={{ overflow: "hidden", lineHeight: "28px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
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
              className="absolute right-2 top-2"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}