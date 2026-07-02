"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-[#121212]/10 w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-[#121212]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#8A817C] hover:text-[#121212] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm font-light text-[#8A817C] leading-relaxed pl-11">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-[#121212] border border-[#121212]/10 rounded-lg hover:bg-[#F4F1EA] disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-40 transition-colors"
          >
            {isSubmitting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
