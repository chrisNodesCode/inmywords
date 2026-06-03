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

/**
 * Convert stored content (TipTap JSON or legacy plain text) to Markdown, so
 * copying a card preserves structure (headings, lists, bold, links, etc.) when
 * pasted into an LLM. Falls back to the raw string if parsing fails.
 */
export function tiptapToMarkdown(raw: string): string {
  let doc: JSONContent;
  try {
    doc = parseEntryContent(raw);
  } catch {
    return raw;
  }
  return renderBlocks(doc.content ?? []).replace(/\n{3,}/g, "\n\n").trim();
}

function renderBlocks(nodes: JSONContent[]): string {
  return nodes
    .map((n) => renderBlock(n))
    .filter((s) => s !== "")
    .join("\n\n");
}

function renderBlock(node: JSONContent): string {
  switch (node.type) {
    case "paragraph":
      return renderInline(node.content);
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return `${"#".repeat(level)} ${renderInline(node.content)}`;
    }
    case "bulletList":
      return renderList(node, "bullet");
    case "orderedList":
      return renderList(node, "ordered");
    case "blockquote":
      return renderBlocks(node.content ?? [])
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      return `\`\`\`${lang}\n${renderInline(node.content)}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    default:
      // Callout and any other container node: render its children.
      if (node.content) return renderBlocks(node.content);
      if (node.text) return node.text;
      return "";
  }
}

function renderList(node: JSONContent, kind: "bullet" | "ordered"): string {
  const items = node.content ?? [];
  return items
    .map((item, i) => {
      const marker = kind === "ordered" ? `${i + 1}. ` : "- ";
      const inner = renderBlocks(item.content ?? []);
      const lines = inner.split("\n");
      // First line gets the marker; continuation/nested lines are indented.
      return lines.map((l, idx) => (idx === 0 ? marker + l : "  " + l)).join("\n");
    })
    .join("\n");
}

function renderInline(nodes?: JSONContent[]): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      if (n.type === "text") {
        let t = n.text ?? "";
        const marks = n.marks ?? [];
        const has = (type: string) => marks.some((m) => m.type === type);
        if (has("code")) t = `\`${t}\``;
        if (has("bold")) t = `**${t}**`;
        if (has("italic")) t = `*${t}*`;
        if (has("strike")) t = `~~${t}~~`;
        const link = marks.find((m) => m.type === "link");
        if (link) t = `[${t}](${(link.attrs?.href as string) ?? ""})`;
        return t;
      }
      if (n.content) return renderInline(n.content);
      return "";
    })
    .join("");
}
