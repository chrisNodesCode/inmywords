import React, { useState, useEffect } from 'react';
import { Avatar, Switch, Input, Button, Modal, message } from 'antd';
import { UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { signOut } from 'next-auth/react';

export default function Account() {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    createdAt: '',
    notebooks: 0,
    groups: 0,
    subgroups: 0,
    entries: 0,
    tags: 0,
  });

  useEffect(() => {
    async function fetchAccount() {
      try {
        const res = await fetch('/api/account');
        if (!res.ok) throw new Error('Failed to load account');
        const data = await res.json();
        setUsername(data.username);
        setEmail(data.email);
        setStats({
          createdAt: data.createdAt,
          notebooks: data.stats.notebooks,
          groups: data.stats.groups,
          subgroups: data.stats.subgroups,
          entries: data.stats.entries,
          tags: data.stats.tags,
        });
      } catch (err) {
        console.error(err);
      }
    }
    fetchAccount();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: password || undefined }),
      });
      if (!res.ok) throw new Error('Failed to update account');
      const data = await res.json();
      setUsername(data.username);
      setEmail(data.email);
      setPassword('');
      setIsEditing(false);
      message.success('Account updated');
    } catch (err) {
      console.error(err);
      message.error('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete account?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action is irreversible and all of your data will be lost.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const res = await fetch('/api/account', { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete account');
          await signOut({ callbackUrl: '/' });
        } catch (err) {
          console.error(err);
          message.error('Failed to delete account');
        }
      },
    });
  };

  const formattedDate = stats.createdAt
    ? new Date(stats.createdAt).toLocaleDateString()
    : '';

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <Avatar size={64} icon={<UserOutlined />} />
        <h2 style={{ marginTop: '0.5rem' }}>{username}</h2>
        {formattedDate && <p>Joined on {formattedDate}</p>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p>Notebooks: {stats.notebooks}</p>
        <p>Groups: {stats.groups}</p>
        <p>Subgroups: {stats.subgroups}</p>
        <p>Entries: {stats.entries}</p>
        <p>Tags: {stats.tags}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Subscription</h3>
        <p>Current plan: Free</p>
        <Button type="primary" href="/pricing">
          Upgrade
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '0.5rem',
        }}
      >
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
      <Button
        type="primary"
        disabled={!isEditing}
        onClick={handleSave}
        loading={loading}
        style={{ marginBottom: '0.5rem', width: '100%' }}
      >
        Save Changes
      </Button>
      <Button danger disabled={!isEditing} onClick={handleDelete} style={{ width: '100%' }}>
        Delete Account
      </Button>
    </div>
  );
}
