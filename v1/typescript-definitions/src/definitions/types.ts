import { VendorSpecific } from "./vendor";

/**
 * Default return data of any action
 */
export type ReturnPayload = {
  /**
   * HTTP response code. 200 if the method was executed successfully, 4xx if client error, 5xx if server error
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
   */
  statusCode: number;
  /**
   * (Optional) A human-readable message to help understand the statusCode.
   */
  statusMessage?: string;
} & VendorExtend;

/**
 * This indicates that a payload is empty
 * (but a vendor may choose to add their own vendor-specific properties)
 */
export type EmptyPayload = VendorExtend;

/**
 * This indicates that the Parameters object is empty
 * (but a vendor may choose to add their own vendor-specific properties)
 */
export type EmptyParams = VendorExtend;

/**
 * All parameters and return values can be extended with vendor-specific properties
 */
export interface VendorExtend {
  [vendorSpecific: VendorSpecific]: unknown;
}

/** Payload when invoking an action of a GraphicInstance or a Renderer */
export type ActionInvokeParams = {
  /** Graphic id, as defined by the Graphic manifest*/
  id: string;
  /** Params to send into the method */
  payload: unknown;

  /** If true, skips animation (defaults to false) */
  skipAnimation?: boolean;
} & VendorExtend;

export type PlayActionReturnPayload = ReturnPayload & {
  /** The resulting step from a PlayAction */
  currentStep: number;
};
