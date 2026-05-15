interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = "确认",
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-black/70">
      <div className="w-full max-w-sm bg-salem-bg-secondary border border-salem-text-secondary/30 rounded-card shadow-card p-6">
        <h3 className="font-heading text-lg text-salem-accent-gold mb-3">
          {title}
        </h3>
        <p className="text-sm text-salem-text-primary/80 leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          {onCancel && cancelText && (
            <button className="btn-secondary flex-1" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className="btn-primary flex-1" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
