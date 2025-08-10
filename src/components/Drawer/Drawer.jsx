import React from 'react';
import { Drawer as AntDrawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import templates from './templates';

/**
 * Flexible Drawer component that can render custom sections or
 * predefined templates selected via the `template` prop.
 */
export default function Drawer({
  open,
  width = 300,
  onHamburgerClick,
  onMouseEnter,
  onMouseLeave,
  template,
  header,
  body,
  footer,
  children,
  ...rest
}) {
  let sections = {
    header,
    body: body || children,
    footer,
  };

  if (template && templates[template]) {
    sections = templates[template](rest);
    rest = {};
  }

  return (
    <>
      {onHamburgerClick && (
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onHamburgerClick}
          style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1002 }}
        />
      )}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="drawer-wrapper"
        style={{ width }}
      >
        <AntDrawer
          placement="right"
          open={open}
          mask={false}
          closable={false}
          width={width}
          getContainer={false}
          rootStyle={{ position: 'absolute' }}
          bodyStyle={{ padding: '1rem' }}
          {...rest}
        >
          {sections.header}
          {sections.body}
          {sections.footer}
        </AntDrawer>
      </div>
    </>
  );
}

