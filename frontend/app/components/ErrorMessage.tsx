interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ 
  title = "Došlo je do greške", 
  message, 
  onRetry 
}: ErrorMessageProps) {
  return (
    <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
            {title}
          </h3>
          <p className="text-red-800 dark:text-red-300">
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 btn btn-secondary text-sm"
            >
              Pokušaj Ponovo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
