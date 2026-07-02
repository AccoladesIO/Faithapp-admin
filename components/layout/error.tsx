import React from 'react'
import { X } from 'lucide-react'

const Error = ({error, onDismiss}: {error: string; onDismiss?: () => void}) => {
  return (
      <div className="relative bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700 font-light">
          <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">
              Error
          </strong>
          {error}
          {onDismiss && (
              <button
                  onClick={onDismiss}
                  className="absolute top-3 right-3 p-0.5 text-red-400 hover:text-red-700 transition-colors"
                  aria-label="Dismiss"
              >
                  <X className="w-3.5 h-3.5" />
              </button>
          )}
      </div>
  )
}

export default Error