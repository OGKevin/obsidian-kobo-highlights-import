export const defaultTemplate = `
# {{Title}}

{{highlights}}
`

export function applyTemplateTransformations(
	rawTemplate: string,
	highlights: string,
	bookTitle: string,
): string {
	return rawTemplate
		.replace(
			/{{\s*highlights\s*}}/gi,
			highlights,
		).replace(
			/{{\s*Title\s*}}/gi,
			bookTitle,
		).trim()
}
