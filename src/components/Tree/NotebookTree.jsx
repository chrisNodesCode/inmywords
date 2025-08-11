import React, { useState } from 'react';
import { Collapse, Card, List } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Tree.module.css';

export default function NotebookTree({
  className = '',
  style,
  treeData = [],
  onSelect,
  ...rest
}) {
  const [activeGroup, setActiveGroup] = useState();
  const MotionDiv = motion.div;

  const handleEntryClick = (entry, subgroup, group) => {
    onSelect?.([entry.key], {
      node: {
        ...entry,
        type: 'entry',
        subgroupId: subgroup?.key,
        groupId: group?.key,
      },
    });
  };

  return (
    <div className={`${styles.stack} ${className}`} style={style} {...rest}>
      {treeData.map((g) => (
        <Card key={g.key} className={styles.groupCard} bordered>
          <Collapse
            accordion
            activeKey={activeGroup}
            onChange={(k) => setActiveGroup(k)}
            items={[
              {
                key: g.key,
                label: <div className={styles.groupTitle}>{g.title}</div>,
                children: (
                  <div className={styles.subgroups}>
                    {g.children?.map((s) => (
                      <Collapse
                        key={s.key}
                        accordion
                        ghost
                        items={[
                          {
                            key: s.key,
                            label: (
                              <div className={styles.subTitle}>{s.title}</div>
                            ),
                            children: (
                              <AnimatePresence initial={false}>
                                <MotionDiv
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <List
                                    size="large"
                                    dataSource={s.children || []}
                                    renderItem={(e) => (
                                      <List.Item
                                        key={e.key}
                                        className={styles.entryItem}
                                        onClick={() =>
                                          handleEntryClick(e, s, g)
                                        }
                                      >
                                        {e.title}
                                      </List.Item>
                                    )}
                                  />
                                </MotionDiv>
                              </AnimatePresence>
                            ),
                          },
                        ]}
                      />
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      ))}
    </div>
  );
}
