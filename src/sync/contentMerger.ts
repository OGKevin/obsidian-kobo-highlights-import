const PERSONAL_NOTES_HEADING = "## Personal Notes";

export function extractPersonalNotes(
	existingContent: string,
): string | null {
	const idx = existingContent.lastIndexOf(PERSONAL_NOTES_HEADING);
	if (idx === -1) {
		return null;
	}
	return existingContent.substring(idx);
}

export function mergeContent(
	newContent: string,
	personalNotes: string | null,
): string {
	let base = newContent;

	const placeholderIdx = base.lastIndexOf(PERSONAL_NOTES_HEADING);
	if (placeholderIdx !== -1) {
		base = base.substring(0, placeholderIdx).trimEnd();
	}

	const section =
		personalNotes ?? `${PERSONAL_NOTES_HEADING}\n`;

	return `${base}\n\n${section}`;
}
