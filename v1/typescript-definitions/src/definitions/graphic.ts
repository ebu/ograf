import { Action } from "./action";
import { VendorSpecific } from "./vendor";

export interface GraphicInfo {
  // Forwarded from the Graphic Definition:
  id: string;
  version: number;
  name: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };

  /**
   * true if the Graphic is a work-in-progress.
   * The intention is that the Graphic should not be used on-air.
   */
  draft?: boolean;

  [vendorSpecific: VendorSpecific]: unknown;
}
export interface GraphicManifest {
  // Forwarded from the Graphic Definition: --------------------------------------------
  actions: { [path: string]: Action };

  rendering: {
    /** If the Graphic supports RealTime Rendering. */
    supportsRealTime: boolean;
    /** If the Graphic supports non-RealTime Rendering. If true, the Graphic MUST expose the goToTime() and the setInvokeActionsSchedule() methods. */
    supportsNonRealTime: boolean;
  };

  // Calculated by the Server: --------------------------------------------------------

  /** Size (in bytes) of the files in the Graphic (including manifest) */
  totalSize: number;

  /** Number of the files in the Graphic (including manifest) */
  fileCount: number;

  // Suggestions: ===============
  /** A hash, calculated from the files in the Graphic */
  // hash: string

  [vendorSpecific: VendorSpecific]: unknown;
}

/**
 * How to identify a GraphicInstance running on a RenderTarget.
 * The GraphicInstance can be identified either by the id-version of the Graphic, or by the GraphicInstance id.
 */
export type GraphicInvokeActionTarget =
  // Address the graphicInstance either by id-version or by graphicInstance id:
  { graphic: { id: string; version: string } } | { graphicInstanceId: string };
