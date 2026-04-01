"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  MiniBoStore,
  ProductDraft,
  ProductImportResult,
  ProductionNote,
  ReportType,
  StoreMutationResponse
} from "@/lib/types";

interface MiniBoStoreContextValue {
  ready: boolean;
  loading: boolean;
  error: string | null;
  store: MiniBoStore;
  refreshStore: () => Promise<void>;
  ensureSession: (shiftId: string, brandCode: string, reportType: ReportType) => Promise<void>;
  updateRowProduct: (sessionId: string, rowId: string, productId: string) => Promise<void>;
  updateRowQuantity: (sessionId: string, rowId: string, quantityCartons: number) => Promise<void>;
  addRow: (sessionId: string) => Promise<void>;
  deleteRow: (sessionId: string, rowId: string) => Promise<void>;
  addNote: (sessionId: string, note: Omit<ProductionNote, "id" | "createdAt">) => Promise<void>;
  submitSession: (sessionId: string) => Promise<void>;
  approveSession: (sessionId: string) => Promise<void>;
  addProduct: (product: ProductDraft) => Promise<void>;
  importProducts: (products: ProductDraft[]) => Promise<ProductImportResult | undefined>;
  setProductActive: (productId: string, isActive: boolean) => Promise<void>;
}

const MiniBoStoreContext = createContext<MiniBoStoreContextValue | null>(null);

const emptyStore: MiniBoStore = {
  brands: [],
  products: [],
  shifts: [],
  reportTemplates: [],
  requiredRows: [],
  users: [],
  sessions: []
};

export function MiniBoStoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<MiniBoStore>(emptyStore);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStore = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/store", {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json()) as { message?: string; store?: MiniBoStore };

      if (!response.ok || !payload.store) {
        throw new Error(payload.message ?? "تعذر تحميل البيانات");
      }

      setStore(payload.store);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل البيانات");
    } finally {
      setReady(true);
      setLoading(false);
    }
  }, []);

  const mutateStore = useCallback(
    async <T,>(input: Record<string, unknown>) => {
      const response = await fetch("/api/store/mutate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      const payload = (await response.json()) as StoreMutationResponse<T> & { message?: string };

      if (!response.ok || !payload.store) {
        throw new Error(payload.message ?? "تعذر تنفيذ العملية");
      }

      setStore(payload.store);
      setError(null);
      return payload.result;
    },
    []
  );

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  const value = useMemo<MiniBoStoreContextValue>(
    () => ({
      ready,
      loading,
      error,
      store,
      refreshStore,
      ensureSession: async (shiftId, brandCode, reportType) => {
        await mutateStore({
          action: "ensureSession",
          shiftId,
          brandCode,
          reportType
        });
      },
      updateRowProduct: async (sessionId, rowId, productId) => {
        await mutateStore({
          action: "updateRowProduct",
          sessionId,
          rowId,
          productId
        });
      },
      updateRowQuantity: async (sessionId, rowId, quantityCartons) => {
        await mutateStore({
          action: "updateRowQuantity",
          sessionId,
          rowId,
          quantityCartons
        });
      },
      addRow: async (sessionId) => {
        await mutateStore({
          action: "addRow",
          sessionId
        });
      },
      deleteRow: async (sessionId, rowId) => {
        await mutateStore({
          action: "deleteRow",
          sessionId,
          rowId
        });
      },
      addNote: async (sessionId, note) => {
        await mutateStore({
          action: "addNote",
          sessionId,
          note
        });
      },
      submitSession: async (sessionId) => {
        await mutateStore({
          action: "submitSession",
          sessionId
        });
      },
      approveSession: async (sessionId) => {
        await mutateStore({
          action: "approveSession",
          sessionId
        });
      },
      addProduct: async (product) => {
        await mutateStore({
          action: "addProduct",
          product
        });
      },
      importProducts: async (products) =>
        mutateStore<ProductImportResult>({
          action: "importProducts",
          products
        }),
      setProductActive: async (productId, isActive) => {
        await mutateStore({
          action: "setProductActive",
          productId,
          isActive
        });
      }
    }),
    [error, loading, mutateStore, ready, refreshStore, store]
  );

  return <MiniBoStoreContext.Provider value={value}>{children}</MiniBoStoreContext.Provider>;
}

export const useMiniBoStore = () => {
  const context = useContext(MiniBoStoreContext);
  if (!context) {
    throw new Error("useMiniBoStore must be used inside MiniBoStoreProvider");
  }
  return context;
};
