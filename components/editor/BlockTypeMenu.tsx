"use client";

import type { Editor } from "@tiptap/react";

interface BlockTypeMenuProps {
  editor: Editor;
  onClose: () => void;
}

const BLOCK_TYPES = [
  {
    label: "Paragraph",
    icon: "¶",
    action: (e: Editor) => e.chain().focus().setParagraph().run(),
    isActive: (e: Editor) => e.isActive("paragraph"),
  },
  {
    label: "Heading 1",
    icon: "H1",
    action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e: Editor) => e.isActive("heading", { level: 1 }),
  },
  {
    label: "Heading 2",
    icon: "H2",
    action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e: Editor) => e.isActive("heading", { level: 2 }),
  },
  {
    label: "Heading 3",
    icon: "H3",
    action: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e: Editor) => e.isActive("heading", { level: 3 }),
  },
  {
    label: "Bullet list",
    icon: "•",
    action: (e: Editor) => e.chain().focus().toggleBulletList().run(),
    isActive: (e: Editor) => e.isActive("bulletList"),
  },
  {
    label: "Numbered list",
    icon: "1.",
    action: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e: Editor) => e.isActive("orderedList"),
  },
  {
    label: "Quote",
    icon: "❝",
    action: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e: Editor) => e.isActive("blockquote"),
  },
  {
    label: "Callout",
    icon: "!",
    action: (e: Editor) => e.chain().focus().toggleCallout().run(),
    isActive: (e: Editor) => e.isActive("callout"),
  },
];

export function BlockTypeMenu({ editor, onClose }: BlockTypeMenuProps) {
  return (
    <div
      style={{
        background: "var(--imw-bg-raised)",
        border: "0.5px solid var(--imw-border-medium)",
        borderRadius: 8,
        padding: 4,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        minWidth: 160,
        zIndex: 100,
      }}
    >
      {BLOCK_TYPES.map((bt) => (
        <button
          key={bt.label}
          onMouseDown={(e) => {
            e.preventDefault();
            bt.action(editor);
            onClose();
          }}
          className="imw-btn imw-btn--ghost imw-btn--sm"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            justifyContent: "flex-start",
            background: bt.isActive(editor) ? "var(--imw-ac-l)" : undefined,
            color: bt.isActive(editor) ? "var(--imw-ac-d)" : undefined,
          }}
        >
          <span
            style={{
              width: 20,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              fontStyle: "normal",
              color: "var(--imw-text-tertiary)",
              flexShrink: 0,
            }}
          >
            {bt.icon}
          </span>
          {bt.label}
        </button>
      ))}
    </div>
  );
}
