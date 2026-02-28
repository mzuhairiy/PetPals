"use client"

import { useState, useCallback } from "react"
import Image, { ImageProps } from "next/image"

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string
}

export function SafeImage({ 
  src, 
  fallbackSrc = "/placeholder.svg?height=400&width=400", 
  alt,
  fill,
  ...props 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true)
      // Add unique param to bypass cache when using placeholder
      const cacheBuster = `?t=${Date.now()}`
      setImgSrc(fallbackSrc.includes('?') ? `${fallbackSrc}${cacheBuster}` : `${fallbackSrc}${cacheBuster}`)
    }
  }, [fallbackSrc, hasError])

  // Reset error state when src changes
  const handleLoad = useCallback(() => {
    setHasError(false)
  }, [])

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      fill={fill}
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}
