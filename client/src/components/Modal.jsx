import React, { useEffect, useRef } from 'react';
import './modal.css';

export default function Modal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy' }) {
  const titleId = 'app-modal-title';
  const messageId = 'app-modal-message';
  const modalRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    lastFocusedRef.current = document.activeElement;
    const modalElement = modalRef.current;
    if (!modalElement) {
      return undefined;
    }

    const focusable = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) {
      first.focus();
    } else {
      modalElement.focus();
    }

    const onKeyDown = (event) => {
      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    modalElement.addEventListener('keydown', onKeyDown);
    return () => {
      modalElement.removeEventListener('keydown', onKeyDown);
      if (lastFocusedRef.current instanceof HTMLElement) {
        lastFocusedRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (onCancel) {
          onCancel();
          return;
        }
        if (onConfirm) {
          onConfirm();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="custom-modal-overlay">
      <div
        ref={modalRef}
        className="custom-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
      >
        <h3 id={titleId} className="custom-modal-title">{title}</h3>
        <p id={messageId} className="custom-modal-message">{message}</p>
        <div className="custom-modal-actions">
          {onCancel && <button type="button" className="custom-modal-btn cancel" onClick={onCancel}>{cancelText}</button>}
          {onConfirm && <button type="button" className="custom-modal-btn confirm" onClick={onConfirm}>{confirmText}</button>}
        </div>
      </div>
    </div>
  );
}
