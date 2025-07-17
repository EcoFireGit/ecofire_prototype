"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Bold, Italic, Strikethrough, List, ListOrdered, Redo2, Undo2, Heading, ChevronLeft, ChevronRight, Underline as UnderlineIcon, Search } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";

export default function NotebookPage() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectionState, setSelectionState] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchNotes = async () => {
    setLoading(true);
    const res = await fetch("/api/notes");
    const data = await res.json();
    if (data.success) setNotes(data.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => setSelectionState(s => s + 1);
    editor.on('selectionUpdate', update);
    return () => { editor.off('selectionUpdate', update); };
  }, [editor]);

  const lastLoadedId = React.useRef<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    if (selectedId === null) {
      setTitle("");
      setContent("");
      editor.commands.setContent("");
      setCreating(true);
      lastLoadedId.current = null;
    } else if (lastLoadedId.current !== selectedId) {
      const note = notes.find((n: any) => n._id === selectedId);
      setTitle(note?.title || "");
      setContent(note?.content || "");
      editor.commands.setContent(note?.content || "");
      setCreating(false);
      lastLoadedId.current = selectedId;
    }
  }, [selectedId, notes, editor]);

  useEffect(() => {
    if (!creating && selectedId) {
      setSaving(true);
      const timeout = setTimeout(async () => {
        await fetch(`/api/notes/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        setSaving(false);
        fetchNotes();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [title, content, selectedId, creating]);

  const handleCreate = async () => {
    if (!title && !content) return;
    setSaving(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSaving(false);
    if (res.ok) {
      fetchNotes();
      setTitle("");
      setContent("");
      editor?.commands.setContent("");
      setSelectedId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this note? This cannot be undone.")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    fetchNotes();
    setSelectedId(null);
  };

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-6 gap-2">
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white shadow hover:bg-gray-100 transition-colors mr-2"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Close notes list' : 'Open notes list'}
          style={{ fontSize: 0 }}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </button>
        <h1 className="text-2xl font-bold">My Notebook</h1>
      </div>
      <div className="flex h-[80vh] border rounded overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={
            `w-64 border-r bg-gray-50 flex flex-col z-20 transition-transform duration-200
            md:relative md:translate-x-0
            fixed top-0 left-0 h-screen md:h-[80vh] md:max-h-[80vh]
            ${sidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
            md:block`
          }
          style={{}}
        >
          <Button
            variant="ghost"
            className="flex items-center justify-center my-2"
            onClick={() => setSelectedId(null)}
          >
            <Plus className="mr-2 h-4 w-4" /> New Note
          </Button>
          <div className="px-3 pb-2">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Notes..."
                className="border rounded pl-8 pr-2 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ minWidth: 0 }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto h-full">
            <ul className="space-y-1">
              {notes
                .filter((note: any) => {
                  const html = note.content || '';
                  let plain = html.replace(/<[^>]+>/g, '').trim();
                  plain = plain.replace(/&nbsp;/g, ' ')
                               .replace(/&amp;/g, '&')
                               .replace(/&lt;/g, '<')
                               .replace(/&gt;/g, '>')
                               .replace(/&quot;/g, '"')
                               .replace(/&#39;/g, "'");
                  const searchLower = search.toLowerCase();
                  return (
                    note.title?.toLowerCase().includes(searchLower) ||
                    plain.toLowerCase().includes(searchLower)
                  );
                })
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((note: any) => (
                  <li key={note._id} className="group">
                    <div
                      className={`rounded transition ${selectedId === note._id ? "bg-gray-200 font-bold" : ""} group-hover:bg-gray-200 group-hover:font-bold"}`}
                      onClick={() => setSelectedId(note._id)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex w-full items-center justify-between text-left px-4 py-2 rounded-t">
                        <span className="truncate flex-1">
                          {(() => {
                            const html = note.content || '';
                            let plain = html.replace(/<[^>]+>/g, '').trim();
                            plain = plain.replace(/&nbsp;/g, ' ')
                                         .replace(/&amp;/g, '&')
                                         .replace(/&lt;/g, '<')
                                         .replace(/&gt;/g, '>')
                                         .replace(/&quot;/g, '"')
                                         .replace(/&#39;/g, "'");
                            if (!note.title && !plain) return <span className="italic text-gray-400">Untitled</span>;
                            if (!note.title) return <span className="italic text-gray-400">Untitled</span>;
                            return note.title;
                          })()}
                        </span>
                        {selectedId === note._id && (
                          <Trash2
                            className="ml-2 w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer flex-shrink-0"
                            onClick={e => { e.stopPropagation(); handleDelete(note._id); }}
                          />
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate px-4 pb-1 w-full rounded-b">
                        {(() => {
                          const html = note.content || '';
                          let plain = html.replace(/<[^>]+>/g, '').trim();
                          plain = plain.replace(/&nbsp;/g, ' ')
                                       .replace(/&amp;/g, '&')
                                       .replace(/&lt;/g, '<')
                                       .replace(/&gt;/g, '>')
                                       .replace(/&quot;/g, '"')
                                       .replace(/&#39;/g, "'");
                          if (!plain) return <span className="italic text-gray-300">No content</span>;
                          return plain.length > 30 ? plain.slice(0, 30) + '...' : plain;
                        })()}
                        <br />
                        <span className="text-[10px] text-gray-300 block mt-0.5">
                          {note.createdAt ? new Date(note.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <div className="h-px w-1/2 bg-gray-200 opacity-60 my-1 rounded-full"></div>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
            <div className="min-h-32" />
          </div>
        </div>
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close notes list"
          />
        )}
        {/* Main area */}
        <div className="flex-1 p-6 flex flex-col z-0">
          <div className="flex items-center mb-4 gap-2">
            <input
              className="w-full border rounded px-3 py-2 text-lg font-semibold"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <div className="flex gap-2">
              {!creating && selectedId && (
                <Button
                  type="button"
                  className="px-3 py-2"
                  onClick={() => handleDelete(selectedId)}
                >
                  Delete Note
                </Button>
              )}
              {creating && (title || content) && (
                <>
                  <Button onClick={handleCreate} disabled={saving}>
                    Save Note
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="ml-2 px-2 py-2 text-gray-500 hover:text-red-600"
                    title="Clear note"
                    onClick={() => {
                      setTitle("");
                      setContent("");
                      editor?.commands.setContent("");
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Rich text toolbar */}
          {editor && (
            <TooltipProvider>
              <div key={selectionState} className="flex gap-1 mb-3 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1 items-center sticky top-0 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`rounded p-1 transition ${editor.isActive('bold') ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                      aria-label="Bold"
                    >
                      <Bold className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Bold</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`rounded p-1 transition ${editor.isActive('italic') ? 'bg-gray-200 text-black italic' : 'hover:bg-gray-100 text-gray-600'}`}
                      aria-label="Italic"
                    >
                      <Italic className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Italic</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`rounded p-1 transition ${editor.isActive('underline') ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`}
                      aria-label="Underline"
                    >
                      <UnderlineIcon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Underline</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`rounded p-1 transition ${editor.isActive('strike') ? 'bg-gray-200 text-black line-through' : 'hover:bg-gray-100 text-gray-600'}`}
                      aria-label="Strikethrough"
                    >
                      <Strikethrough className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Strikethrough</TooltipContent>
                </Tooltip>
                <span className="mx-1 text-gray-300">|</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editor) return;
                        const { from, to, empty } = editor.state.selection;
                        if (empty || from === to) {
                          toast({
                            title: "Error",
                            description: "Please select text to create a hyperlink.",
                            variant: "destructive"
                          });
                          return;
                        }
                        const previousUrl = editor.getAttributes('link').href || '';
                        const url = window.prompt('Enter the URL', previousUrl);
                        if (url === null) return; // Cancelled
                        if (url === '') {
                          editor.chain().focus().extendMarkRange('link').unsetLink().run();
                          return;
                        }
                        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                      }}
                      className={`rounded p-1 transition ${editor.isActive('link') ? 'bg-gray-200 text-blue-700 underline' : 'hover:bg-gray-100 text-gray-600'}`}
                      aria-label="Add/Edit Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656m-3.656-3.656a4 4 0 015.656 0m-7.778 7.778a4 4 0 010-5.656m3.656 3.656a4 4 0 01-5.656 0m7.778-7.778a4 4 0 010 5.656" /></svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Insert/Edit Link</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`rounded p-1 transition flex items-center ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Heading 1">
                      <Heading className="w-5 h-5" />
                      <span className="text-xs ml-1">1</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Heading 1</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`rounded p-1 transition flex items-center ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Heading 2">
                      <Heading className="w-5 h-5" />
                      <span className="text-xs ml-1">2</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Heading 2</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`rounded p-1 transition flex items-center ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Heading 3">
                      <Heading className="w-5 h-5" />
                      <span className="text-xs ml-1">3</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Heading 3</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className={`rounded p-1 transition flex items-center ${editor.isActive('heading', { level: 4 }) ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Heading 4">
                      <Heading className="w-5 h-5" />
                      <span className="text-xs ml-1">4</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Heading 4</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()} className={`rounded p-1 transition flex items-center ${editor.isActive('heading', { level: 5 }) ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Heading 5">
                      <Heading className="w-5 h-5" />
                      <span className="text-xs ml-1">5</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Heading 5</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()} className={`rounded p-1 transition flex items-center ${editor.isActive('heading', { level: 6 }) ? 'bg-gray-200 text-black underline' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Heading 6">
                      <Heading className="w-5 h-5" />
                      <span className="text-xs ml-1">6</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Heading 6</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`rounded p-1 transition ${editor.isActive('bulletList') ? 'bg-gray-200 text-black' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Bullet List">
                      <List className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Bullet List</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`rounded p-1 transition ${editor.isActive('orderedList') ? 'bg-gray-200 text-black' : 'hover:bg-gray-100 text-gray-600'}`} aria-label="Ordered List">
                      <ListOrdered className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Ordered List</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().undo().run()} className="rounded p-1 transition hover:bg-gray-100 text-gray-600" aria-label="Undo">
                      <Undo2 className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => editor.chain().focus().redo().run()} className="rounded p-1 transition hover:bg-gray-100 text-gray-600" aria-label="Redo">
                      <Redo2 className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
          <div
            className="mb-4 border border-gray-300 rounded bg-white min-h-[200px] shadow-sm flex-1 overflow-y-auto max-h-[70vh]"
            onClick={() => editor?.commands.focus()}
            style={{ cursor: 'text', overflowX: 'hidden', maxWidth: '100%' }} // Add overflowX and maxWidth
          >
            <EditorContent
              editor={editor}
              className="tiptap-content min-h-[200px] p-4 outline-none border-none focus:outline-none focus:border-none focus:ring-0 break-words whitespace-pre-line max-w-full overflow-x-hidden box-border"
              style={{ boxShadow: 'none', background: 'white', border: 'none', wordBreak: 'break-word', whiteSpace: 'pre-line', overflowX: 'hidden', maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">{saving ? "Saving..." : "All changes saved"}</div>
            {selectedId && (() => {
              const note = notes.find((n: any) => n._id === selectedId);
              if (!note || !note.updatedAt) return null;
              return (
                <div className="text-[11px] text-gray-400 ml-auto" style={{ minWidth: 'max-content' }}>
                  Last edited: {new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}