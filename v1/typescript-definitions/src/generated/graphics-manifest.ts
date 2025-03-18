/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND! Instead, modify the source JSON Schema file,
 * and run 'npm run generate-types' to regenerate this file.
 */

export type HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibObjectJson =
  CoreAndValidationSpecificationsMetaSchema &
    HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibGddTypesJson &
    HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibBasicTypesJson & {
      type: "boolean" | "string" | "number" | "integer" | "array" | "object";
      gddType?: string;
      gddOptions?: {
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
export type CoreAndValidationSpecificationsMetaSchema = CoreVocabularyMetaSchema &
  ApplicatorVocabularyMetaSchema &
  UnevaluatedApplicatorVocabularyMetaSchema &
  ValidationVocabularyMetaSchema &
  MetaDataVocabularyMetaSchema &
  FormatVocabularyMetaSchemaForAnnotationResults &
  ContentVocabularyMetaSchema & {
    /**
     * @deprecated
     */
    definitions?: {
      [k: string]: {
        [k: string]: unknown;
      };
    };
    /**
     * @deprecated
     */
    dependencies?: {
      [k: string]:
        | {
            [k: string]: unknown;
          }
        | string[];
    };
    /**
     * @deprecated
     */
    $recursiveAnchor?: string;
    /**
     * @deprecated
     */
    $recursiveRef?: string;
    [k: string]: unknown;
  } & (
    | {
        /**
         * @deprecated
         */
        definitions?: {
          [k: string]: {
            [k: string]: unknown;
          };
        };
        /**
         * @deprecated
         */
        dependencies?: {
          [k: string]:
            | {
                [k: string]: unknown;
              }
            | string[];
        };
        /**
         * @deprecated
         */
        $recursiveAnchor?: string;
        /**
         * @deprecated
         */
        $recursiveRef?: string;
        [k: string]: unknown;
      }
    | boolean
  );
export type CoreVocabularyMetaSchema = {
  $id?: string;
  $schema?: string;
  $ref?: string;
  $anchor?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $vocabulary?: {
    [k: string]: boolean;
  };
  $comment?: string;
  $defs?: {
    [k: string]: {
      [k: string]: unknown;
    };
  };
  [k: string]: unknown;
} & (
  | {
      $id?: string;
      $schema?: string;
      $ref?: string;
      $anchor?: string;
      $dynamicRef?: string;
      $dynamicAnchor?: string;
      $vocabulary?: {
        [k: string]: boolean;
      };
      $comment?: string;
      $defs?: {
        [k: string]: {
          [k: string]: unknown;
        };
      };
      [k: string]: unknown;
    }
  | boolean
);
export type ApplicatorVocabularyMetaSchema = {
  /**
   * @minItems 1
   */
  prefixItems?: [
    {
      [k: string]: unknown;
    },
    ...{
      [k: string]: unknown;
    }[]
  ];
  items?: {
    [k: string]: unknown;
  };
  contains?: {
    [k: string]: unknown;
  };
  additionalProperties?: {
    [k: string]: unknown;
  };
  properties?: {
    [k: string]: {
      [k: string]: unknown;
    };
  };
  patternProperties?: {
    [k: string]: {
      [k: string]: unknown;
    };
  };
  dependentSchemas?: {
    [k: string]: {
      [k: string]: unknown;
    };
  };
  propertyNames?: {
    [k: string]: unknown;
  };
  if?: {
    [k: string]: unknown;
  };
  then?: {
    [k: string]: unknown;
  };
  else?: {
    [k: string]: unknown;
  };
  /**
   * @minItems 1
   */
  allOf?: [
    {
      [k: string]: unknown;
    },
    ...{
      [k: string]: unknown;
    }[]
  ];
  /**
   * @minItems 1
   */
  anyOf?: [
    {
      [k: string]: unknown;
    },
    ...{
      [k: string]: unknown;
    }[]
  ];
  /**
   * @minItems 1
   */
  oneOf?: [
    {
      [k: string]: unknown;
    },
    ...{
      [k: string]: unknown;
    }[]
  ];
  not?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
} & (
  | {
      /**
       * @minItems 1
       */
      prefixItems?: [
        {
          [k: string]: unknown;
        },
        ...{
          [k: string]: unknown;
        }[]
      ];
      items?: {
        [k: string]: unknown;
      };
      contains?: {
        [k: string]: unknown;
      };
      additionalProperties?: {
        [k: string]: unknown;
      };
      properties?: {
        [k: string]: {
          [k: string]: unknown;
        };
      };
      patternProperties?: {
        [k: string]: {
          [k: string]: unknown;
        };
      };
      dependentSchemas?: {
        [k: string]: {
          [k: string]: unknown;
        };
      };
      propertyNames?: {
        [k: string]: unknown;
      };
      if?: {
        [k: string]: unknown;
      };
      then?: {
        [k: string]: unknown;
      };
      else?: {
        [k: string]: unknown;
      };
      /**
       * @minItems 1
       */
      allOf?: [
        {
          [k: string]: unknown;
        },
        ...{
          [k: string]: unknown;
        }[]
      ];
      /**
       * @minItems 1
       */
      anyOf?: [
        {
          [k: string]: unknown;
        },
        ...{
          [k: string]: unknown;
        }[]
      ];
      /**
       * @minItems 1
       */
      oneOf?: [
        {
          [k: string]: unknown;
        },
        ...{
          [k: string]: unknown;
        }[]
      ];
      not?: {
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }
  | boolean
);
export type UnevaluatedApplicatorVocabularyMetaSchema = {
  unevaluatedItems?: {
    [k: string]: unknown;
  };
  unevaluatedProperties?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
} & (
  | {
      unevaluatedItems?: {
        [k: string]: unknown;
      };
      unevaluatedProperties?: {
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }
  | boolean
);
export type ValidationVocabularyMetaSchema = {
  type?:
    | ("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")
    | [
        "array" | "boolean" | "integer" | "null" | "number" | "object" | "string",
        ...("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")[]
      ];
  const?: unknown;
  enum?: unknown[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxContains?: number;
  minContains?: number;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  dependentRequired?: {
    [k: string]: string[];
  };
  [k: string]: unknown;
} & (
  | {
      type?:
        | ("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")
        | [
            "array" | "boolean" | "integer" | "null" | "number" | "object" | "string",
            ...("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")[]
          ];
      const?: unknown;
      enum?: unknown[];
      multipleOf?: number;
      maximum?: number;
      exclusiveMaximum?: number;
      minimum?: number;
      exclusiveMinimum?: number;
      maxLength?: number;
      minLength?: number;
      pattern?: string;
      maxItems?: number;
      minItems?: number;
      uniqueItems?: boolean;
      maxContains?: number;
      minContains?: number;
      maxProperties?: number;
      minProperties?: number;
      required?: string[];
      dependentRequired?: {
        [k: string]: string[];
      };
      [k: string]: unknown;
    }
  | boolean
);
export type MetaDataVocabularyMetaSchema = {
  title?: string;
  description?: string;
  default?: unknown;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: unknown[];
  [k: string]: unknown;
} & (
  | {
      title?: string;
      description?: string;
      default?: unknown;
      deprecated?: boolean;
      readOnly?: boolean;
      writeOnly?: boolean;
      examples?: unknown[];
      [k: string]: unknown;
    }
  | boolean
);
export type FormatVocabularyMetaSchemaForAnnotationResults = {
  format?: string;
  [k: string]: unknown;
} & (
  | {
      format?: string;
      [k: string]: unknown;
    }
  | boolean
);
export type ContentVocabularyMetaSchema = {
  contentEncoding?: string;
  contentMediaType?: string;
  contentSchema?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
} & (
  | {
      contentEncoding?: string;
      contentMediaType?: string;
      contentSchema?: {
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }
  | boolean
);
export type HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibGddTypesJson = {
  [k: string]: unknown;
};
export type HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibBasicTypesJson = {
  [k: string]: unknown;
};
/**
 * The schema is used by a Graphic to define the data parameters of the 'update' method.
 */
export type HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibObjectJson1 =
  CoreAndValidationSpecificationsMetaSchema &
    HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibGddTypesJson &
    HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibBasicTypesJson & {
      type: "boolean" | "string" | "number" | "integer" | "array" | "object";
      gddType?: string;
      gddOptions?: {
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };

export interface HttpsSuperflytvGithubIoTmpGraphicsDefinitionDefinitionDefinitionJsonSchemaV1GraphicsManifestSchemaJson {
  /**
   * Reference to the JSON-schema for this manifest
   */
  $schema: "https://superflytv.github.io/tmp-GraphicsDefinition/definition/definition/json-schema/v1/graphics-manifest/schema.json";
  /**
   * The id of the Graphic uniquely identifies it. It is recommended to use a reverse domain name notation. For example: com.superflytv.my-lowerthird.
   */
  id: string;
  /**
   * The version of the Graphic. The version SHOULD be alphabetically sortable. Examples: ['0', '1', '2'], ['1.0', '1.1', '1.2'], ['2024-07-01_final', '2024-07-01_final_final2']
   */
  version?: string;
  /**
   * The main entry point, ie the path to the main javascript file of the Graphic.
   */
  main?: string;
  /**
   * Name of the Graphic
   */
  name: string;
  /**
   * (optional) A longer description of the Graphic
   */
  description?: string;
  /**
   * (optional) About the author
   */
  author?: {
    /**
     * Name of the author
     */
    name: string;
    /**
     * (optional) Email of the author
     */
    email?: string;
    /**
     * (optional) URL of the author
     */
    url?: string;
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^v_.*".
     */
    [k: string]: unknown;
  };
  /**
   * Custom Actions that can be invoked on the Graphic.
   */
  customActions?: HttpsSuperflytvGithubIoTmpGraphicsDefinitionDefinitionDefinitionJsonSchemaV1LibActionJson[];
  /**
   * Indicates if the Graphic supports real-time rendering
   */
  supportsRealTime: boolean;
  /**
   * Indicates if the Graphic supports non-real-time rendering. Note: If true, the Graphic must implement the 'goToTime()' and the 'setActionsSchedule()' methods.
   */
  supportsNonRealTime: boolean;
  /**
   * The number of steps in the Graphic. If the Graphic is simply triggered by a play, then a stop, this is considered a stepCount of 1 (defaults to 1).
   */
  stepCount?: number;
  schema?: HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibObjectJson1;
  /**
   * This interface was referenced by `HttpsSuperflytvGithubIoTmpGraphicsDefinitionDefinitionDefinitionJsonSchemaV1GraphicsManifestSchemaJson`'s JSON-Schema definition
   * via the `patternProperty` "^v_.*".
   */
  [k: string]: unknown;
}
export interface HttpsSuperflytvGithubIoTmpGraphicsDefinitionDefinitionDefinitionJsonSchemaV1LibActionJson {
  /**
   * The name of the action. This is displayed to the user.
   */
  label: string;
  /**
   * A longer description of the action. This is displayed to the user.
   */
  description?: string;
  /**
   * The schema of the action. This is used to validate the action parameters as well as auto-generate a GUI for the action.
   */
  schema: null | HttpsSuperflytvGithubIoGraphicsDataDefinitionGddMetaSchemaV1LibObjectJson;
  /**
   * This interface was referenced by `HttpsSuperflytvGithubIoTmpGraphicsDefinitionDefinitionDefinitionJsonSchemaV1LibActionJson`'s JSON-Schema definition
   * via the `patternProperty` "^_.*".
   */
  [k: string]: unknown;
}
