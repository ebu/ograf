export type Action = {
    label: string
    description?: string

    schema: Record<string, any>  // TBD, JSON Schema
}

