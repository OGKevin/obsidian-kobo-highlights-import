const PERSONAL_NOTES_HEADING = "## Personal Notes";
const HEADING_PATTERN = /^## /m;

export function extractPersonalNotes(
	existingContent: string,
): string | null {
	const idx = existingContent.lastIndexOf(PERSONAL_NOTES_HEADING);
	if (idx === -1) {
		return null;
	}

	const afterHeading =
		idx + PERSONAL_NOTES_HEADING.length;
	const rest = existingContent.substring(afterHeading);
	const nextHeadingMatch = rest.search(HEADING_PATTERN);

	if (nextHeadingMatch === -1) {
		return existingContent.substring(idx);
	}

	return existingContent
		.substring(idx, afterHeading + nextHeadingMatch)
		.trimEnd();
}

export function mergeContent(
	newContent: string,
	personalNotes: string | null,
): string {
	const section =
		personalNotes ?? `${PERSONAL_NOTES_HEADING}\n`;

	const placeholderIdx = newContent.lastIndexOf(
		PERSONAL_NOTES_HEADING,
	);
	if (placeholderIdx === -1) {
		return `${newContent.trimEnd()}\n\n${section}`;
	}

	const afterPlaceholder =
		placeholderIdx + PERSONAL_NOTES_HEADING.length;
	const rest = newContent.substring(afterPlaceholder);
	const nextHeadingMatch = rest.search(HEADING_PATTERN);

	if (nextHeadingMatch === -1) {
		const before = newContent
			.substring(0, placeholderIdx)
			.trimEnd();
		return `${before}\n\n${section}`;
	}

	const before = newContent
		.substring(0, placeholderIdx)
		.trimEnd();
	const after = newContent
		.substring(afterPlaceholder + nextHeadingMatch)
		.trimStart();

	return `${before}\n\n${section}\n\n${after}`;
}
