import React, { useEffect, useRef } from 'react';
import './ELDLogSheet.css';

const STATUS_ROWS = ['off_duty', 'sleeper', 'driving', 'on_duty'];

const STATUS_LABELS = {
  off_duty: 'Off Duty',
  sleeper:  'Sleeper Berth',
  driving:  'Driving',
  on_duty:  'On Duty (Not Driving)',
};

// Solid professional colors — no gradients
const STATUS_COLORS = {
  off_duty: '#475569',  // slate
  sleeper:  '#7c3aed',  // violet
  driving:  '#1d4ed8',  // blue
  on_duty:  '#d97706',  // amber
};

// Lighter tint for row background
const ROW_BG = {
  off_duty: '#f8fafc',
  sleeper:  '#faf5ff',
  driving:  '#eff6ff',
  on_duty:  '#fffbeb',
};

const HOURS       = 24;
const DPR         = window.devicePixelRatio || 1;
const CW          = 860;   // logical canvas width
const ROW_H       = 44;
const HEADER_H    = 32;
const TICK_AREA_H = 14;    // sub-hour tick row below header
const LEFT        = 148;
const RIGHT_PAD   = 12;
const CH          = HEADER_H + TICK_AREA_H + STATUS_ROWS.length * ROW_H + 1;

function drawAll(canvas, entries) {
  // HiDPI
  canvas.width  = CW  * DPR;
  canvas.height = CH  * DPR;
  canvas.style.width  = CW  + 'px';
  canvas.style.height = CH  + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const gridW    = CW - LEFT - RIGHT_PAD;
  const hourW    = gridW / HOURS;
  const gridTop  = HEADER_H + TICK_AREA_H;

  // ── 1. Row backgrounds ──────────────────────────────────────────────────
  STATUS_ROWS.forEach((s, i) => {
    ctx.fillStyle = ROW_BG[s];
    ctx.fillRect(0, gridTop + i * ROW_H, CW, ROW_H);
  });

  // ── 2. Vertical grid lines (quarter, half, hour) ─────────────────────
  for (let h = 0; h <= HOURS; h++) {
    // Quarter-hour ticks within each hour
    if (h < HOURS) {
      [0.25, 0.5, 0.75].forEach(frac => {
        const x = LEFT + (h + frac) * hourW;
        const isHalf = frac === 0.5;
        ctx.strokeStyle = isHalf ? '#cbd5e1' : '#e2e8f0';
        ctx.lineWidth   = isHalf ? 0.8 : 0.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, gridTop);
        ctx.lineTo(x, gridTop + STATUS_ROWS.length * ROW_H);
        ctx.stroke();

        // Tick marks in the tick area
        const tickH = isHalf ? TICK_AREA_H * 0.65 : TICK_AREA_H * 0.4;
        ctx.strokeStyle = isHalf ? '#94a3b8' : '#cbd5e1';
        ctx.lineWidth   = isHalf ? 1 : 0.7;
        ctx.beginPath();
        ctx.moveTo(x, HEADER_H + TICK_AREA_H - tickH);
        ctx.lineTo(x, HEADER_H + TICK_AREA_H);
        ctx.stroke();
      });
    }

    // Full-hour line
    const x = LEFT + h * hourW;
    const isMajor = h % 6 === 0;
    ctx.strokeStyle = isMajor ? '#94a3b8' : '#cbd5e1';
    ctx.lineWidth   = isMajor ? 1.2 : 0.8;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, HEADER_H);
    ctx.lineTo(x, gridTop + STATUS_ROWS.length * ROW_H);
    ctx.stroke();
  }

  // ── 3. Horizontal row borders ────────────────────────────────────────
  STATUS_ROWS.forEach((_, i) => {
    const y = gridTop + i * ROW_H;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CW, y);
    ctx.stroke();
  });
  // bottom border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, gridTop + STATUS_ROWS.length * ROW_H);
  ctx.lineTo(CW, gridTop + STATUS_ROWS.length * ROW_H);
  ctx.stroke();

  // ── 4. Left margin ───────────────────────────────────────────────────
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, LEFT, CH);

  // Row labels in left margin
  STATUS_ROWS.forEach((s, i) => {
    const y = gridTop + i * ROW_H;
    // Color strip on left edge
    ctx.fillStyle = STATUS_COLORS[s];
    ctx.fillRect(0, y, 5, ROW_H);

    // Label
    ctx.fillStyle = 'white';
    ctx.font = `600 10.5px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(STATUS_LABELS[s], 12, y + ROW_H / 2);
  });

  // ── 5. Header bar ────────────────────────────────────────────────────
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(LEFT, 0, gridW + RIGHT_PAD, HEADER_H);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '600 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let h = 0; h <= HOURS; h++) {
    const x = LEFT + h * hourW;
    let label;
    if (h === 0 || h === 24) label = 'Mid';
    else if (h === 12)        label = 'Noon';
    else if (h < 12)          label = `${h}`;
    else                      label = `${h - 12}`;
    ctx.fillText(label, x, HEADER_H / 2);
  }

  // AM / PM labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '500 8px Inter, sans-serif';
  ctx.fillText('AM', LEFT + hourW * 6, HEADER_H / 2 + 8);
  ctx.fillText('PM', LEFT + hourW * 18, HEADER_H / 2 + 8);

  // ── 6. Tick area background ──────────────────────────────────────────
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(LEFT, HEADER_H, gridW + RIGHT_PAD, TICK_AREA_H);

  // "15 min" label hint
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '500 7.5px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('¼ hr ticks', LEFT + 4, HEADER_H + TICK_AREA_H / 2);

  // ── 7. Draw activity bars ────────────────────────────────────────────
  entries.forEach(entry => {
    const rowIdx = STATUS_ROWS.indexOf(entry.status);
    if (rowIdx === -1) return;

    const x = LEFT + entry.start * hourW;
    const w = Math.max((entry.end - entry.start) * hourW, 1.5);
    const y = gridTop + rowIdx * ROW_H;
    const barY = y + 5;
    const barH = ROW_H - 10;

    ctx.fillStyle = STATUS_COLORS[entry.status];
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.roundRect(x, barY, w, barH, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Solid border
    ctx.strokeStyle = STATUS_COLORS[entry.status];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, barY, w, barH, 3);
    ctx.stroke();

    // White label inside bar if wide enough
    if (w > 36) {
      ctx.fillStyle = 'white';
      ctx.font = '500 8.5px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 3, barY, w - 6, barH);
      ctx.clip();
      const label = entry.note || STATUS_LABELS[entry.status];
      ctx.fillText(label.length > 22 ? label.slice(0, 20) + '…' : label, x + 5, barY + barH / 2);
      ctx.restore();
    }
  });

  // ── 8. "Midnight" line at hour 0 ────────────────────────────────────
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(LEFT, gridTop);
  ctx.lineTo(LEFT, gridTop + STATUS_ROWS.length * ROW_H);
  ctx.stroke();
  ctx.setLineDash([]);
}

export default function ELDLogSheet({ log, summary }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) drawAll(canvasRef.current, log.entries || []);
  }, [log]);

  const statusTotals = STATUS_ROWS.map(status => {
    const hrs = (log.entries || [])
      .filter(e => e.status === status)
      .reduce((sum, e) => sum + (e.end - e.start), 0);
    return { status, hrs: Math.round(hrs * 10) / 10 };
  });

  const fmt = (n) => {
    const h = String(Math.floor(n)).padStart(2, '0');
    const m = String(Math.round((n % 1) * 60)).padStart(2, '0');
    return `${h}:${m}`;
  };

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
            <span className="meta-label">Origin</span>
            <span className="meta-value">{summary.current_location?.split(',').slice(0, 2).join(',')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Destination</span>
            <span className="meta-value">{summary.dropoff_location?.split(',').slice(0, 2).join(',')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Carrier</span>
            <span className="meta-value">Property Carrier</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Cycle</span>
            <span className="meta-value">70 hrs / 8 days</span>
          </div>
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="eld-canvas" />
      </div>

      <div className="eld-sheet-footer">
        <div className="status-totals">
          {statusTotals.map(({ status, hrs }) => (
            <div className="status-total" key={status}>
              <span className="st-swatch" style={{ background: STATUS_COLORS[status] }} />
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

      {(log.entries || []).filter(e => e.note).length > 0 && (
        <div className="eld-remarks">
          <h5>Activity Remarks</h5>
          <div className="remarks-list">
            {log.entries.filter(e => e.note).map((e, i) => (
              <div className="remark-item" key={i}>
                <span className="remark-time">{fmt(e.start)} – {fmt(e.end)}</span>
                <span className="remark-swatch" style={{ background: STATUS_COLORS[e.status] || '#64748b' }} />
                <span className="remark-status" style={{ color: STATUS_COLORS[e.status] || '#64748b' }}>
                  {STATUS_LABELS[e.status]}
                </span>
                <span className="remark-note">{e.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
