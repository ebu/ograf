import { VendorExtend } from "./types";

/**
 * A RenderCharacteristics is a set of characteristics / capabilities
 * of the Renderer, that affects how the Graphic will be rendered.
 */
export type RenderCharacteristics = {
  resolution?: {
    width: number;
    height: number;
  } & VendorExtend;
  /** Which frameRate the renderer will be rendering in. Examples: 50, 60, 29.97 */
  frameRate?: number;

  /** Whether the renderer has access to the public internet (so the graphic can fetch resources) */
  accessToPublicInternet?: boolean

  // Ideas for future:
  // webcamInputs
  // keyer?: boolean; //

} & VendorExtend;

// These are inspired by the MediaTrackConstraints Web API.
// see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints

export type ConstrainBoolean = {
  /** A Boolean which must be the value of the property. If the property can't be set to this value, matching will fail. */
  exact?: boolean;

  /** A Boolean specifying an ideal value for the property. If possible, this value will be used, but if it's not possible, the user agent will use the closest possible match. */
  ideal?: boolean;
} & VendorExtend;

export type ConstrainNumber = {
  /** A number specifying the largest permissible value of the property it describes. If the value cannot remain equal to or less than this value, matching will fail. */
  max?: number;

  /** A number specifying the smallest permissible value of the property it describes. If the value cannot remain equal to or greater than this value, matching will fail. */
  min?: number;

  /** A number specifying a specific, required, value the property must have to be considered acceptable. */
  exact?: number;

  /** A number specifying an ideal value for the property. If possible, this value will be used, but if it's not possible, the user agent will use the closest possible match. */
  ideal?: number;
} & VendorExtend;

/** The ConstrainString constraint type is used to specify a constraint for a property whose value is a string. */
export type ConstrainString<T extends string> = {
  /** A string or an array of strings, one of which must be the value of the property. If the property can't be set to one of the listed values, matching will fail. */
  exact: T | T[];

  /** A string or an array of strings, specifying ideal values for the property. If possible, one of the listed values will be used, but if it's not possible, the user agent will use the closest possible match. */
  ideal: T | T[];
} & VendorExtend;
