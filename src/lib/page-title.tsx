import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type PageMeta = { title: string; subtitle?: string };

const Ctx = createContext<{
  meta: PageMeta;
  setMeta: (m: PageMeta) => void;
} | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({ title: "Tableau de Bord" });
  return <Ctx.Provider value={{ meta, setMeta }}>{children}</Ctx.Provider>;
}

export function usePageMeta() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePageMeta must be inside PageTitleProvider");
  return c;
}

export function usePageTitle(title: string, subtitle?: string) {
  const { setMeta } = usePageMeta();
  useEffect(() => {
    setMeta({ title, subtitle });
  }, [title, subtitle, setMeta]);
}
