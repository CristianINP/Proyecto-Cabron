// src/components/Common/Modal.js
import React from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'confirm', // 'confirm', 'alert', 'success', 'error'
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={48} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={48} />;
      case 'alert':
        return <AlertCircle className="text-yellow-500" size={48} />;
      default:
        return <AlertCircle className="text-blue-500" size={48} />;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          {type === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-emerald-600 transition"
              >
                {confirmText}
              </button>
            </>
          )}
          {type !== 'confirm' && (
            <button
              onClick={() => {
                if (onConfirm) onConfirm(); // Ejecutar acción si existe
                onClose();
              }}
              className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-emerald-600 transition"
            >
              Entendido
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Modal;