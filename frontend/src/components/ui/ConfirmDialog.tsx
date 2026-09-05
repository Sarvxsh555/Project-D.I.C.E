import { Modal } from './Modal'
import { Button } from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose?: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmLabel?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
  onCancel?: () => void
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onCancel,
}: ConfirmDialogProps) {
  const handleClose = onCancel || onClose || (() => {})
  const actionText = confirmText || confirmLabel || 'Confirm'
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {actionText}
          </Button>
        </>
      }
    >
      <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  )
}
