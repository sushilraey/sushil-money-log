export const theme = {
  dark: {
    bg: "#080D1B",
    panel: "rgba(255,255,255,0.085)",
    panelStrong: "rgba(255,255,255,0.13)",
    border: "rgba(255,255,255,0.16)",
    text: "#F6F7FB",
    muted: "#A6AEC3",
    primary: "#8C72FF",
    secondary: "#37D3C0",
    income: "#46D7A1",
    expense: "#FF7484",
    warning: "#FFC86B",
    info: "#6DB6FF",
    danger: "#FF6373",
    shadow: "rgba(0,0,0,0.35)",
    input: "rgba(255,255,255,0.07)",
  },
  light: {
    bg: "#EEF3FB",
    panel: "rgba(255,255,255,0.63)",
    panelStrong: "rgba(255,255,255,0.82)",
    border: "rgba(25,35,60,0.10)",
    text: "#101527",
    muted: "#5E667A",
    primary: "#684CFF",
    secondary: "#0BAE9A",
    income: "#149E6E",
    expense: "#D74359",
    warning: "#B77812",
    info: "#2470BD",
    danger: "#C9344A",
    shadow: "rgba(40,55,90,0.16)",
    input: "rgba(255,255,255,0.56)",
  },
  spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 30 },
  radius: { sm: 12, md: 18, lg: 24, pill: 999 },
};

export type Palette = typeof theme.dark;

export const statusTone = (status:string, p:Palette) => {
  if(status==="closed") return {bg:p.income+"20",text:p.income};
  if(status==="overdue") return {bg:p.expense+"20",text:p.expense};
  if(status==="partial") return {bg:p.warning+"20",text:p.warning};
  return {bg:p.info+"20",text:p.info};
};
