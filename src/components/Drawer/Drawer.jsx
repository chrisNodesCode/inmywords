import React from 'react';
import { Drawer as AntDrawer, Button } from 'antd';
import SidebarToggleIcon from './SidebarToggleIcon';
import SpinnerIcon from './SpinnerIcon';
import styles from './Drawer.module.css';
import { useNetwork } from '@/components/NetworkProvider';
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
  const { isLoading } = useNetwork();
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
          className={styles.hamburgerBtn}
          aria-label={open ? 'Close drawer' : 'Open drawer'}
          icon={
            <span className={`${styles.iconSwap} ${isLoading ? styles.loading : ''}`}>
              <span className={`${styles.iconLayer} ${styles.iconNormal}`}>
                <SidebarToggleIcon placement="right" open={open} />
              </span>
              <span className={`${styles.iconLayer} ${styles.iconSpinner}`}>
                <SpinnerIcon size={28} />
              </span>
            </span>
          }
          onClick={onHamburgerClick}
          style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1003 }}
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
          styles={{ body: { padding: '1rem' } }}
          {...rest}
        >
          <div className={styles.drawerBody}>
            {/* Invisible placeholder to reserve space equal to the toggle icon */}
            <div className={styles.toggleRow}>
              <Button
                type="text"
                className={`${styles.hamburgerBtn} ${styles.togglePlaceholder}`}
                aria-hidden
                tabIndex={-1}
                icon={<SidebarToggleIcon placement="right" open={open} />}
              />
            </div>
            {sections.header}
            {sections.body}
            {sections.footer}
          </div>
        </AntDrawer>
      </div>
    </>
  );
}
