import React, { useRef } from 'react';
import ELDLogSheet from './ELDLogSheet';
import './ELDLogs.css';

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: white; color: #1e293b; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');

  .eld-sheet {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 32px;
    page-break-inside: avoid;
    overflow: hidden;
    background: white;
  }
  .eld-sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    background: #0f172a;
    color: white;
    flex-wrap: wrap;
    gap: 10px;
  }
  .eld-sheet-title { display: flex; align-items: center; gap: 10px; }
  .day-badge {
    background: #f59e0b;
    color: #0f172a;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Space Grotesk', Arial, sans-serif;
  }
  .eld-sheet-title h4 { color: white; font-size: 13px; font-family: 'Space Grotesk', Arial, sans-serif; }
  .eld-date { font-size: 11px; color: rgba(255,255,255,0.55); display: block; margin-top: 1px; }
  .eld-sheet-meta { display: flex; gap: 18px; }
  .meta-item { display: flex; flex-direction: column; gap: 1px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); }
  .meta-value { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.85); }

  .canvas-wrapper { padding: 12px 16px 6px; background: white; }
  .eld-canvas { display: block; width: 100%; border: 1px solid #e2e8f0; border-radius: 4px; }

  .eld-sheet-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    flex-wrap: wrap;
    gap: 8px;
  }
  .status-totals { display: flex; gap: 14px; flex-wrap: wrap; }
  .status-total { display: flex; align-items: center; gap: 5px; font-size: 11px; }
  .st-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .st-label { color: #64748b; }
  .st-hrs { font-weight: 600; color: #1e293b; }
  .duty-totals { display: flex; gap: 14px; }
  .dt-item { display: flex; flex-direction: column; align-items: flex-end; font-size: 11px; color: #64748b; }
  .dt-item strong { font-size: 14px; color: #1e293b; font-family: 'Space Grotesk', Arial, sans-serif; }

  .eld-remarks { padding: 10px 16px 12px; border-top: 1px solid #e2e8f0; }
  .eld-remarks h5 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; margin-bottom: 6px; }
  .remarks-list { display: flex; flex-direction: column; gap: 3px; }
  .remark-item { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 3px 6px; background: #f8fafc; border-radius: 4px; }
  .remark-time { color: #64748b; min-width: 95px; font-size: 10px; }
  .remark-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .remark-status { font-weight: 500; min-width: 130px; }
  .remark-note { color: #64748b; }

  @page { size: A4; margin: 15mm 12mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .eld-sheet { page-break-inside: avoid; }
  }
`;

export default function ELDLogs({ logs, summary }) {
  const sheetsRef = useRef([]);

  const handlePrint = () => {
    // Collect canvas data URLs from each sheet's canvas element
    const canvasImages = sheetsRef.current.map(el => {
      if (!el) return null;
      const canvas = el.querySelector('canvas');
      return canvas ? canvas.toDataURL('image/png') : null;
    });

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow popups for this site to print.'); return; }

    // Build HTML — replace each canvas with an <img> using the data URL
    let bodyHtml = '';
    logs.forEach((log, i) => {
      const imgSrc = canvasImages[i];
      const statusColors = {
        off_duty: '#64748b', sleeper: '#8b5cf6', driving: '#2563eb', on_duty: '#f59e0b'
      };
      const statusLabels = {
        off_duty: 'Off Duty', sleeper: 'Sleeper Berth', driving: 'Driving', on_duty: 'On Duty (Not Driving)'
      };
      const rows = ['off_duty','sleeper','driving','on_duty'];

      const totalsHtml = rows.map(s => {
        const hrs = log.entries.filter(e=>e.status===s).reduce((sum,e)=>sum+(e.end-e.start),0);
        return `<div class="status-total">
          <span class="st-dot" style="background:${statusColors[s]}"></span>
          <span class="st-label">${statusLabels[s]}</span>
          <span class="st-hrs">${Math.round(hrs*10)/10} hrs</span>
        </div>`;
      }).join('');

      const remarksHtml = log.entries.filter(e=>e.note).map(e => {
        const sh = String(Math.floor(e.start)).padStart(2,'0');
        const sm = String(Math.round((e.start%1)*60)).padStart(2,'0');
        const eh = String(Math.floor(e.end)).padStart(2,'0');
        const em = String(Math.round((e.end%1)*60)).padStart(2,'0');
        return `<div class="remark-item">
          <span class="remark-time">${sh}:${sm} – ${eh}:${em}</span>
          <span class="remark-dot" style="background:${statusColors[e.status]||'#64748b'}"></span>
          <span class="remark-status">${statusLabels[e.status]||e.status}</span>
          <span class="remark-note">${e.note}</span>
        </div>`;
      }).join('');

      bodyHtml += `
        <div class="eld-sheet">
          <div class="eld-sheet-header">
            <div class="eld-sheet-title">
              <span class="day-badge">Day ${log.day}</span>
              <div>
                <h4>Driver's Daily Log</h4>
                <span class="eld-date">${log.date}</span>
              </div>
            </div>
            <div class="eld-sheet-meta">
              <div class="meta-item">
                <span class="meta-label">Origin</span>
                <span class="meta-value">${(summary.current_location||'').split(',').slice(0,2).join(',')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Destination</span>
                <span class="meta-value">${(summary.dropoff_location||'').split(',').slice(0,2).join(',')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Carrier Type</span>
                <span class="meta-value">Property Carrier</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Cycle</span>
                <span class="meta-value">70 hrs / 8 days</span>
              </div>
            </div>
          </div>
          <div class="canvas-wrapper">
            ${imgSrc ? `<img src="${imgSrc}" class="eld-canvas" style="width:100%;height:auto;" />` : '<p style="color:#64748b;font-size:12px;padding:8px">Log grid unavailable</p>'}
          </div>
          <div class="eld-sheet-footer">
            <div class="status-totals">${totalsHtml}</div>
            <div class="duty-totals">
              <div class="dt-item"><span>Total Driving</span><strong>${log.total_driving} hrs</strong></div>
              <div class="dt-item"><span>Total On Duty</span><strong>${log.total_on_duty} hrs</strong></div>
            </div>
          </div>
          ${remarksHtml ? `<div class="eld-remarks"><h5>Remarks / Activity Log</h5><div class="remarks-list">${remarksHtml}</div></div>` : ''}
        </div>`;
    });

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>ELD Log Sheets — ${summary.current_location} to ${summary.dropoff_location}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0f172a;">
    <div style="font-family:'Space Grotesk',Arial,sans-serif;font-size:20px;font-weight:700;color:#0f172a;">
      ELD Daily Log Sheets
    </div>
    <div style="font-size:12px;color:#64748b;margin-top:4px;font-family:Arial,sans-serif;">
      ${summary.current_location} &rarr; ${summary.pickup_location} &rarr; ${summary.dropoff_location}
      &nbsp;&nbsp;|&nbsp;&nbsp; ${summary.total_miles} miles &nbsp;&nbsp;|&nbsp;&nbsp; ${logs.length} day${logs.length!==1?'s':''}
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div className="eld-logs">
      <div className="eld-logs-header">
        <div>
          <h3>Daily Log Sheets</h3>
          <p>{logs.length} log sheet{logs.length !== 1 ? 's' : ''} generated</p>
        </div>
        <button className="print-btn" onClick={handlePrint}>
          🖨️ Print / Save PDF
        </button>
      </div>
      <div>
        {logs.map((log, i) => (
          <div key={log.day} ref={el => sheetsRef.current[i] = el}>
            <ELDLogSheet log={log} summary={summary} />
          </div>
        ))}
      </div>
    </div>
  );
}
