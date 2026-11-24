import type { Density } from "../shared/preferences";

/** Row, header and spacing sizes for one density. */
export interface Metrics {
  rowMinHeight: number;
  rowPaddingY: number;
  /** Rows under a project header, which already frames them. */
  projectRowPaddingY: number;
  headerMinHeight: number;
  headerPaddingY: number;
  projectHeaderMinHeight: number;
  projectHeaderPaddingY: number;
  /** Space below a project header. */
  headerMargin: number;
  /** Space below an open project block. */
  projectSpacing: number;
  /** Space below an open status group. */
  statusSpacing: number;
}

type Spacing = Pick<Metrics, "headerMargin" | "projectSpacing" | "statusSpacing">;

const SPACING: Record<Density, Spacing> = {
  compact: { headerMargin: 1, projectSpacing: 3, statusSpacing: 8 },
  standard: { headerMargin: 2, projectSpacing: 6, statusSpacing: 12 },
  comfortable: { headerMargin: 4, projectSpacing: 12, statusSpacing: 16 },
};

type Sizes = Omit<Metrics, keyof Spacing>;

const POINTER: Record<Density, Sizes> = {
  compact: {
    rowMinHeight: 30,
    rowPaddingY: 5,
    projectRowPaddingY: 4,
    headerMinHeight: 30,
    headerPaddingY: 5,
    projectHeaderMinHeight: 26,
    projectHeaderPaddingY: 3,
  },
  // 0.3.1's sizes.
  standard: {
    rowMinHeight: 36,
    rowPaddingY: 8,
    projectRowPaddingY: 6,
    headerMinHeight: 36,
    headerPaddingY: 8,
    projectHeaderMinHeight: 30,
    projectHeaderPaddingY: 5,
  },
  comfortable: {
    rowMinHeight: 42,
    rowPaddingY: 10,
    projectRowPaddingY: 9,
    headerMinHeight: 40,
    headerPaddingY: 10,
    projectHeaderMinHeight: 36,
    projectHeaderPaddingY: 8,
  },
};

/** Touch keeps a 44pt tap height at every density; only the spacing between groups changes. */
const TOUCH: Sizes = {
  rowMinHeight: 44,
  rowPaddingY: 8,
  projectRowPaddingY: 8,
  headerMinHeight: 44,
  headerPaddingY: 8,
  projectHeaderMinHeight: 44,
  projectHeaderPaddingY: 8,
};

export function metricsFor(density: Density, touch: boolean): Metrics {
  return { ...(touch ? TOUCH : POINTER[density]), ...SPACING[density] };
}
