import React from 'react';
import { Button } from 'antd';

export default function AddEntryButton({ groupKey, subgroupKey, subgroupTitle, onAddEntry }) {
  return (
    <Button type="dashed" onClick={() => onAddEntry(groupKey, subgroupKey)}>
      {`Add New Entry to Subgroup ${subgroupTitle}`}
    </Button>
  );
}

