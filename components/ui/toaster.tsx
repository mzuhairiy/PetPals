"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, dataTestId, ...props }) {
        return (
          <Toast key={id} data-testid={dataTestId || "toast"} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle data-testid={dataTestId ? `${dataTestId}-title` : "toast-title"}>{title}</ToastTitle>}
              {description && (
                <ToastDescription data-testid={dataTestId ? `${dataTestId}-description` : "toast-description"}>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose data-testid={dataTestId ? `${dataTestId}-close` : "toast-close"} />
          </Toast>
        )
      })}
      <ToastViewport data-testid="toast-viewport" />
    </ToastProvider>
  )
}
