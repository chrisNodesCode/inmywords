import React from 'react';
import { Button } from 'antd';

export default function AddSubgroupButton({ groupKey, groupTitle, onAddSubgroup }) {
  return (
    <Button
      type="dashed"
      className="nt-add-btn"
      onClick={() => onAddSubgroup(groupKey)}
      style={{ marginTop: '1.5rem' }}
    >
      {`Add New Subgroup to ${groupTitle}`}
    </Button>
  );
}
