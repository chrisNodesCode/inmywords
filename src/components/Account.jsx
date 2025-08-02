import React, { useState } from 'react';
import { Avatar, Switch, Input, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export default function Account() {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('User Name');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('');

  const stats = {
    createdAt: 'January 1, 2024',
    notebooks: 0,
    groups: 0,
    subgroups: 0,
    entries: 0,
    tags: 0,
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <Avatar size={64} icon={<UserOutlined />} />
        <h2 style={{ marginTop: '0.5rem' }}>{username}</h2>
        <p>Joined on {stats.createdAt}</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p>Notebooks: {stats.notebooks}</p>
        <p>Groups: {stats.groups}</p>
        <p>Subgroups: {stats.subgroups}</p>
        <p>Entries: {stats.entries}</p>
        <p>Tags: {stats.tags}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
        <span>Enable Editing</span>
        <Switch checked={isEditing} onChange={setIsEditing} />
      </div>

      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        disabled={!isEditing}
        style={{ marginBottom: '0.5rem' }}
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={!isEditing}
        style={{ marginBottom: '0.5rem' }}
      />
      <Input.Password
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={!isEditing}
        style={{ marginBottom: '0.5rem' }}
      />
      <Button danger disabled={!isEditing} style={{ width: '100%' }}>
        Delete Account
      </Button>
    </div>
  );
}
