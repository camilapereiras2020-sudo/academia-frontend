import { useLayoutEffect } from "react"
import type { Marca } from "@/types"
import { useBrandStore } from "./brandStore"

export function useSetActiveBrand(brand: Marca | null) {
  const setActiveBrand = useBrandStore((s) => s.setActiveBrand)
  useLayoutEffect(() => {
    setActiveBrand(brand)
    return () => setActiveBrand(null)
  }, [brand, setActiveBrand])
}
