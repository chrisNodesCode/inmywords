import React, { useMemo } from 'react';
import { Menu } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import TurndownService from 'turndown';

export default function ExportMenu({ quillRef, content }) {
  const turndownService = useMemo(() => new TurndownService(), []);

  const copyTextOnly = async () => {
    try {
      const editor =
        quillRef.current?.getEditor?.() || quillRef.current;
      const text = editor?.getText ? editor.getText() : '';
      await navigator.clipboard.writeText(text.trim());
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const copyHtml = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        const editor =
          quillRef.current?.getEditor?.() || quillRef.current;
        const text = editor?.getText ? editor.getText() : '';
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([content], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(content);
      }
    } catch (err) {
      console.error('Failed to copy HTML', err);
    }
  };

  const copyMarkdown = async () => {
    try {
      const md = turndownService.turndown(content || '');
      await navigator.clipboard.writeText(md);
    } catch (err) {
      console.error('Failed to copy Markdown', err);
    }
  };

  const handleClick = (e) => {
    if (e.key === 'text') {
      copyTextOnly();
    } else if (e.key === 'html') {
      copyHtml();
    } else if (e.key === 'markdown') {
      copyMarkdown();
    }
  };

  const items = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      children: [
        { key: 'text', label: 'Text only' },
        { key: 'html', label: 'Full HTML' },
        { key: 'markdown', label: 'Markdown' },
      ],
    },
  ];

  return (
    <Menu
      mode="horizontal"
      selectable={false}
      triggerSubMenuAction="hover"
      onClick={handleClick}
      items={items}
      className="export-menu"
    />
  );
}

