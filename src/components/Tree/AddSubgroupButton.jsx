import React from 'react';
import { Button } from 'antd';

export default function AddSubgroupButton({ groupKey, groupTitle, onAddSubgroup }) {
  return (
    <Button type="dashed" onClick={() => onAddSubgroup(groupKey)}>
      {`Add New Subgroup to ${groupTitle}`}
    </Button>
  );
}

