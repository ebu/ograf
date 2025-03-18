import {
  PlayActionReturnPayload,
  ActionInvokeParams,
  ReturnPayload,
  EmptyPayload,
  VendorExtend,
} from "../definitions/types";

/**
 * ================================================================================================
 *
 * The GraphicsAPI is a javascript interface, ie javascript methods exposed by the OGraf Graphics WebComponent.
 *
 * ================================================================================================
 */

/**
 * Methods called on a GraphicInstance by the Renderer
 */
export interface GraphicsApi {
  /**
   * Called by the Renderer when the Graphic has been loaded into the DOM
   * @returns a Promise that resolves when the Graphic has finished loading it's resources.
   */
  load: (
    params: {
      /** Whether the rendering is done in realtime or non-realtime */
      renderType: "realtime" | "non-realtime";
    } & VendorExtend
  ) => Promise<ReturnPayload>;

  /**
   * Called by the Renderer to force the Graphic to terminate/dispose/clear any loaded resources.
   * This is called after the Renderer has unloaded the Graphic from the DOM.
   */
  dispose: (params: EmptyPayload) => Promise<ReturnPayload>;

  /** This is called whenever user send a new data payload. */
  updateAction: (
    params: {
      /** The data send here is defined in the manifest "schema". */
      data: unknown;
    } & VendorExtend
  ) => Promise<ReturnPayload>;

  /** This is called when user calls the "play" action. */
  playAction: (
    params: {
      /** How far to advance. 1 = next step/segment. (defaults to 1) */
      delta: number;
      /** Jump to a specific step/segment (defaults to undefined) */
      goto: number;
      /** If true, skips animation (defaults to false) */
      skipAnimation: boolean;
    } & VendorExtend
  ) => Promise<PlayActionReturnPayload>;

  /** This is called when user calls the "stop" action. */
  stopAction: (
    params: { skipAnimation: boolean } & VendorExtend
  ) => Promise<ReturnPayload>;

  /**
   * Called by the Renderer to invoke an Action on the Graphic
   * @returns The return value of the invoked method (vendor-specific)
   */
  customAction: (params: ActionInvokeParams) => Promise<ReturnPayload>;

  /**
   * If the Graphic supports non-realtime rendering, this is called to make the graphic jump to a certain point in time.
   * @returns A Promise that resolves when the Graphic has finished rendering the requested frame.
   */
  goToTime: (
    params: { timestamp: number } & VendorExtend
  ) => Promise<ReturnPayload>;

  /**
   * If the Graphic supports non-realtime rendering, this is called to schedule actions to be invoked at a certain point in time.
   * When this is called, the Graphic is expected to store the scheduled actions and invoke them when the time comes.
   * (A call to this replaces any previous scheduled actions.)
   * @returns A Promise that resolves when the Graphic has stored the scheduled actions.
   */
  setActionsSchedule: (
    params: {
      /**
       * A list of the scheduled actions to call at certain points in time.
       */
      schedule: {
        timestamp: number;
        action:
          | ({
              type: "updateAction";
              params: Parameters<GraphicsApi["updateAction"]>[0];
            } & VendorExtend)
          | ({
              type: "playAction";
              params: Parameters<GraphicsApi["playAction"]>[0];
            } & VendorExtend)
          | ({
              type: "stopAction";
              params: Parameters<GraphicsApi["stopAction"]>[0];
            } & VendorExtend)
          | ({
              type: "customAction";
              params: Parameters<GraphicsApi["customAction"]>[0];
            } & VendorExtend);
      }[];
    } & VendorExtend
  ) => Promise<EmptyPayload>;
}

