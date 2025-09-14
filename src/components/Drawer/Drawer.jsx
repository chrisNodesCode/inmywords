import React from 'react';
import { Drawer as AntDrawer, Button } from 'antd';
import SidebarToggleIcon from './SidebarToggleIcon';
import styles from './Drawer.module.css';
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
  destroyOnClose = false,
  getContainer = false,
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
      {onHamburgerClick && !open && (
        <Button
          type="text"
          className={styles.hamburgerBtn}
          aria-label="Open drawer"
          icon={<SidebarToggleIcon placement="right" />}
          onClick={onHamburgerClick}
          style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1002 }}
        />
      )}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="drawer-wrapper"
        style={{ width: open ? width : 0 }}
      >
        <AntDrawer
          placement="right"
          open={open}
          mask={false}
          closable={false}
          width={width}
          getContainer={getContainer}
          destroyOnClose={destroyOnClose}
          rootStyle={getContainer === false ? { position: 'absolute' } : undefined}
          bodyStyle={{ padding: '1rem' }}
          {...rest}
        >
          <div className={styles.drawerBody}>
            {onHamburgerClick && open && (
              <div className={styles.toggleRow}>
                <Button
                  type="text"
                  className={styles.hamburgerBtn}
                  aria-label="Toggle drawer"
                  onClick={onHamburgerClick}
                  icon={<SidebarToggleIcon open placement="right" />}
                />
              </div>
            )}
            {sections.header}
            {sections.body}
            {sections.footer}
          </div>
        </AntDrawer>
      </div>
    </>
  );
}
