import type { JSONContent } from "@tiptap/react";

/**
 * Parse a stored content string into TipTap JSONContent.
 * Handles two formats:
 *   1. TipTap JSON — stored content starts with '{'
 *   2. Legacy plain text — wrap in a minimal doc with paragraph nodes
 */
export function parseEntryContent(raw: string): JSONContent {
  if (raw.trimStart().startsWith("{")) {
    try {
      return JSON.parse(raw) as JSONContent;
    } catch {
      // fall through to plain-text wrap
    }
  }
  // Legacy plain text: split on double newlines, each chunk becomes a paragraph
  const paragraphs = raw.split(/\n\n+/);
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text.trim() ? [{ type: "text", text }] : undefined,
    })),
  };
}

/**
 * Extract plain text from a TipTap JSONContent doc.
 * Used for entry list previews and search.
 */
export function extractPlainText(content: JSONContent): string {
  if (!content.content) return "";
  return extractTextNodes(content.content).join(" ");
}

function extractTextNodes(nodes: JSONContent[]): string[] {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === "text" && node.text) parts.push(node.text);
    if (node.content) parts.push(...extractTextNodes(node.content));
  }
  return parts;
}
