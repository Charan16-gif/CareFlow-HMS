import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './ModalPortal';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlaskConical,
  AlertCircle,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

/**
 * Determine the true file extension and MIME type of a document
 */
export const getDocumentInfo = (fileNameOrUrl, blob) => {
  let ext = 'pdf';
  let mimeType = 'application/pdf';

  if (fileNameOrUrl) {
    const clean = String(fileNameOrUrl).split('?')[0].split('#')[0];
    const match = clean.match(/\.([0-9a-z]+)$/i);
    if (match) {
      const parsedExt = match[1].toLowerCase();
      if (['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(parsedExt)) {
        ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
      }
    }
  }

  if (blob && blob.type) {
    if (blob.type.includes('image/jpeg')) {
      ext = 'jpg';
      mimeType = 'image/jpeg';
    } else if (blob.type.includes('image/png')) {
      ext = 'png';
      mimeType = 'image/png';
    } else if (blob.type.includes('image/webp')) {
      ext = 'webp';
      mimeType = 'image/webp';
    } else if (blob.type.includes('application/pdf')) {
      ext = 'pdf';
      mimeType = 'application/pdf';
    }
  }

  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'pdf') mimeType = 'application/pdf';

  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';

  return { ext, mimeType, isImage, isPdf };
};

/**
 * Universal safe report download helper.
 * Enforces correct file extension and MIME type so operating systems never misinterpret JPEG images as broken PDFs.
 */
export const downloadReportFile = (blob, order = {}, customBaseName = 'Lab_Report') => {
  if (!blob) {
    toast.error('Diagnostic report document is not ready.', 'Download Error');
    return;
  }

  const fileNameOrUrl = order.report_file || order.file_name || '';
  const { ext, mimeType } = getDocumentInfo(fileNameOrUrl, blob);
  const orderIdentifier = order.order_id || order.id || 'record';
  const finalFilename = `${customBaseName}_${orderIdentifier}.${ext}`;

  const typedBlob = new Blob([blob], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(typedBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);

  toast.success(`Downloaded ${finalFilename} successfully.`, 'File Downloaded');
};

/**
 * In-Page Document & Lab Report Viewer Modal
 * Displays PDFs, clinical findings, and high-resolution diagnostic images in the same page.
 */
const DocumentViewerModal = ({
  isOpen,
  onClose,
  order = null,
  blob = null,
  loading = false,
  title = '',
  subtitle = '',
}) => {
  const [objectUrl, setObjectUrl] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileNameOrUrl = order?.report_file || order?.file_name || '';
  const { ext, mimeType, isImage, isPdf } = getDocumentInfo(fileNameOrUrl, blob);

  // Maintain blob object URL
  useEffect(() => {
    if (blob) {
      const typedBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);
      setObjectUrl(url);
      setZoomLevel(1);
      setRotation(0);
      return () => {
        window.URL.revokeObjectURL(url);
      };
    }
    setObjectUrl(null);
  }, [blob, mimeType]);

  // Lock body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (isImage && objectUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Diagnostic Report — ${order?.order_id || 'CareFlow HMS'}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: sans-serif; text-align: center; }
                .header { margin-bottom: 20px; text-align: left; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; }
                h2 { color: #0f172a; margin: 0; }
                p { color: #64748b; margin: 4px 0; font-size: 14px; }
                img { max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>CareFlow HMS — Diagnostic Lab Report</h2>
                <p>Order ID: ${order?.order_id || '—'} | Patient: ${order?.patient_name || '—'} | Date: ${order?.completed_at ? new Date(order.completed_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                <p>Test: ${order?.test_name || 'Diagnostic Requisition'} (${order?.test_category || 'Laboratory'})</p>
              </div>
              <img src="${objectUrl}" alt="Diagnostic Report" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      window.print();
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const displayTitle = title || `Diagnostic Lab Report — ${order?.order_id || 'Document'}`;
  const displaySubtitle =
    subtitle ||
    `${order?.patient_name || 'Patient'} • ${order?.test_name || 'Clinical Pathology'} • ${order?.completed_at ? new Date(order.completed_at).toLocaleDateString() : 'Official Hospital Record'}`;

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="admin-modal-backdrop"
        onClick={onClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999,
          background: 'rgba(5, 15, 25, 0.82)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="admin-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '1000px',
            width: '95vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--admin-card-bg, #0b1a28)',
            border: '1px solid var(--admin-border, rgba(56, 189, 248, 0.25))',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <div
            className="admin-modal-header"
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--admin-border, rgba(255, 255, 255, 0.1))',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FlaskConical size={20} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--admin-heading-color, #ffffff)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{displayTitle}</span>
                  <span
                    className="admin-badge admin-badge-teal"
                    style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                  >
                    {isPdf ? 'PDF Document' : isImage ? `${ext.toUpperCase()} Image` : 'Diagnostic Report'}
                  </span>
                </h3>
                <p
                  style={{
                    margin: '0.2rem 0 0 0',
                    fontSize: '0.8rem',
                    color: 'var(--admin-text-muted, #94a3b8)',
                  }}
                >
                  {displaySubtitle}
                </p>
              </div>
            </div>

            {/* Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isImage && objectUrl && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '0.2rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={handleRotate}
                    title="Rotate 90°"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <RotateCw size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>
              )}

              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }}
                onClick={handlePrint}
                title="Print Document"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }}
                onClick={() => downloadReportFile(blob, order)}
                disabled={!blob || loading}
                title="Download Document"
              >
                <Download size={15} />
                <span>Download</span>
              </button>

              <button
                type="button"
                className="admin-icon-btn"
                onClick={onClose}
                aria-label="Close document viewer"
                style={{ width: '32px', height: '32px', marginLeft: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body: Document Preview */}
          <div
            className="admin-modal-body"
            style={{
              padding: 0,
              flex: 1,
              overflowY: 'auto',
              maxHeight: 'calc(92vh - 140px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#040d16',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '4rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--admin-text-muted, #94a3b8)',
                }}
              >
                <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
                <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                  Retrieving diagnostic document from secure storage...
                </p>
              </div>
            ) : objectUrl && isPdf ? (
              <div style={{ width: '100%', height: '620px', background: '#0a1926' }}>
                <iframe
                  src={objectUrl}
                  title="PDF Diagnostic Report"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            ) : objectUrl && isImage ? (
              <div
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, #03080e 100%)',
                  overflow: 'auto',
                }}
              >
                <div
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    maxWidth: '100%',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={objectUrl}
                    alt={order?.test_name || 'Diagnostic Laboratory Report'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '560px',
                      borderRadius: '8px',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  color: 'var(--admin-text-muted, #94a3b8)',
                }}
              >
                <AlertCircle size={38} style={{ color: '#f59e0b', marginBottom: '0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                  No Direct File Preview Available
                </h4>
                <p style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.85rem' }}>
                  The diagnostic test findings and clinical values are displayed in the record summary below.
                </p>
              </div>
            )}

            {/* Structured Clinical Test Findings Card */}
            {order && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                      Patient Details
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                      {order.patient_name || '—'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'block' }}>
                      ID: {order.patient_identifier || `PAT-${order.patient || '—'}`}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                      Diagnostic Test
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                      {order.test_name || '—'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>
                      Category: {order.test_category || 'Laboratory'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                      Quantitative Result
                    </span>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: order.result_value ? '#10b981' : '#94a3b8',
                      }}
                    >
                      {order.result_value
                        ? `${order.result_value} ${order.result_unit || ''}`
                        : 'Awaiting Result'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>
                      Normal Range: {order.reference_range_used || order.test_reference_range || 'Normal'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                      Ordering Doctor
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#ffffff' }}>
                      {order.doctor_name || 'Assigned Physician'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>
                      {order.completed_at
                        ? `Verified ${new Date(order.completed_at).toLocaleDateString()}`
                        : 'Ordered by Clinical Staff'}
                    </span>
                  </div>
                </div>

                {order.result_interpretation && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                      Clinical Pathologist Interpretation
                    </span>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#e2e8f0' }}>
                      {order.result_interpretation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

DocumentViewerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  order: PropTypes.object,
  blob: PropTypes.instanceOf(Blob),
  loading: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

export default DocumentViewerModal;
