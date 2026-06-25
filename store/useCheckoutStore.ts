import { create } from "zustand";

interface CheckoutState {
  tierId: string | null;
  buyerName: string;
  buyerPhone: string;
  email: string;
  loading: boolean;
  error: string | null;
  setTierId: (id: string | null) => void;
  setBuyerName: (v: string) => void;
  setBuyerPhone: (v: string) => void;
  setEmail: (v: string) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  tierId: null,
  buyerName: "",
  buyerPhone: "",
  email: "",
  loading: false,
  error: null,
  setTierId: (tierId) => set({ tierId }),
  setBuyerName: (buyerName) => set({ buyerName }),
  setBuyerPhone: (buyerPhone) => set({ buyerPhone }),
  setEmail: (email) => set({ email }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      tierId: null,
      buyerName: "",
      buyerPhone: "",
      email: "",
      loading: false,
      error: null,
    }),
}));
