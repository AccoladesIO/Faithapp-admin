import React from 'react'

const Error = ({error}: {error: string}) => {
  return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700 font-light">
          <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">
              Error
          </strong>
          {error}
      </div>
  )
}

export default Error