import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PdfViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const pdfUrl = queryParams.get('url');

  return (
    <div style={{ width: '100%', height: '100vh', background: '#f5f5f5' }}>
      <div
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: '#ffffff',
          borderBottom: '1px solid #ddd'
        }}
      >
        <h3 style={{ margin: 0 }}>PDF Viewer</h3>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Back
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Open in New Tab
            </a>
          )}
        </div>
      </div>

      {!pdfUrl ? (
        <div style={{ padding: '20px' }}>No PDF URL found.</div>
      ) : (
        <iframe
          src={pdfUrl}
          title="PDF Viewer"
          width="100%"
          height="calc(100vh - 60px)"
          style={{ border: 'none' }}
        />
      )}
    </div>
  );
};

export default PdfViewer;