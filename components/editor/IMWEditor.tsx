"use client";

import { useState, useMemo } from "react";
import { useEditor, EditorContent, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/react";
import { Callout } from "./CalloutExtension";
import { BlockTypeMenu } from "./BlockTypeMenu";
import { InlineToolbar } from "./InlineToolbar";
import { parseEntryContent } from "@/lib/tiptap-content";

interface IMWEditorProps {
  initialContent?: string;
  onChange: (jsonString: string) => void;
  onEditorReady?: (editor: Editor) => void;
  placeholder?: string;
  fontSize?: number;
  lineWidth?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function IMWEditor({
  initialContent = "",
  onChange,
  onEditorReady,
  placeholder = "What happened? What did you notice?",
  fontSize = 17,
  lineWidth = "640px",
  disabled = false,
  autoFocus = false,
}: IMWEditorProps) {
  const [gutterOpen, setGutterOpen] = useState(false);

  // Parse once on mount — do not re-parse on every render
  const parsedContent = useMemo(
    () => parseEntryContent(initialContent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const editor = useEditor({
    immediatelyRender: false, // Required: prevents SSR hydration mismatch in Next.js
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Callout,
      Placeholder.configure({ placeholder }),
    ],
    content: parsedContent,
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()));
    },
    onCreate({ editor }) {
      onEditorReady?.(editor);
    },
  });

  return (
    <div
      style={{
        fontFamily: "var(--imw-font-body)",
        fontSize,
        maxWidth: lineWidth,
        position: "relative",
        paddingLeft: "44px",
      }}
    >
      <EditorContent editor={editor} className="imw-editor-content" />

      {/* Inline format toolbar — IMW-51: appears on text selection */}
      {editor && <InlineToolbar editor={editor} />}

      {/* FloatingMenu — appears on empty paragraph lines (blank-line block type picker) */}
      {editor && (
        <FloatingMenu
          editor={editor}
          tippyOptions={{
            placement: "left",
            offset: [0, 8],
          }}
          shouldShow={({ state }) => {
            const { selection } = state;
            const { $anchor, empty } = selection;
            const isRootDepth = $anchor.depth === 1;
            const isEmptyTextBlock =
              $anchor.parent.isTextblock && !$anchor.parent.textContent;
            return Boolean(empty && isRootDepth && isEmptyTextBlock);
          }}
        >
          {gutterOpen ? (
            <BlockTypeMenu editor={editor} onClose={() => setGutterOpen(false)} />
          ) : (
            <button
              className="imw-block-gutter"
              style={{ opacity: 1, border: "0.5px solid var(--imw-border-default)" }}
              onMouseDown={(e) => {
                e.preventDefault();
                setGutterOpen(true);
              }}
              title="Change block type"
              aria-label="Block type menu"
            >
              +
            </button>
          )}
        </FloatingMenu>
      )}
    </div>
  );
}
