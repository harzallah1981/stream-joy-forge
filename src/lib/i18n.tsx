import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

type Dict = Record<string, { fr: string; en: string }>;

export const dict: Dict = {
  app_title: { fr: "Tunisair", en: "Tunisair" },
  app_subtitle: { fr: "Ground Ops · EDMS", en: "Ground Ops · EDMS" },
  language: { fr: "Langue", en: "Language" },

  // Sidebar section labels (uppercase)
  documentation: { fr: "Documentation", en: "Documentation" },
  personnel: { fr: "Personnel & Formation", en: "Personnel & Training" },
  safety: { fr: "Safety", en: "Safety" },
  admin: { fr: "Administration", en: "Administration" },

  dashboard: { fr: "Tableau de Bord", en: "Dashboard" },

  // Documentation children
  docs_internes: { fr: "Documents Internes", en: "Internal Documents" },
  docs_externes: { fr: "Documents Externes", en: "External Documents" },
  forms: { fr: "Forms", en: "Forms" },

  // Internes children
  gom: { fr: "GOM", en: "GOM" },
  dam: { fr: "DAM", en: "DAM" },
  pos_ios: { fr: "POS / IOS", en: "POS / IOS" },
  dow_doi: { fr: "DOW-DOI", en: "DOW-DOI" },
  ahm_fleet: { fr: "AHM fleet", en: "AHM fleet" },
  load_trim: { fr: "Load and trim sheets fleet", en: "Load and trim sheets fleet" },
  loading_instr: { fr: "Loading Instructions reports fleet", en: "Loading Instructions reports fleet" },
  cdn: { fr: "CDN", en: "CDN" },
  ceirb: { fr: "CEIRB", en: "CEIRB" },
  c_immat: { fr: "C-IMMATRICULATION", en: "C-IMMATRICULATION" },
  cln: { fr: "CLN", en: "CLN" },
  aoc: { fr: "AOC", en: "AOC" },

  // POS/IOS sub-children
  pos_427: { fr: "POS 427", en: "POS 427" },
  pos_428: { fr: "POS 428", en: "POS 428" },
  pos_429: { fr: "POS 429", en: "POS 429" },
  ios_428_01: { fr: "IOS 428-01", en: "IOS 428-01" },
  ios_428_02: { fr: "IOS 428-02", en: "IOS 428-02" },
  ios_429_01: { fr: "IOS 429-01", en: "IOS 429-01" },
  ios_429_02: { fr: "IOS 429-02", en: "IOS 429-02" },

  // DOW-DOI children
  a320_fleet: { fr: "A320 fleet", en: "A320 fleet" },
  a330_243: { fr: "A330-243", en: "A330-243" },

  // Externes children
  dgac: { fr: "DOC DGAC", en: "DGAC Documents" },
  iata: { fr: "DOC IATA", en: "IATA Documents" },
  affretees: { fr: "A/C Affrétées", en: "Chartered Aircraft" },

  // Forms
  ahm_650: { fr: "Ground Damages Incident report / AHM 650", en: "Ground Damages Incident report / AHM 650" },
  dg_incident: { fr: "DG Incident report", en: "DG Incident report" },
  ios_428_01_checklist: { fr: "IOS 428-01 check list", en: "IOS 428-01 check list" },

  // Personnel
  liste_personnel: { fr: "Liste de Personnel", en: "Personnel list" },
  suivi_formation: { fr: "Suivi de Formation", en: "Training tracking" },

  // Safety
  registre_evt: { fr: "Registre Evenements", en: "Events register" },
  indic_spi: { fr: "Indicateurs SPI", en: "SPI indicators" },

  // Admin
  gestion_users: { fr: "Gestion Utilisateurs", en: "User management" },
  credentials: { fr: "Credentials & Mots de Passe", en: "Credentials & passwords" },
  accuses: { fr: "Accuses de Reception", en: "Acknowledgements" },

  // UI
  search: { fr: "Rechercher...", en: "Search..." },
  submit: { fr: "Soumettre", en: "Submit" },
  reset: { fr: "Réinitialiser", en: "Reset" },
  cancel: { fr: "Annuler", en: "Cancel" },
  send: { fr: "Envoyer", en: "Send" },
  logout: { fr: "Deconnexion", en: "Logout" },
  email_to: { fr: "Adresse email du destinataire", en: "Recipient email address" },
  email_modal_title: { fr: "Envoyer le formulaire", en: "Send the form" },
  email_modal_desc: {
    fr: "Saisissez l'adresse email à laquelle envoyer ce formulaire complété.",
    en: "Enter the email address to send this completed form to.",
  },
  sent_ok: { fr: "Formulaire envoyé avec succès", en: "Form submitted successfully" },
  sent_err: { fr: "Erreur lors de l'envoi", en: "Error while submitting" },
  coming_soon: { fr: "Section en cours de préparation.", en: "Section coming soon." },
  upload_docs: { fr: "Téléverser les documents", en: "Upload documents" },
  home: { fr: "Accueil", en: "Home" },
  welcome: { fr: "Tableau de Bord", en: "Dashboard" },
  welcome_desc: {
    fr: "Vue d'ensemble des operations sol & conformite",
    en: "Overview of ground operations & compliance",
  },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof typeof dict | string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("lang") as Lang | null;
    if (saved === "fr" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("lang", l);
  };

  const t = (k: string) => {
    const entry = (dict as Record<string, { fr: string; en: string }>)[k];
    return entry ? entry[lang] : k;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
