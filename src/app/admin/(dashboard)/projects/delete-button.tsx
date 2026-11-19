'use client';

import { useState, useTransition } from 'react';
import { deleteProjectAction } from '@/lib/projects/actions';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteProjectButtonProps {
  id: string;
  title: string;
}

export function DeleteProjectButton({ id, title }: DeleteProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setErrorMessage(null);
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteProjectAction(id);
        if (result?.error) {
          setErrorMessage(result.error);
        }
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'An unexpected error occurred while deleting.'
        );
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/30"
        aria-label={`Delete ${title}`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        <span>Delete</span>
      </button>
      {errorMessage && (
        <span role="alert" className="mt-1 text-[10px] text-red-600 dark:text-red-400">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
