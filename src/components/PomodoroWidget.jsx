import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTimer } from 'react-timer-hook';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function PomodoroWidget() {
  const defaultDurations = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  const [durations, setDurations] = useState(defaultDurations);
  const [currentType, setCurrentType] = useState('pomodoro');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const handleExpire = () => {
    let nextType = 'pomodoro';
    let nextCount = pomodoroCount;
    if (currentType === 'pomodoro') {
      nextCount += 1;
      nextType = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    }
    setPomodoroCount(nextCount);
    setCurrentType(nextType);
    const nextSeconds = durations[nextType];
    restartTimer(nextSeconds, true);
  };

  const {
    seconds,
    minutes,
    isRunning,
    pause,
    resume,
    restart,
  } = useTimer({
    expiryTimestamp: new Date(Date.now() + defaultDurations.pomodoro * 1000),
    autoStart: false,
    onExpire: handleExpire,
  });

  const restartTimer = (secondsLeft, autoStart) => {
    const time = new Date(Date.now() + secondsLeft * 1000);
    restart(time, autoStart);
  };

  useEffect(() => {
    const savedStateStr = localStorage.getItem('pomodoro-state');
    const savedDurationsStr = localStorage.getItem('pomodoro-durations');
    const saved = savedStateStr ? JSON.parse(savedStateStr) : null;
    const savedDurations = savedDurationsStr ? JSON.parse(savedDurationsStr) : null;

    if (saved) {
      setDurations(saved.durations || savedDurations || defaultDurations);
      setCurrentType(saved.type || 'pomodoro');
      setPomodoroCount(saved.pomodoroCount || 0);
      let remaining =
        saved.secondsRemaining ?? defaultDurations[saved.type || 'pomodoro'];
      if (saved.isRunning && saved.expiry) {
        const diff = Math.floor((saved.expiry - Date.now()) / 1000);
        remaining = diff > 0 ? diff : 0;
      }
      if (remaining <= 0) {
        handleExpire();
      } else {
        restartTimer(remaining, saved.isRunning);
      }
    } else if (savedDurations) {
      setDurations(savedDurations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRemainingSeconds = useCallback(
    () => minutes * 60 + seconds,
    [minutes, seconds]
  );

  useEffect(() => {
    localStorage.setItem(
      'pomodoro-state',
      JSON.stringify({
        type: currentType,
        secondsRemaining: getRemainingSeconds(),
        isRunning,
        durations,
        pomodoroCount,
        expiry: isRunning ? Date.now() + getRemainingSeconds() * 1000 : null,
      })
    );
    localStorage.setItem('pomodoro-durations', JSON.stringify(durations));
  }, [
    isRunning,
    seconds,
    minutes,
    currentType,
    durations,
    pomodoroCount,
    getRemainingSeconds,
  ]);

  const handleClick = () => {
    if (isRunning) {
      pause();
    } else {
      resume();
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
  };

  useEffect(() => {
    const handleDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const startHandler = () => {
      resume();
    };
    const stopHandler = () => {
      pause();
    };
    window.addEventListener('pomodoro-start', startHandler);
    window.addEventListener('pomodoro-stop', stopHandler);
    return () => {
      window.removeEventListener('pomodoro-start', startHandler);
      window.removeEventListener('pomodoro-stop', stopHandler);
    };
  }, [resume, pause]);

  const updateDuration = (type, value) => {
    const mins = Math.max(1, Number(value));
    const secs = mins * 60;
    setDurations((prev) => {
      const next = { ...prev, [type]: secs };
      localStorage.setItem('pomodoro-durations', JSON.stringify(next));
      return next;
    });
    if (currentType === type) {
      restartTimer(secs, false);
    }
  };


  const total = durations[currentType];
  const remaining = getRemainingSeconds();
  const percentage = ((total - remaining) / total) * 100;
  const label =
    currentType === 'pomodoro'
      ? 'Pomodoro'
      : currentType === 'shortBreak'
      ? 'Short Break'
      : 'Long Break';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '80px',
        height: '80px',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '50%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: 'pointer',
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <CircularProgressbar
        value={percentage}
        text={`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
        styles={buildStyles({
          pathColor: '#000',
          trailColor: '#eee',
          textColor: '#000',
        })}
      />
      {showMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: '90px',
            right: 0,
            background: '#fff',
            padding: '0.5rem',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            color: '#000',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ marginBottom: '0.25rem' }}>{label}</div>
          <label style={{ display: 'block' }}>
            Pomodoro:
            <input
              type="number"
              value={Math.floor(durations.pomodoro / 60)}
              onChange={(e) => updateDuration('pomodoro', e.target.value)}
              style={{ width: '3rem', marginLeft: '0.25rem' }}
            />
          </label>
          <label style={{ display: 'block' }}>
            Short:
            <input
              type="number"
              value={Math.floor(durations.shortBreak / 60)}
              onChange={(e) => updateDuration('shortBreak', e.target.value)}
              style={{ width: '3rem', marginLeft: '0.25rem' }}
            />
          </label>
          <label style={{ display: 'block' }}>
            Long:
            <input
              type="number"
              value={Math.floor(durations.longBreak / 60)}
              onChange={(e) => updateDuration('longBreak', e.target.value)}
              style={{ width: '3rem', marginLeft: '0.25rem' }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

