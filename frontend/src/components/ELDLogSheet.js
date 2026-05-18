import React, { useEffect, useRef } from 'react';
import './ELDLogSheet.css';

const STATUS_ROWS = ['off_duty', 'sleeper', 'driving', 'on_duty'];
const STATUS_LABELS = {
  off_duty: 'Off Duty',
  sleeper: 'Sleeper Berth',
  driving: 'Driving',
  on_duty: 'On Duty (Not Driving)',
};
const STATUS_COLORS = {
  off_duty: '#64748b',
  sleeper: '#8b5cf6',
  driving: '#2563eb',
  on_duty: '#f59e0b',
};

const GRID_HOURS = 24;
const CANVAS_WIDTH = 720;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 28;
const LEFT_MARGIN = 130;
const CANVAS_HEIGHT = HEADER_HEIGHT + STATUS_ROWS.length * ROW_HEIGHT + 10;

function drawGrid(ctx) {
  const gridWidth = CANVAS_WIDTH - LEFT_MARGIN - 10;
  const hourWidth = gridWidth / GRID_HOURS;

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Header row
  ctx.fillStyle = '#1a2744';
  ctx.fillRect(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);

  // Hour labels
  ctx.fillStyle = 'white';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let h = 0; h <= GRID_HOURS; h++) {
    const x = LEFT_MARGIN + h * hourWidth;
    const label = h === 0 ? 'Mid' : h === 12 ? 'Noon' : h === 24 ? 'Mid' : h < 12 ? `${h}A` : `${h - 12}P`;
    ctx.fillText(label, x, HEADER_HEIGHT - 6);
    // Vertical grid line
    ctx.strokeStyle = h % 6 === 0 ? '#cbd5e1' : '#e2e8f0';
    ctx.lineWidth = h % 6 === 0 ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, HEADER_HEIGHT);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Row backgrounds and labels
  STATUS_ROWS.forEach((status, i) => {
    const y = HEADER_HEIGHT + i * ROW_HEIGHT;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
    ctx.fillRect(0, y, CANVAS_WIDTH, ROW_HEIGHT);

    // Left label
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(STATUS_LABELS[status], 8, y + ROW_HEIGHT / 2 + 4);

    // Row border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + ROW_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, y + ROW_HEIGHT);
    ctx.stroke();
  });

  // Left margin border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(LEFT_MARGIN, 0);
  ctx.lineTo(LEFT_MARGIN, CANVAS_HEIGHT);
  ctx.stroke();
}

function drawEntries(ctx, entries) {
  const gridWidth = CANVAS_WIDTH - LEFT_MARGIN - 10;
  const hourWidth = gridWidth / GRID_HOURS;

  entries.forEach((entry) => {
    const rowIdx = STATUS_ROWS.indexOf(entry.status);
    if (rowIdx === -1) return;

    const x = LEFT_MARGIN + entry.start * hourWidth;
    const w = Math.max((entry.end - entry.start) * hourWidth, 2);
    const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT + 4;
    const h = ROW_HEIGHT - 8;

    // Fill bar
    ctx.fillStyle = STATUS_COLORS[entry.status] || '#64748b';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = STATUS_COLORS[entry.status] || '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.stroke();

    // Label if wide enough
    if (w > 40 && entry.note) {
      ctx.fillStyle = 'white';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'left';
      const label = entry.note.length > 20 ? entry.note.slice(0, 18) + '…' : entry.note;
      ctx.fillText(label, x + 4, y + h / 2 + 3);
    }
  });
}

export default function ELDLogSheet({ log, summary }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawGrid(ctx);
    if (log.entries && log.entries.length > 0) {
      drawEntries(ctx, log.entries);
    }
  }, [log]);

  const totalHours = log.entries.reduce((sum, e) => {
    if (e.status === 'driving' || e.status === 'on_duty') return sum + (e.end - e.start);
    return sum;
  }, 0);

  const statusTotals = STATUS_ROWS.map(status => {
    const hrs = log.entries
      .filter(e => e.status === status)
      .reduce((sum, e) => sum + (e.end - e.start), 0);
    return { status, hrs: Math.round(hrs * 10) / 10 };
  });

  return (
    <div className="eld-sheet">
      <div className="eld-sheet-header">
        <div className="eld-sheet-title">
          <span className="day-badge">Day {log.day}</span>
          <div>
            <h4>Driver's Daily Log</h4>
            <span className="eld-date">{log.date}</span>
          </div>
        </div>
        <div className="eld-sheet-meta">
          <div className="meta-item">
            <span className="meta-label">From</span>
            <span className="meta-value">{summary.current_location?.split(',').slice(0,2).join(',')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">To</span>
            <span className="meta-value">{summary.dropoff_location?.split(',').slice(0,2).join(',')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Carrier</span>
            <span className="meta-value">Property Carrier</span>
          </div>
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="eld-canvas"
        />
      </div>

      <div className="eld-sheet-footer">
        <div className="status-totals">
          {statusTotals.map(({ status, hrs }) => (
            <div className="status-total" key={status}>
              <span className="st-dot" style={{ background: STATUS_COLORS[status] }} />
              <span className="st-label">{STATUS_LABELS[status]}</span>
              <span className="st-hrs">{hrs} hrs</span>
            </div>
          ))}
        </div>
        <div className="duty-totals">
          <div className="dt-item">
            <span>Total Driving</span>
            <strong>{log.total_driving} hrs</strong>
          </div>
          <div className="dt-item">
            <span>Total On Duty</span>
            <strong>{log.total_on_duty} hrs</strong>
          </div>
        </div>
      </div>

      {log.entries.length > 0 && (
        <div className="eld-remarks">
          <h5>Remarks</h5>
          <div className="remarks-list">
            {log.entries.filter(e => e.note).map((e, i) => (
              <div className="remark-item" key={i}>
                <span className="remark-time">
                  {String(Math.floor(e.start)).padStart(2,'0')}:{String(Math.round((e.start % 1) * 60)).padStart(2,'0')}
                  {' – '}
                  {String(Math.floor(e.end)).padStart(2,'0')}:{String(Math.round((e.end % 1) * 60)).padStart(2,'0')}
                </span>
                <span className="remark-dot" style={{ background: STATUS_COLORS[e.status] }} />
                <span className="remark-status">{STATUS_LABELS[e.status]}</span>
                <span className="remark-note">{e.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
