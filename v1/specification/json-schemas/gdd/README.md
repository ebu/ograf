# GDD - Graphics Data Definition

_Note: This was previously a [standalone repository](https://github.com/SuperFlyTV/GraphicsDataDefinition), it is now under the OGraf supervision_

## What is GDD?

GDD is a subset of the [JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#name-a-vocabulary-for-structural) (with a few exceptions, see further below).

It supports all the basic JSON types (such as `strings` and `numbers`) but also extends them with **GDD Types**,
which can be used by _Graphics client GUIs_ to auto-generate input forms for the data.

All **GDD Types** are designed to gracefully degrade in case the GUI can't handle that particular type.
One example is the `["string", "RRGGBB"]` type which (when supported) can provide a color-picker in the GUI,
but if not supported will gracefully degrade to a simple text input.



**Table of contents**

- [Getting started](#getting-started)
- [General Definition](#general-definition)
- [Basic Types](#basic-types)
- [GDD Types](#gdd-types)
- [For GUI Developers](#for-gui-developers)

## Getting started

* [Examples of GDD-templates](https://github.com/SuperFlyTV/GraphicsDataDefinition/tree/master/examples)

* [Live demo of a Reference GUI](https://superflytv.github.io/GraphicsDataDefinition/lib/reference-gui/dist/)

* [CHANGELOG](/CHANGELOG.md)

The GDD Schema can either be defined in a separate JSON-file, or inline in the HTML-template-file:

**HTML Graphics file, "example.html":**

The `<script name="graphics-data-definition">` tag refers to a JSON-file that contains the GDD Schema definitions.
The `src=""` is a relative path to the Schema json file.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script
      name="graphics-data-definition"
      type="application/json+gdd"
      src="example.json"
    ></script>
  </head>
  <body>
    *** HTML content ***
  </body>
</html>
```

**JSON file, "example.json"**

```json
{
  "$schema": "https://superflytv.github.io/GraphicsDataDefinition/gdd-meta-schema/v1/schema.json",
  "title": "One-Line GFX Template",
  "type": "object",
  "properties": {
    "text0": {
      "description": "Text content",
      "type": "string",
      "maxLength": 50,
      "gddType": "single-line",
      "gddOptions": {}
    }
  }
}
```

**HTML Graphics file, "example-inline.html":**

The `<script name="graphics-data-definition">` tag can also contain the GDD Schema definitions inline:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script name="graphics-data-definition" type="application/json+gdd">
      {
        "$schema": "https://superflytv.github.io/GraphicsDataDefinition/gdd-meta-schema/v1/schema.json",
        "title": "One-Line GFX Template",
        "type": "object",
        "properties": {
          "text0": {
            "description": "Text content",
            "type": "string",
            "maxLength": 50,
            "gddType": "single-line",
            "gddOptions": {

            }
          }
        }
      }
    </script>
    <script type="text/javascript">
      // This is optional, but often helpful.
      // Expose the gddSchema globally:
      window.gddSchema = JSON.parse(
        document.querySelector('head > script[name="graphics-data-definition"]')
          .innerHTML
      );
    </script>
  </head>
  <body>
    *** HTML content ***
  </body>
</html>
```

**Example data**

```json
{ "text0": "Hello world!" }
```

## General Definition

The GDD is a subset of the [JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#name-a-vocabulary-for-structural), with a few exceptions, see below.

It supports all the basic JSON types (such as strings and numbers) but also extends them with **GDD Types**,
which can be used by _Graphics client GUIs_ to auto-generate input forms for the data.

All **GDD Types** are designed to gracefully degrade in case the GUI can't handle that particular type.
One example is the `["string", "RRGGBB"]` type which (when supported) can provide a color-picker in the GUI,
but if not supported will gracefully degrade to a simple text input.

The GUIs are expected to validate the form-data before submitting it to the GFX Clients.
Examples of how to validate can be found here: _---TODO---_

### Schema

```typescript
{
  "$schema": "https://superflytv.github.io/GraphicsDataDefinition/gdd-meta-schema/v1/schema.json", // [optional] Reference to the JSON-schema
  "title": "", // [optional] string, a short name of the GFX-template. Used for informational purposes only.
  "description": "", // [optional] string, a description GFX-template. Used for informational purposes only.
  "authorName": "", // [optional] string, name of the author.
  "authorEmail": "", // [optional] string, email to the author.
  "type": "object", // MUST be "object"
  "properties": {
    // MUST be an object
    // Properties goes here:
    "myProperty": {}
  },
  "required": [] // [optional]
  "gddPlayoutOptions": { // [optional]
    // Contents described under "Playout options" below
  }
}
```

### Property

All properties share these definitions: ([JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#section-6.1))

```typescript
{
  "type": string-enum, // See below
  "label": string, // [Optional] Short label to name the property
  "description": string, // [Optional] Longer description of the property
  "gddType": string, // [Optional unless required by GDD Type] A string containing the GDD Type name, see below
  "gddOptions": object // [Optional unless required by GDD Type] An object containing options for a certain GDD Type, see below
}
```

#### The `type` property

In the standard JSON-schema definition, the `type` property is allowed to be either a string or an array containing any combination of the basic types `"boolean"`, `"string"`, `"number"`, `"integer"`, `"array"`, `"object"` or `"null"`.
To reduce the complexity for the GDD GUI implementation however, the valid values for the `type` are reduced to these:

- `"boolean"`
- `"string"`
- `"number"`
- `"integer"` (this is a number with a zero fractional part)
- `"array"`
- `"object"`

## Basic Types

Here follows a list of the basic JSON types supported in GDD.

_All of these types are supported by all GUIs_

### Boolean

```typescript
{
  "type": "boolean",
  "default": boolean // [Optional] default value
}
```

### String

_[JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#section-6.3)_

```typescript
{
  "type": "string",
  "default": string, // [Optional] default value
  "maxLength": number, // [Optional] See JSON-schema definition ^
  "minLength": number, // [Optional] See JSON-schema definition ^
  "pattern": Regular Expression, // [Optional] See JSON-schema definition ^
}
```

### Number / Integer

_[JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#section-6.2)_

```typescript
{
  "type": "number", // or "integer"
  "default": number, // [Optional] default value
  "multipleOf": number, // [Optional] See JSON-schema definition ^
  "maximum": number, // [Optional] See JSON-schema definition ^
  "exclusiveMaximum": number, // [Optional] See JSON-schema definition ^
  "minimum": number, // [Optional] See JSON-schema definition ^
  "exclusiveMinimum": number, // [Optional] See JSON-schema definition ^
}
```

### Array

_[JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#section-6.4)_

```typescript
{
  "type": "array",
  "items": { // Contains a definition of the items in the array
    "type": "string" // example
  },
  "default": array, // [Optional] default value
  "maxItems": number, // [Optional] See JSON-schema definition ^
  "minItems": number, // [Optional] See JSON-schema definition ^
  "uniqueItems": boolean, // [Optional] See JSON-schema definition ^
  "maxContains": number, // [Optional] See JSON-schema definition ^
  "minContains": number, // [Optional] See JSON-schema definition ^
}
```

### Object

_[JSON-schema definition](https://json-schema.org/draft/2020-12/json-schema-validation.html#section-6.5)_

```typescript
{
  "type": "object",
  "items": { // Contains a definition of the items in the array
    "type": "string" // example
  },
  "default": object, // [Optional] default value
  "maxProperties": number, // [Optional] See JSON-schema definition ^
  "minProperties": number, // [Optional] See JSON-schema definition ^
  "required": boolean, // [Optional] See JSON-schema definition ^
  "dependentRequired": object, // [Optional] See JSON-schema definition ^
}
```

## GDD Types

A **GDD Type** is an extension of one of the basic types described above,
intended to be displayed to the user in a certain way.

The GDD Type is identified by the `gddType` property, a string on the form `"basic-type/advanced-type"`,
containing more and more specialized GDD Types, separated by `"/"`.

The GDD Types are designed in such a way to allow _graceful drgradation_.
If a GUI doesn't support the display of a specific GDD Type (such as `gddType: "multi-line/rich-formatted-text"`),
it will instead pick the next best thing (`gddType: "multi-line"`, or perhaps even the most basic `type: "string"`).

Below follows a list of the GDD Types, which provides more advanced functionality in GUIs.

Note: All `type`-properties below can be defined as optional by defining it as `["myType", "null"]`.

### Single-line text

A variant of the text input, which specifically is a single line.

```typescript
{
  "type": "string",
  "gddType": "single-line"
}
```

Example data: `"Hello World!"`

### Multi-line text

A variant of the text input, which specifically is a multi-line.

```typescript
{
  "type": "string",
  "gddType": "multi-line"
}
```

Example data: `"Hello World!\nI'm alive!"`

### File path

Lets the user pick a file from disk

```typescript
{
  "type": "string",
  "gddType": "file-path",
  "gddOptions": {
    "extensions": ["txt", "json"] // [Optional, Array of strings] . Limit which files can be chosen by the user
  }
}
```

Example data: `"C:\images\myFile.xml"` or `"folder/myFile.zip"`

### Image File path

Lets the user pick an image file from disk

```typescript
{
  "type": "string",
  "gddType": "file-path/image-path",
  "gddOptions": {
    "extensions": ["jpg", "png"] // [Optional, Array of strings] Limit which files can be chosen by the user.
  }
}
```

Example data: `"C:\images\myImage.jpg"` or `"folder/myImage.png"`

### Select

Lets the user select from a limited number of options (this is often done from a dropdown menu).

Please note that the `type` for this can be either of `"string"`, `"integer"` or `"number"`.

```json
{
  "type": "string",
  "enum": ["one", "two", "three"],
  "gddType": "select",
  "gddOptions": {
    "labels": {
      "one": "Label for one",
      "two": "Label for two",
      "three": "Label for three"
    }
  }
}
```

```json
{
  "type": "integer",
  "enum": [1, 2, 3],
  "gddType": "select",
  "gddOptions": {
    "labels": { "1": "Small", "2": "Medium", "3": "Large" }
  }
}
```

```json
{
  "type": "number",
  "enum": [1.2, 3.5, 9.0],
  "gddType": "select",
  "gddOptions": {
    "labels": { "1.2": "Small", "3.5": "Medium", "9.0": "Large" }
  }
}
```

Example data: `"one"`, `1` or `1.2`

### Color - RRGGBB

Let's the user pick a color.

```typescript
{
  "type": "string",
  "pattern": "^#[0-9a-f]{6}$",
  "gddType": "color-rrggbb"
}
```

The value is stored as a string on the form "#RRGGBB", eg `"#61138e"`.

### Color - RRGGBBAA

Let's the user pick a color with transparency.

```typescript
{
  "type": "string",
  "pattern": "^#[0-9a-f]{8}$",
  "gddType": "color-rrggbbaa"
}
```

The value is stored as a string on the form "#RRGGBBAA", eg `"#61138eff"`.

### Percentage

A number presented as a pecentage

```typescript
{
  "type": "number",
  "gddType": "percentage"
}
```

The value is stored as a number, eg "25%" -> 0.25

### Duration in milliseconds

A duration value, to be presented in a human readable format (like "HH:MM:SS.xxx")

```typescript
{
  "type": "integer",
  "gddType": "duration-ms"
}
```

The value is stored as a number in milliseconds, eg "1m23s" -> `83000`

### -- Private GDD Types --

Under the GDD schema, it is allowed to extend the offial GDD Types listed above with your own, custom GDD Types. Thanks to the graceful degradation of the GDD Types, a schema containing custom GDD Types is still a valid GDD Schema and will work in any GUI, the unsupported GDD Types will simply degrade to their closest type.

Example:

```typescript
{
  "type": "string",
  "gddType": "single-line/my-custom-formatted-text" // Will degrade to be "single-line" or simply a "string"
}
```

## For GUI Developers

### Getting started

```bash
npm install graphics-data-definition
```

See [README for the npm-library](https://www.npmjs.com/package/graphics-data-definition) for how to use.

### About implementing GUIs

When implementing a GUI to support the GDD definitions, you don't have to implement support for all GDD Types - since the GDD Types are designed to degrade gracefully. The only types that are mandatory to implement are the basic types `"boolean"`, `"string"`, `"number"`, `"integer"`, `"array"`and `"object"`.

To degrade gracefully, it is recommended that you follow these practices when implementing the GUI:

```javascript
function determineComponent(prop) {
  // List of supported GUI components, starting with "longest gddType" first:
  if (prop.gddType.match("file-path/image-path"))
    return componentImagePicker(prop, allowOptional);
  if (prop.gddType.match("file-path"))
    return componentFilePicker(prop, allowOptional);
  if (prop.gddType.match("rrggbb")) return componentRRGGBB(prop, allowOptional);

  // Fall back to handle the basic types:
  const basicType = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  if (basicType === "boolean") return componentBoolean(prop);
  if (basicType === "string") return componentString(prop);
  if (basicType === "number") return componentNumber(prop);
  if (basicType === "integer") return componentInteger(prop);
  if (basicType === "array") return componentArray(prop);
  if (basicType === "object") return componentObject(prop);
  if (basicType === "null") return null;

  return null;
}
```

Please have a look at a [reference GUI implementation here](/blob/main/reference-gui/src/gdd-gui.jsx), and [its live demo here.](https://superflytv.github.io/GraphicsDataDefinition/lib/reference-gui/dist/)

Also, give the [CHANGELOG](/CHANGELOG.md) a read.

## Playout Options

In the Schema, there is an option to add the `gddPlayoutOptions` object with various properties therein.
These properties can be read by the playout client in order to modify how it'll display / use / play the template.

_Note: All of the properties inside of `gddPlayoutOptions` are optional._

```typescript
{
  "$schema": "https://superflytv.github.io/GraphicsDataDefinition/gdd-meta-schema/v1/schema.json",
  "title": "My GFX Template",
  "type": "object",
  "properties": {
    "myProperty": {
      // ...
    }
  },
  "gddPlayoutOptions": {
    /** This object contains options that aren't tied to a specific playout server */
    "client": {
      /**
       * The suggested duration of the template (in milliseconds)
       * null means that it is manually taken out
       * undefined should be treated as null
       * (This is ignored if steps=0)
       * Defaults to null
       */
      "duration": integer | null

      /**
       * Number of steps in the template
       * 1 means that there are no steps (ie there's only "the default step").
       * 2 or more means that it can be "stepped" (ie 2 means it can be stepped once).
       * -1 means "infinite" number of steps.
       * 0 means that the template is "volatile" / "fire and forget" (template really has no duration, like a bumper).
       * Defaults to 1
      */
      "steps": integer,

      /**
       * How the data should be formatted.
       * This is mostly used for the older CasparCG flash-based xml data format.
       * Defaults to "json"
       */
      "dataformat": "json" | "casparcg-xml"
    },

    /** This object contains options related to the rendering of the GFX template */
    "render": {
      /**
       * This property contains an array of the supported resolutions of the GFX Template.
       * The array must contain at least one resolution.
       * This can be used by the client to determine whether a template is compatible with the current renderer or not.
       * Examples:
       * * A template which only supports a fixed resolution and framerate:
       *   "resolutions": [{ "width": 1280, "height": 720, "framerate": 50 }]
       * * A template which supports 720p50 and 1080p50:
       *   "resolutions": [{ "width": 1280, "height": 720, "framerate": 50 }, { "width": 1920, "height": 1080, "framerate": 50 }]
       * * A template which supports any resolution above 500x500 (and any framerate):
       *   "resolutions": [{ "width": { min: 500 }, "height": { min: 500 } }]
       *
       */
      "resolutions": [
        {
          "width": {
            "min": number
            "max": number
          } | number,
          "height": {
            "min": number
            "max": number
          } | number,
          "framerate": {
            "min": number
            "max": number
          } | number,
        }
      ]
    },

    /** This object contains specific options for the various playout server types (CasparCG, Viz, vMix etc..) */
    "playout": {
      "**type-of-device**": {
       // See Appendix for the device-specific options
      }
    }
  }
}
```

Details on the CasparCG XML format are described in [Appendix: CasparCG XML](/doc/appendix/casparcg-xml.md)

Details for the device-specific options are described in [Appendix: Playout Options](/doc/appendix/playout-options.md)
