"use client";

import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface InlineToolbarProps {
  editor: Editor;
}

export function InlineToolbar({ editor }: InlineToolbarProps) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: "top" }}
    >
      <div className="imw-format-toolbar imw-format-toolbar--visible">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`imw-btn imw-btn--ghost imw-btn--sm${editor.isActive("bold") ? " imw-format-btn--active" : ""}`}
          style={{ fontWeight: 700, minWidth: 28 }}
          aria-label="Bold"
        >
          B
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={`imw-btn imw-btn--ghost imw-btn--sm${editor.isActive("italic") ? " imw-format-btn--active" : ""}`}
          style={{ fontStyle: "italic", minWidth: 28 }}
          aria-label="Italic"
        >
          I
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleStrike().run();
          }}
          className={`imw-btn imw-btn--ghost imw-btn--sm${editor.isActive("strike") ? " imw-format-btn--active" : ""}`}
          style={{ textDecoration: "line-through", minWidth: 28 }}
          aria-label="Strikethrough"
        >
          S
        </button>
      </div>
    </BubbleMenu>
  );
}
