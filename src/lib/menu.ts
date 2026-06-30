// Menu config — each node has a translation key and either a route or children
import {
  FileText,
  FolderOpen,
  ClipboardList,
  ShieldAlert,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type MenuNode = {
  key: string;
  to?: string;
  children?: MenuNode[];
};

export type MenuGroup = {
  key: string;
  label?: string;
  icon?: LucideIcon;
  items: MenuNode[];
};

const stub = (slug: string) => `/page/${slug}`;

export const MENU_GROUPS: MenuGroup[] = [
  {
    key: "dashboard",
    items: [{ key: "dashboard", to: "/" }],
  },
  {
    key: "documentation",
    label: "documentation",
    icon: FolderOpen,
    items: [
      {
        key: "docs_internes",
        children: [
          { key: "gom", to: stub("gom") },
          { key: "dam", to: stub("dam") },
          {
            key: "pos_ios",
            children: [
              { key: "pos_427", to: stub("pos-427") },
              { key: "pos_428", to: stub("pos-428") },
              { key: "pos_429", to: stub("pos-429") },
              { key: "ios_428_01", to: stub("ios-428-01") },
              { key: "ios_428_02", to: stub("ios-428-02") },
              { key: "ios_429_01", to: stub("ios-429-01") },
              { key: "ios_429_02", to: stub("ios-429-02") },
            ],
          },
          {
            key: "dow_doi",
            children: [
              { key: "a320_fleet", to: stub("dow-doi-a320") },
              { key: "a330_243", to: stub("dow-doi-a330-243") },
            ],
          },
          { key: "ahm_fleet", to: stub("ahm-fleet") },
          { key: "load_trim", to: stub("load-trim-fleet") },
          { key: "loading_instr", to: stub("loading-instructions-fleet") },
          { key: "cdn", to: stub("cdn") },
          { key: "ceirb", to: stub("ceirb") },
          { key: "c_immat", to: stub("c-immatriculation") },
          { key: "cln", to: stub("cln") },
          { key: "aoc", to: stub("aoc") },
          { key: "notes_flash", to: stub("notes-flash") },
        ],
      },
      {
        key: "docs_externes",
        children: [
          { key: "dgac", to: stub("dgac") },
          { key: "iata", to: stub("iata") },
          { key: "affretees", to: stub("ac-affretees") },
          { key: "safa_d03", to: stub("safa-d03") },
        ],
      },
      {
        key: "forms",
        children: [
          { key: "ahm_650", to: "/forms/ahm-650" },
          { key: "dg_incident", to: "/forms/dg-incident" },
          { key: "ios_428_01_checklist", to: "/forms/ios-428-01" },
        ],
      },
      { key: "read_sign", to: "/read-sign" },
    ],
  },

  {
    key: "safety",
    label: "safety",
    icon: ShieldAlert,
    items: [
      { key: "registre_evt", to: "/safety/events" },
      { key: "indic_spi", to: "/safety/spi" },
      { key: "safa_d03_module", to: "/safety/safa-d03" },
    ],
  },
  {
    key: "admin",
    label: "admin",
    icon: Settings,
    items: [
      { key: "gestion_users", to: stub("gestion-utilisateurs") },
      { key: "credentials", to: stub("credentials") },
      { key: "accuses", to: stub("accuses-reception") },
      { key: "form_recipients", to: "/admin/recipients" },
      { key: "archives", to: "/admin/archives" },
    ],
  },
];

export const MENU = MENU_GROUPS.flatMap((g) => g.items);
export const DASHBOARD_ICON = LayoutDashboard;
export const FORMS_ICON = ClipboardList;
export const DOCS_ICON = FileText;
