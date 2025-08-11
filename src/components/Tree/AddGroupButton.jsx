import React from 'react';
import { Button } from 'antd';

export default function AddGroupButton({ onAddGroup }) {
  return (
    <Button type="dashed" onClick={onAddGroup} style={{ marginTop: '1rem' }}>
      Add New Group
    </Button>
  );
}

