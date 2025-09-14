import React from 'react';
import { Button } from 'antd';

export default function AddGroupButton({ onAddGroup }) {
  return (
    <Button
      type="dashed"
      className="nt-add-btn"
      onClick={onAddGroup}
      style={{ marginTop: '1.5rem' }}
    >
      Add New Group
    </Button>
  );
}
