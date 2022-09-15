export const defaultTemplate = `
{{highlights}}
`

export function applyTemplateTransformations(rawTemaple: string, highlights: string): string {
    return rawTemaple.replace(
        /{{\s*highlights\s*}}/gi,
        highlights,
    ).trim()
}
