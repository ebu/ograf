import { RenderCharacteristics } from "../definitions/render";
import {
  PlayActionReturnPayload,
  ActionInvokeParams,
  ReturnPayload,
  EmptyPayload,
  EmptyParams,
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
 * This interface defines the methods that the Renderer can call on the Graphic.
 * @example class MyOGrafGraphic extends HTMLElement implements GraphicsAPI.Graphic {}
 *
 */
export interface Graphic {
  /**
   * Called by the Renderer when the Graphic has been loaded into the DOM
   * @returns a Promise that resolves when the Graphic has finished loading it's resources.
   */
  load: (
    params: {
      /** The data send here is defined in the manifest "schema". Note: This data MUST HAVE the same type as the `data` argument in updateAction method. */
      data: unknown;

      /** Whether the rendering is done in realtime or non-realtime */
      renderType: "realtime" | "non-realtime";

      /** A set of characteristics / capabilities of the Renderer, that affects how the Graphic will be rendered. */
      renderCharacteristics: RenderCharacteristics;
    } & VendorExtend
  ) => Promise<ReturnPayload | undefined>;

  /**
   * Called by the Renderer to force the Graphic to terminate/dispose/clear any loaded resources.
   * This is called after the Renderer has unloaded the Graphic from the DOM.
   */
  dispose: (params: EmptyParams) => Promise<ReturnPayload | undefined>;

  /** This is called whenever user send a new data payload. */
  updateAction: (
    params: {
      /** The data send here is defined in the manifest "schema". Note: This data MUST HAVE the same type as the `data` argument in the load method.  */
      data: unknown;
      /** If true, skips animation (defaults to false) */
      skipAnimation?: boolean;
    } & VendorExtend
  ) => Promise<ReturnPayload | undefined>;

  /** This is called when user calls the "play" action. */
  playAction: (
    params: {
      /** How far to advance. 1 = next step/segment. (defaults to 1) */
      delta: number;
      /** Jump to a specific step/segment (defaults to undefined) */
      goto: number;
      /** If true, skips animation (defaults to false) */
      skipAnimation?: boolean;
    } & VendorExtend
  ) => Promise<PlayActionReturnPayload>;

  /** This is called when user calls the "stop" action. */
  stopAction: (
    params: {
      /** If true, skips animation (defaults to false) */
      skipAnimation?: boolean
    } & VendorExtend
  ) => Promise<ReturnPayload | undefined>;

  /**
   * Called by the Renderer to invoke an Action on the Graphic
   * @returns The return value of the invoked method (vendor-specific)
   */
  customAction: (
    params: ActionInvokeParams
  ) => Promise<ReturnPayload | undefined>;

  /**
   * If the Graphic supports non-realtime rendering, this is called to make the graphic jump to a certain point in time.
   * @returns A Promise that resolves when the Graphic has finished rendering the requested frame.
   */
  goToTime: (
    params: { timestamp: number } & VendorExtend
  ) => Promise<ReturnPayload | undefined>;

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
              params: Parameters<Graphic["updateAction"]>[0];
            } & VendorExtend)
          | ({
              type: "playAction";
              params: Parameters<Graphic["playAction"]>[0];
            } & VendorExtend)
          | ({
              type: "stopAction";
              params: Parameters<Graphic["stopAction"]>[0];
            } & VendorExtend)
          | ({
              type: "customAction";
              params: Parameters<Graphic["customAction"]>[0];
            } & VendorExtend);
      }[];
    } & VendorExtend
  ) => Promise<EmptyPayload | undefined>;
}
