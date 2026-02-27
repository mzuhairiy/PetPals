import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format price in IDR (Indonesian Rupiah)
// The database already stores prices in IDR, so we just format them nicely
export function formatPrice(priceInIDR: number): string {
  return `Rp ${priceInIDR.toLocaleString('id-ID')}`
}

// Format number as IDR currency (without Rp prefix)
export function formatPriceIDR(priceInIDR: number): string {
  return priceInIDR.toLocaleString('id-ID')
}
