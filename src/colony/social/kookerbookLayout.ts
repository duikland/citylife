import type { CSSProperties } from "react";

export const KOOKERBOOK_MOBILE_MAX_WIDTH = 640;

export type KookerbookResponsiveLayout = {
  body: Pick<CSSProperties, "margin" | "overflowX">;
  shell: Pick<CSSProperties, "flexDirection" | "overflowX" | "width" | "maxWidth">;
  directory: Pick<CSSProperties, "width" | "maxWidth" | "flexShrink">;
  profile: Pick<CSSProperties, "width" | "maxWidth" | "minWidth">;
};

export function kookerbookLayoutForViewport(
  viewportWidth: number,
): KookerbookResponsiveLayout {
  if (viewportWidth <= KOOKERBOOK_MOBILE_MAX_WIDTH) {
    return {
      body: { margin: "0", overflowX: "hidden" },
      shell: {
        flexDirection: "column",
        overflowX: "hidden",
        width: "auto",
        maxWidth: "100%",
      },
      directory: { width: "auto", maxWidth: "100%", flexShrink: 1 },
      profile: { width: "auto", maxWidth: "100%", minWidth: 0 },
    };
  }

  return {
    body: { margin: "0", overflowX: "hidden" },
    shell: {
      flexDirection: "row",
      overflowX: "hidden",
      width: "100%",
      maxWidth: "100%",
    },
    directory: { width: 320, maxWidth: 320, flexShrink: 0 },
    profile: { width: "auto", maxWidth: 760, minWidth: 0 },
  };
}
