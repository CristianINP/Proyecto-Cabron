// src/components/Common/Modal.js
import React, { useState } from 'react';
import { X } from 'lucide-react';

const TYPE_CONFIG = {
  confirm: {
    emoji: '🍳',
    animation: 'animate-bounce',
    headerGradient: 'from-food-50 to-cream-100',
    headerBorder: 'border-food-200',
    titleColor: 'text-food-800',
    confirmBtn: 'bg-gradient-to-r from-food-500 to-food-600 hover:from-food-600 hover:to-food-700 shadow-food',
    cancelBtn: 'bg-white border-2 border-food-200 text-food-700 hover:bg-food-50 hover:border-food-300',
  },
  success: {
    emoji: '🎉',
    animation: 'animate-bounce',
    headerGradient: 'from-green-50 to-emerald-50',
    headerBorder: 'border-green-200',
    titleColor: 'text-green-800',
    confirmBtn: 'bg-gradient-to-r from-fresh-500 to-fresh-600 hover:from-fresh-600 hover:to-fresh-700 shadow-green',
    cancelBtn: '',
  },
  error: {
    emoji: '😱',
    animation: 'animate-wiggle',
    headerGradient: 'from-red-50 to-orange-50',
    headerBorder: 'border-red-200',
    titleColor: 'text-red-800',
    confirmBtn: 'bg-gradient-to-r from-tomato-500 to-tomato-600 hover:from-tomato-600 hover:to-tomato-700 shadow-red',
    cancelBtn: '',
  },
  alert: {
    emoji: '⚠️',
    animation: 'animate-pulse',
    headerGradient: 'from-yellow-50 to-amber-50',
    headerBorder: 'border-yellow-200',
    titleColor: 'text-yellow-800',
    confirmBtn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-orange',
    cancelBtn: '',
  },
};

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}) => {
  const [emojiPopped, setEmojiPopped] = useState(false);

  if (!isOpen) return null;

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.confirm;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="card-food rounded-2xl max-w-md w-full overflow-hidden modal-food-enter">

        {/* Header */}
        <div className={`bg-gradient-to-r ${cfg.headerGradient} border-b-2 ${cfg.headerBorder} px-6 pt-6 pb-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              {/* Emoji interactivo: animado en reposo, "pop" al hacer hover */}
              <span
                className={`text-5xl select-none cursor-default inline-block transition-transform duration-150
                  ${emojiPopped ? 'scale-150' : cfg.animation}`}
                onMouseEnter={() => setEmojiPopped(true)}
                onMouseLeave={() => setEmojiPopped(false)}
              >
                {cfg.emoji}
              </span>
              <h3 className={`text-xl font-bold ${cfg.titleColor} font-cooking leading-tight`}>
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-food-600 transition-all duration-300 hover:rotate-90 mt-0.5"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 text-gray-600 text-sm leading-relaxed">
          {message}
        </div>

        {/* Botones */}
        <div className="px-6 pb-6 flex gap-3">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className={`flex-1 ${cfg.cancelBtn} py-3 px-4 rounded-xl font-semibold transition-all duration-200 active:scale-95`}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 ${cfg.confirmBtn} text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              className={`flex-1 ${cfg.confirmBtn} text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95`}
            >
              Entendido
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modal-food-enter {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .modal-food-enter {
          animation: modal-food-enter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default Modal;
