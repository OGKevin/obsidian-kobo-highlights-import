export class ImportContext {
	booksImported = 0;
	highlightsImported = 0;
	wordsImported = 0;
	warnings: string[] = [];

	addWarning(msg: string): void {
		this.warnings.push(msg);
	}

	toSummary(): string {
		const parts: string[] = [];

		if (this.booksImported > 0) {
			parts.push(
				`Imported ${this.booksImported} book${this.booksImported !== 1 ? "s" : ""} (${this.highlightsImported} highlight${this.highlightsImported !== 1 ? "s" : ""})`,
			);
		}

		if (this.wordsImported > 0) {
			parts.push(
				`${this.wordsImported} vocabulary word${this.wordsImported !== 1 ? "s" : ""}`,
			);
		}

		if (parts.length === 0) {
			parts.push("No content imported");
		}

		const summary = parts.join(", ");

		if (this.warnings.length > 0) {
			return `${summary}. ${this.warnings.length} warning${this.warnings.length !== 1 ? "s" : ""}: ${this.warnings.join("; ")}`;
		}

		return `${summary}.`;
	}
}
