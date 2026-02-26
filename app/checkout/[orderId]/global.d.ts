// Global type declarations for Midtrans Snap
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: SnapPaymentOptions) => void
    }
  }
}

interface SnapPaymentOptions {
  onSuccess?: (result: unknown) => void
  onPending?: (result: unknown) => void
  onError?: (result: unknown) => void
  onClose?: () => void
}

export {}
