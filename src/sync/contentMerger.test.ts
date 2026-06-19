import { expect } from "chai";
import { extractPersonalNotes, mergeContent } from "./contentMerger";

describe("contentMerger", function () {
	describe("extractPersonalNotes", function () {
		it("returns null when heading is absent", function () {
			const content = `# Book Title\n\n## Highlights\n\nSome text`;
			expect(extractPersonalNotes(content)).to.be.null;
		});

		it("extracts content from heading to EOF when last section", function () {
			const content = `# Book\n\n## Highlights\n\ntext\n\n## Personal Notes\n\nMy thoughts.`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal(
				"## Personal Notes\n\nMy thoughts.",
			);
		});

		it("extracts content from heading to next ## heading", function () {
			const content = `# Book\n\n## Personal Notes\n\nMy thoughts.\n\n## Description\n\nA book.`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal(
				"## Personal Notes\n\nMy thoughts.",
			);
		});

		it("handles subheadings inside personal notes", function () {
			const content = `# Book\n\n## Personal Notes\n\n### Sub-thought\n\nDetails.\n\n### Another\n\nMore.\n\n## Highlights`;
			const result = extractPersonalNotes(content);
			expect(result).to.contain("### Sub-thought");
			expect(result).to.contain("### Another");
			expect(result).not.to.contain("## Highlights");
		});

		it("handles empty personal notes section", function () {
			const content = `# Book\n\n## Personal Notes\n\n## Description\n\nA book.`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal("## Personal Notes");
		});

		it("uses last occurrence if heading appears multiple times", function () {
			const content = `## Personal Notes\n\nFirst one\n\n## Highlights\n\n## Personal Notes\n\nSecond one\n\n## Description`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal(
				"## Personal Notes\n\nSecond one",
			);
		});
	});

	describe("mergeContent", function () {
		it("appends empty section when personalNotes is null and no placeholder", function () {
			const result = mergeContent("# Book\n\n## Highlights", null);
			expect(result).to.contain("# Book");
			expect(result).to.contain("## Highlights");
			expect(result).to.contain("## Personal Notes\n");
		});

		it("preserves personal notes in middle of document", function () {
			const newContent =
				"# Book\n\n## Personal Notes\n\n## Description\n\nA book.\n\n## Highlights\n\ntext";
			const personalNotes =
				"## Personal Notes\n\nMy thoughts on this book.";
			const result = mergeContent(newContent, personalNotes);
			expect(result).to.contain("My thoughts on this book.");
			expect(result).to.contain("## Description");
			expect(result).to.contain("## Highlights");
			const notesIdx = result.indexOf("## Personal Notes");
			const descIdx = result.indexOf("## Description");
			expect(notesIdx).to.be.lessThan(descIdx);
		});

		it("replaces placeholder with preserved notes keeping surrounding content", function () {
			const newContent =
				"# Book\n\n## Personal Notes\n\n## Highlights\n\ntext";
			const personalNotes =
				"## Personal Notes\n\nUser's preserved content.";
			const result = mergeContent(newContent, personalNotes);
			const count = (
				result.match(/## Personal Notes/g) || []
			).length;
			expect(count).to.equal(1);
			expect(result).to.contain("User's preserved content.");
			expect(result).to.contain("## Highlights");
		});

		it("strips template placeholder when no existing notes", function () {
			const newContent =
				"# Book\n\n## Personal Notes\n\n## Highlights\n\ntext";
			const result = mergeContent(newContent, null);
			const count = (
				result.match(/## Personal Notes/g) || []
			).length;
			expect(count).to.equal(1);
			expect(result).to.contain("## Highlights");
		});
	});
});
