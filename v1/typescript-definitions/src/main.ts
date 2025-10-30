export * as GraphicsAPI from "./apis/graphicsAPI";

export * from "./definitions/render";
export * from "./definitions/types";
export * from "./definitions/vendor";
import * as GeneratedGraphicsManifest from "./generated/graphics-manifest";

export { GeneratedGraphicsManifest }

// Also export the GraphicsManifest types using simplified names
export type GraphicsManifest = GeneratedGraphicsManifest.HttpsOgrafEbuIoV1SpecificationJsonSchemasGraphicsSchemaJson
export type GraphicsManifestCustomAction = GeneratedGraphicsManifest.HttpsOgrafEbuIoV1SpecificationJsonSchemasLibActionJson

