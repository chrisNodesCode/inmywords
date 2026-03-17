import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "callout", class: "imw-callout" }, 0];
  },

  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleNode("callout", "paragraph");
        },
    };
  },
});
