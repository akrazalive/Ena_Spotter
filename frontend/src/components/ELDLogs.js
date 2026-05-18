import React, { useRef } from 'react';
import ELDLogSheet from './ELDLogSheet';
import './ELDLogs.css';

export default function ELDLogs({ logs, summary }) {
  const printRef = useRef();

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head>
        <title>ELD Log Sheets</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
        <style>
          body { font-family: Inter, sans-serif; background: white; margin: 0; }
          @media print { .no-print { display: none; } }
        </style>
      </head><body>${printContents}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="eld-logs">
      <div className="eld-logs-header">
        <div>
          <h3>Daily Log Sheets</h3>
          <p>{logs.length} log sheet{logs.length !== 1 ? 's' : ''} generated</p>
        </div>
        <button className="print-btn" onClick={handlePrint}>
          🖨️ Print All Logs
        </button>
      </div>
      <div ref={printRef}>
        {logs.map((log) => (
          <ELDLogSheet key={log.day} log={log} summary={summary} />
        ))}
      </div>
    </div>
  );
}
