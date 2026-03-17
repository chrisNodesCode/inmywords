"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Callout } from "./CalloutExtension";
import { parseEntryContent } from "@/lib/tiptap-content";

interface IMWReadViewProps {
  content: string;
  fontSize?: number;
  lineWidth?: string;
}

export function IMWReadView({
  content,
  fontSize = 17,
  lineWidth = "640px",
}: IMWReadViewProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Callout,
    ],
    content: parseEntryContent(content),
  });

  return (
    <div style={{ fontSize, maxWidth: lineWidth, fontFamily: "var(--imw-font-body)" }}>
      <EditorContent editor={editor} className="imw-editor-content" />
    </div>
  );
}
