import { create } from "zustand"
import type { Marca } from "@/types"

interface BrandState {
  activeBrand: Marca | null
  setActiveBrand: (brand: Marca | null) => void
}

export const useBrandStore = create<BrandState>((set) => ({
  activeBrand: null,
  setActiveBrand: (brand) => set({ activeBrand: brand }),
}))
