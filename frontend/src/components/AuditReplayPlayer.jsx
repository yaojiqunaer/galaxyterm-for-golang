import React, { useEffect, useMemo, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import {
  CaretRightOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  PauseOutlined,
  RedoOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';
import { Button, Segmented, Slider, Tooltip, Typography } from 'antd';
import { parseAsciinemaCast, resolveReplayEventTime } from '../auditLog.js';
import {
  advanceReplayTime,
  findReplayEventCursor,
  replayPlaybackState,
  seekReplayTime,
  shouldResetReplayTerminal,
} from '../replayTimeline.js';
import { t } from '../i18n.js';

const { Text } = Typography;
const playbackRates = [0.5, 1, 1.5, 2].map((value) => ({ label: `${value}x`, value }));

export default function AuditReplayPlayer({ record }) {
  const parsedCast = useMemo(() => parseAsciinemaCast(record?.cast || ''), [record?.cast]);
  const terminalHostRef = useRef(null);
  const terminalRef = useRef(null);
  const renderStateRef = useRef({ cursor: 0, recordId: '', time: 0 });
  const [rendererReady, setRendererReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [speed, setSpeed] = useState(1);
  const hasRecording = parsedCast.events.length > 0;
  const currentEventCount = findReplayEventCursor(parsedCast.events, playhead, 0);
  const playbackState = replayPlaybackState({
    duration: parsedCast.duration,
    hasRecording,
    playhead,
    playing,
  });

  useEffect(() => {
    const terminal = new Terminal({
      allowTransparency: true,
      cols: normalizeDimension(parsedCast.header.width, 80),
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true,
      fontFamily: 'SFMono-Regular, JetBrains Mono, Menlo, Consolas, Liberation Mono, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      rows: normalizeDimension(parsedCast.header.height, 24),
      scrollback: 2000,
      theme: replayTerminalTheme,
    });
    terminal.open(terminalHostRef.current);
    terminalRef.current = terminal;
    setRendererReady(true);

    return () => {
      terminalRef.current = null;
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    setPlaying(false);
    setPlayhead(0);
    setSpeed(1);
  }, [record?.id]);

  useEffect(() => {
    if (!playing) return undefined;
    let animationFrame = 0;
    let previousTimestamp = performance.now();

    const update = (timestamp) => {
      const elapsed = timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      setPlayhead((current) => {
        const next = advanceReplayTime(current, elapsed, parsedCast.duration, speed);
        if (next >= parsedCast.duration) setPlaying(false);
        return next;
      });
      animationFrame = window.requestAnimationFrame(update);
    };

    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [parsedCast.duration, playing, speed]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || !rendererReady) return;

    const previous = renderStateRef.current;
    const recordId = record?.id || '';
    const reset = shouldResetReplayTerminal(previous.time, playhead, previous.recordId, recordId);
    if (reset) {
      terminal.reset();
      terminal.resize(
        normalizeDimension(parsedCast.header.width, 80),
        normalizeDimension(parsedCast.header.height, 24),
      );
      previous.cursor = 0;
    }

    const targetCursor = findReplayEventCursor(parsedCast.events, playhead, previous.cursor);
    const output = parsedCast.events
      .slice(previous.cursor, targetCursor)
      .map((event) => event.data)
      .join('');
    if (output) terminal.write(output);
    if (!hasRecording && reset && record?.screen) terminal.write(record.screen);

    renderStateRef.current = { cursor: targetCursor, recordId, time: playhead };
  }, [hasRecording, parsedCast.events, parsedCast.header.height, parsedCast.header.width, playhead, record?.id, record?.screen, rendererReady]);

  const seek = (nextTime) => {
    setPlaying(false);
    setPlayhead(nextTime);
  };

  const togglePlayback = () => {
    if (!hasRecording) return;
    setPlaying((current) => {
      if (!current) {
        setPlayhead((time) => (time >= parsedCast.duration ? 0 : time));
      }
      return !current;
    });
  };

  const nudgeReplay = (offset) => {
    setPlayhead((current) => seekReplayTime(current, parsedCast.duration, offset));
  };

  useEffect(() => {
    const handleReplayKeyDown = (event) => {
      if (
        event.defaultPrevented
        || event.metaKey
        || event.ctrlKey
        || event.altKey
        || isReplayControlTarget(event.target)
      ) return;
      if (event.code === 'Space' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!event.repeat) togglePlayback();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nudgeReplay(-5);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nudgeReplay(5);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        seek(0);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        seek(parsedCast.duration);
      }
    };
    window.addEventListener('keydown', handleReplayKeyDown);
    return () => window.removeEventListener('keydown', handleReplayKeyDown);
  }, [hasRecording, parsedCast.duration]);

  return (
    <section className="audit-player" aria-label={t('section.recordingReplay')}>
      <div className="audit-replay-stage">
        <div className="audit-replay-terminal" ref={terminalHostRef} aria-label={t('label.recordingOutput')} />
        {!hasRecording && !record?.screen && (
          <div className="audit-replay-empty">{t('message.terminalOutputEmpty')}</div>
        )}
      </div>
      <div className="audit-player-controls">
        <div className="audit-player-transport">
          <Tooltip title={playing ? t('action.pauseReplay') : t('action.playReplay')}>
            <Button
              aria-label={playing ? t('action.pauseReplay') : t('action.playReplay')}
              className="audit-play-button"
              disabled={!hasRecording}
              icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
              onClick={togglePlayback}
              shape="circle"
              type="primary"
            />
          </Tooltip>
          <Tooltip title={t('action.restartReplay')}>
            <Button
              aria-label={t('action.restartReplay')}
              disabled={!hasRecording}
              icon={<RedoOutlined />}
              onClick={() => {
                setPlayhead(0);
                setPlaying(true);
              }}
              type="text"
            />
          </Tooltip>
          <Tooltip title={t('action.seekBackward5')}>
            <Button
              aria-label={t('action.seekBackward5')}
              disabled={!hasRecording}
              icon={<FastBackwardOutlined />}
              onClick={() => nudgeReplay(-5)}
              type="text"
            />
          </Tooltip>
          <Tooltip title={t('action.previousEvent')}>
            <Button
              aria-label={t('action.previousEvent')}
              disabled={!hasRecording}
              icon={<StepBackwardOutlined />}
              onClick={() => seek(resolveReplayEventTime(parsedCast.events, playhead, 'previous'))}
              type="text"
            />
          </Tooltip>
          <Tooltip title={t('action.seekForward5')}>
            <Button
              aria-label={t('action.seekForward5')}
              disabled={!hasRecording}
              icon={<FastForwardOutlined />}
              onClick={() => nudgeReplay(5)}
              type="text"
            />
          </Tooltip>
          <Tooltip title={t('action.nextEvent')}>
            <Button
              aria-label={t('action.nextEvent')}
              disabled={!hasRecording}
              icon={<StepForwardOutlined />}
              onClick={() => seek(resolveReplayEventTime(parsedCast.events, playhead, 'next'))}
              type="text"
            />
          </Tooltip>
          <span
            aria-live="polite"
            className={`audit-player-state tone-${playbackState}`}
          >
            {t(`replay.state.${playbackState}`)}
          </span>
          <Text className="audit-player-time">
            <strong>{formatReplayTime(playhead)}</strong>
            <span>/ {formatReplayTime(parsedCast.duration)}</span>
          </Text>
        </div>
        <Segmented
          aria-label={t('label.playbackSpeed')}
          onChange={setSpeed}
          options={playbackRates}
          size="small"
          value={speed}
        />
      </div>
      <Slider
        aria-label={t('label.recordingProgress')}
        className="audit-replay-slider"
        disabled={!hasRecording}
        max={Math.max(parsedCast.duration, 0.1)}
        min={0}
        onChange={seek}
        step={0.01}
        tooltip={{ formatter: formatReplayTime }}
        value={playhead}
      />
      <div className="audit-player-meta">
        <span>{`${normalizeDimension(parsedCast.header.width, 80)} x ${normalizeDimension(parsedCast.header.height, 24)}`}</span>
        <span>{t('replay.eventProgress', { current: currentEventCount, total: parsedCast.events.length })}</span>
        <span className="audit-player-keyboard-hint">{t('replay.keyboardHint')}</span>
      </div>
    </section>
  );
}

function normalizeDimension(value, fallback) {
  const dimension = Math.floor(Number(value) || fallback);
  return Math.min(500, Math.max(1, dimension));
}

function formatReplayTime(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 10);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}.${milliseconds}`;
}

function isReplayControlTarget(target) {
  if (target?.closest?.('.audit-replay-terminal')) return false;
  return Boolean(target?.closest?.(
    'button, input, textarea, select, [role="slider"], [role="radio"], [contenteditable="true"]',
  ));
}

const replayTerminalTheme = {
  background: '#0b1016',
  foreground: '#d7dee8',
  cursor: '#58b7c9',
  cursorAccent: '#0b1016',
  selectionBackground: '#2c5966aa',
  black: '#101820',
  red: '#e06c75',
  green: '#7fca8f',
  yellow: '#e5c07b',
  blue: '#66a8d9',
  magenta: '#c58bd2',
  cyan: '#58b7c9',
  white: '#d7dee8',
  brightBlack: '#657180',
  brightRed: '#ef858d',
  brightGreen: '#99d6a5',
  brightYellow: '#efd18e',
  brightBlue: '#82b9e0',
  brightMagenta: '#d4a2df',
  brightCyan: '#76c7d5',
  brightWhite: '#f1f5f9',
};
