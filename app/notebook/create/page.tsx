"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Bold, Italic, Strikethrough, List, ListOrdered, Redo2, Undo2, Heading, Underline as UnderlineIcon } from "lucide-react";
import Underline from '@tiptap/extension-underline';

export default function CreateNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }), Underline],
    content: "",
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
    immediatelyRender: false,
  });

  const handleSave = async () => {
    setSubmitting(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSubmitting(false);
    router.push("/notebook");
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold ml-2">Create Note</h1>
      </div>
      <input
        className="w-full border rounded px-3 py-2 mb-4 text-lg font-semibold"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      {/* Toolbar */}
      {editor && (
        <div className="flex gap-2 mb-2 bg-gray-50 border rounded p-2">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'font-bold text-black' : ''} title="Bold">
            <Bold className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'italic text-black' : ''} title="Italic">
            <Italic className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'line-through text-black' : ''} title="Strikethrough">
            <Strikethrough className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'underline text-black' : ''} title="Underline">
            <UnderlineIcon className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'text-black underline' : ''} title="Heading 1">
            <Heading className="w-5 h-5" />
            <span className="text-xs ml-1">1</span>
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'text-black underline' : ''} title="Heading 2">
            <Heading className="w-5 h-5" />
            <span className="text-xs ml-1">2</span>
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'text-black underline' : ''} title="Heading 3">
            <Heading className="w-5 h-5" />
            <span className="text-xs ml-1">3</span>
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className={editor.isActive('heading', { level: 4 }) ? 'text-black underline' : ''} title="Heading 4">
            <Heading className="w-5 h-5" />
            <span className="text-xs ml-1">4</span>
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()} className={editor.isActive('heading', { level: 5 }) ? 'text-black underline' : ''} title="Heading 5">
            <Heading className="w-5 h-5" />
            <span className="text-xs ml-1">5</span>
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()} className={editor.isActive('heading', { level: 6 }) ? 'text-black underline' : ''} title="Heading 6">
            <Heading className="w-5 h-5" />
            <span className="text-xs ml-1">6</span>
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'text-black' : ''} title="Bullet List">
            <List className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'text-black' : ''} title="Numbered List">
            <ListOrdered className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo2 className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="mb-4 border border-gray-300 rounded bg-white min-h-[200px] shadow-sm">
        <EditorContent 
          editor={editor} 
          className="min-h-[200px] p-4 outline-none border-none focus:outline-none focus:border-none focus:ring-0"
          style={{ boxShadow: 'none', background: 'white', border: 'none' }}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={submitting || !title || !content}>
          {submitting ? "Saving..." : "Save Note"}
        </Button>
      </div>
    </div>
  );
} 