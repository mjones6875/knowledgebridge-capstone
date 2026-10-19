import { AllCommunityModule, themeQuartz } from "ag-grid-community";

export const AG_GRID_MODULES = [AllCommunityModule];

// Reuses the app's own CSS variables so every grid follows the light/dark toggle automatically.
export const kbGridTheme = themeQuartz.withParams({
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--ink)",
  accentColor: "var(--blue)",
  borderColor: "var(--border-strong)",
  headerBackgroundColor: "var(--surface-muted)",
  headerTextColor: "var(--ink)",
  oddRowBackgroundColor: "var(--surface-muted)",
  rowHoverColor: "var(--blue-light)",
  fontFamily: "inherit",
  fontSize: 12.5,
  spacing: 6,
  wrapperBorderRadius: 10,
});
