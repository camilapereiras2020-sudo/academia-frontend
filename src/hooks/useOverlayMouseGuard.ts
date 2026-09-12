import { useRef } from "react"

// A click on the backdrop only closes the modal if BOTH the mousedown and
// the click landed on the backdrop itself. Without this, selecting text
// inside the modal (mousedown on an input, drag, mouseup over the backdrop)
// fires a native click on the backdrop and closes the modal, silently
// discarding whatever was being typed.
export function useOverlayMouseGuard(onClose: () => void) {
  const downOnOverlay = useRef(false)
  return {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      downOnOverlay.current = e.target === e.currentTarget
    },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (downOnOverlay.current && e.target === e.currentTarget) onClose()
    },
  }
}
