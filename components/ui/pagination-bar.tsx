"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  } | null;
  onPage: (page: number) => void;
  isLoading?: boolean;
  label?: string;
}

export function PaginationBar({
  pagination,
  onPage,
  isLoading = false,
  label = "records",
}: PaginationBarProps) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.totalCount);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#121212]/8">
      <p className="text-[11px] text-[#8A817C] font-mono">
        Showing{" "}
        <span className="text-[#121212] font-semibold">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="text-[#121212] font-semibold">
          {pagination.totalCount}
        </span>{" "}
        {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(pagination.page - 1)}
          disabled={pagination.page <= 1 || isLoading}
          className="h-7 w-7 flex items-center justify-center border border-[#121212]/10 rounded-md hover:bg-[#F4F1EA] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#8A817C]" />
        </button>

        <span className="text-[11px] text-[#8A817C] font-mono tabular-nums">
          {pagination.page} / {pagination.totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || isLoading}
          className="h-7 w-7 flex items-center justify-center border border-[#121212]/10 rounded-md hover:bg-[#F4F1EA] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-[#8A817C]" />
        </button>
      </div>
    </div>
  );
}
