export const defaultTemplate = `
# {{Title}}

{{highlights}}
`

export function applyTemplateTransformations(
	rawTemaple: string,
	highlights: string,
	bookTitle: string,
): string {
	return rawTemaple
		.replace(
			/{{\s*highlights\s*}}/gi,
			highlights,
		).replace(
			/{{\s*Title\s*}}/gi,
			bookTitle,
		).trim()
}
