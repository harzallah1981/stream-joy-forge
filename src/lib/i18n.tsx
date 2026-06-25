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
  read_sign: { fr: "Read & Sign", en: "Read & Sign" },


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
  safa_d03: { fr: "SAFA D03", en: "SAFA D03" },

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
  session_expiring_title: { fr: "Session sur le point d'expirer", en: "Session about to expire" },
  session_expiring_desc: { fr: "Vous serez déconnecté dans {s} secondes pour inactivité.", en: "You will be logged out in {s} seconds due to inactivity." },
  stay_connected: { fr: "Rester connecté", en: "Stay connected" },
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

  // User dashboard
  my_dashboard: { fr: "Mon Tableau de Bord", en: "My Dashboard" },
  my_dashboard_desc: { fr: "Suivi de mes lectures documentaires", en: "Track of my document reading" },
  docs_total: { fr: "Documents disponibles", en: "Available documents" },
  docs_read: { fr: "Documents lus", en: "Documents read" },
  docs_unread: { fr: "Documents à lire", en: "Documents to read" },
  read_now: { fr: "Lire maintenant", en: "Read now" },
  next_doc: { fr: "Suivant", en: "Next" },
  mark_read: { fr: "Marquer comme lu", en: "Mark as read" },
  close: { fr: "Fermer", en: "Close" },
  unread_alert: { fr: "Vous avez des documents non lus", en: "You have unread documents" },

  // Notifications
  notifications: { fr: "Notifications", en: "Notifications" },
  no_notifications: { fr: "Aucune notification", en: "No notifications" },
  notif_new: { fr: "Nouveau document", en: "New document" },
  notif_updated: { fr: "Document mis à jour", en: "Document updated" },
  notif_unread: { fr: "Non lu", en: "Unread" },

  // Conformité section (home)
  kpi_docs: { fr: "Documents en diffusion", en: "Documents in circulation" },
  kpi_personnel: { fr: "Personnel total", en: "Total personnel" },
  kpi_events: { fr: "Evenements securite", en: "Safety events" },
  kpi_training: { fr: "Prochaine formation", en: "Next training" },
  conformite_doc: { fr: "Conformite Documentation", en: "Documentation compliance" },
  conformite_formation: { fr: "Conformite Formation Personnel", en: "Personnel training compliance" },
  resume_safety: { fr: "Resume Securite — Ground Safety 2026", en: "Safety Summary — Ground Safety 2026" },
  events_open: { fr: "Evenements en cours", en: "Open events" },
  events_closed: { fr: "Evenements clotures", en: "Closed events" },
  events_total: { fr: "Total evenements", en: "Total events" },

  // Admin safety controls
  edit_status: { fr: "Modifier statut", en: "Edit status" },
  edit_category: { fr: "Modifier catégorie", en: "Edit category" },
  add_year: { fr: "Nouvelle année", en: "New year" },
  edit: { fr: "Modifier", en: "Edit" },
  save: { fr: "Enregistrer", en: "Save" },

  // IOS form
  reg_ref: { fr: "Référence réglementaire", en: "Regulatory reference" },
  synthesis_findings: { fr: "Synthèse / Findings", en: "Synthesis / Findings" },
  no_findings: { fr: "Aucun écart relevé", en: "No findings recorded" },

  // Login / Auth
  login_title: { fr: "Connexion", en: "Sign in" },
  login_subtitle: { fr: "Connexion / Sign in", en: "Sign in" },
  email_or_username: { fr: "Email ou nom d'utilisateur", en: "Email or username" },
  password: { fr: "Mot de passe", en: "Password" },
  sign_in: { fr: "Se connecter", en: "Sign in" },
  forgot_password: { fr: "Mot de passe oublié ?", en: "Forgot password?" },
  forgot_title: { fr: "Réinitialiser le mot de passe", en: "Reset password" },
  forgot_desc: {
    fr: "Saisissez votre email pour recevoir un lien de réinitialisation.",
    en: "Enter your email to receive a reset link.",
  },
  send_reset_link: { fr: "Envoyer le lien", en: "Send link" },
  reset_link_sent: {
    fr: "Lien de réinitialisation envoyé. Ouverture de la page sécurisée…",
    en: "Reset link sent. Opening secure page…",
  },
  email_unknown: { fr: "Email inconnu", en: "Unknown email" },
  reset_title: { fr: "Définir un nouveau mot de passe", en: "Set a new password" },
  new_password: { fr: "Nouveau mot de passe", en: "New password" },
  confirm_password: { fr: "Confirmer le mot de passe", en: "Confirm password" },
  current_password: { fr: "Mot de passe actuel", en: "Current password" },
  password_updated: { fr: "Mot de passe mis à jour", en: "Password updated" },
  password_mismatch: { fr: "Les mots de passe ne correspondent pas", en: "Passwords do not match" },
  must_change_title: { fr: "Changement de mot de passe requis", en: "Password change required" },
  must_change_desc: {
    fr: "Pour des raisons de sécurité, vous devez changer votre mot de passe avant d'accéder à l'application.",
    en: "For security reasons, you must change your password before using the app.",
  },
  pw_rule_min8: { fr: "Au moins 8 caractères", en: "At least 8 characters" },
  pw_rule_upper: { fr: "Une lettre majuscule", en: "One uppercase letter" },
  pw_rule_lower: { fr: "Une lettre minuscule", en: "One lowercase letter" },
  pw_rule_digit: { fr: "Un chiffre", en: "One digit" },
  pw_rule_special: { fr: "Un caractère spécial", en: "One special character" },
  wrong_current_password: { fr: "Mot de passe actuel incorrect", en: "Incorrect current password" },
  language_fr: { fr: "Français", en: "French" },
  language_en: { fr: "Anglais", en: "English" },
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
