interface TableEmptyStateProps {
  title: string;
  action?: { label: string; onClick: () => void };
}

export function TableEmptyState({ title, action }: TableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-xs text-[#8A817C] font-light">{title}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-8 px-4 text-[11px] font-semibold uppercase tracking-wider border border-[#121212]/15 text-[#121212] hover:bg-[#F4F1EA] rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
