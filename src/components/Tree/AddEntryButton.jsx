import React from 'react';
import { Button } from 'antd';

export default function AddEntryButton({ groupKey, subgroupKey, subgroupTitle, onAddEntry }) {
  return (
    <Button
      type="dashed"
      className="nt-add-btn"
      onClick={() => onAddEntry(groupKey, subgroupKey)}
      style={{ marginTop: '1.5rem' }}
    >
      {`Add New Entry to Subgroup ${subgroupTitle}`}
    </Button>
  );
}
