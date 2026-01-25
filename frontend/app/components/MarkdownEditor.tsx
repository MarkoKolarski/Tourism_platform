import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder, label }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-300 dark:border-gray-600">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-4 py-2 text-sm font-medium ${viewMode === 'edit' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Uređivanje
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 text-sm font-medium ${viewMode === 'preview' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Pregled
          </button>
        </div>

        {viewMode === 'edit' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-96 px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none resize-none"
          />
        ) : (
          <div className="h-96 overflow-auto px-4 py-3 bg-white dark:bg-gray-800 prose dark:prose-invert max-w-none">
            <ReactMarkdown>{value || placeholder || 'Nema sadržaja za prikaz'}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        Podržan Markdown format. Koristite **za bold**, *za italic*, `za kod`, itd.
      </div>
    </div>
  );
}