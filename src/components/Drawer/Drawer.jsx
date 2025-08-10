import React from 'react';
import { Drawer as AntDrawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

/**
 * Minimal Drawer component that provides structural slots for custom content.
 */
export default function Drawer({
  open,
  width = 300,
  onHamburgerClick,
  onMouseEnter,
  onMouseLeave,
  header,
  body,
  footer,
  children,
  ...props
}) {
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
          body={{ padding: '1rem' }}
          {...props}
        >
          {header}
          {body || children}
          {footer}
        </AntDrawer>
      </div>
    </>
  );
}

