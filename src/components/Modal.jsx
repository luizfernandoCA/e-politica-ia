import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      // Prevent double opening issues
      if (!dialog.open) {
        dialog.showModal();
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = '';
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle native "Escape" press
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e) => {
      e.preventDefault(); // Control close in react state
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  // Light dismiss: Click outside content (on backdrop) to close
  const handleBackdropClick = (e) => {
    if (!dialogRef.current) return;
    const dialogBoundary = dialogRef.current.getBoundingClientRect();
    if (
      e.clientX < dialogBoundary.left ||
      e.clientX > dialogBoundary.right ||
      e.clientY < dialogBoundary.top ||
      e.clientY > dialogBoundary.bottom
    ) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      style={{
        margin: 'auto',
        border: 'none',
        background: 'transparent',
        padding: 0,
        outline: 'none',
      }}
    >
      <div
        className="glass"
        style={{
          width: '90vw',
          maxWidth: '550px',
          padding: '2rem',
          position: 'relative',
          background: 'var(--modal-bg)',
          border: '1px solid var(--modal-border)',
          boxShadow: '0 25px 60px -12px rgba(20, 30, 60, 0.28)',
          color: 'var(--text-white)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--row-alt)',
              color: 'var(--text-gray)',
              border: '1px solid var(--border-color)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-white)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-gray)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>

      <style>{`
        dialog::backdrop {
          background: rgba(20, 30, 60, 0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(8px);
          animation: fadeBackdrop 0.3s ease-out forwards;
        }

        @keyframes fadeBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </dialog>
  );
}
