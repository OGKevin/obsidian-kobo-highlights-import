import { expect } from "chai";
import { extractPersonalNotes, mergeContent } from "./contentMerger";

describe("contentMerger", function () {
	describe("extractPersonalNotes", function () {
		it("returns null when heading is absent", function () {
			const content = `# Book Title\n\n## Highlights\n\nSome text`;
			expect(extractPersonalNotes(content)).to.be.null;
		});

		it("extracts content from heading to EOF", function () {
			const content = `# Book\n\n## Highlights\n\ntext\n\n## Personal Notes\n\nMy thoughts on this book.\n\nMore notes here.`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal(
				"## Personal Notes\n\nMy thoughts on this book.\n\nMore notes here.",
			);
		});

		it("handles subheadings inside personal notes", function () {
			const content = `# Book\n\n## Personal Notes\n\n### Sub-thought\n\nDetails here.\n\n### Another thought\n\nMore details.`;
			const result = extractPersonalNotes(content);
			expect(result).to.contain("### Sub-thought");
			expect(result).to.contain("### Another thought");
		});

		it("handles empty personal notes section", function () {
			const content = `# Book\n\n## Highlights\n\ntext\n\n## Personal Notes\n`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal("## Personal Notes\n");
		});

		it("uses last occurrence if heading appears multiple times", function () {
			const content = `## Personal Notes\n\nFirst one\n\n## Highlights\n\n## Personal Notes\n\nSecond one`;
			const result = extractPersonalNotes(content);
			expect(result).to.equal("## Personal Notes\n\nSecond one");
		});
	});

	describe("mergeContent", function () {
		it("appends empty section when personalNotes is null", function () {
			const result = mergeContent("# Book\n\n## Highlights", null);
			expect(result).to.contain("# Book");
			expect(result).to.contain("## Highlights");
			expect(result).to.contain("## Personal Notes\n");
		});

		it("preserves existing personal notes", function () {
			const personalNotes =
				"## Personal Notes\n\nMy thoughts on this book.";
			const result = mergeContent(
				"# Book\n\n## Highlights\n\ntext",
				personalNotes,
			);
			expect(result).to.contain("# Book");
			expect(result).to.contain("## Highlights");
			expect(result).to.contain("My thoughts on this book.");
		});

		it("replaces template placeholder with preserved notes", function () {
			const newContent =
				"# Book\n\n## Highlights\n\ntext\n\n## Personal Notes\n";
			const personalNotes =
				"## Personal Notes\n\nUser's preserved content.";
			const result = mergeContent(newContent, personalNotes);
			const count = (
				result.match(/## Personal Notes/g) || []
			).length;
			expect(count).to.equal(1);
			expect(result).to.contain("User's preserved content.");
		});

		it("strips template placeholder when no existing notes", function () {
			const newContent =
				"# Book\n\n## Highlights\n\ntext\n\n## Personal Notes\n";
			const result = mergeContent(newContent, null);
			const count = (
				result.match(/## Personal Notes/g) || []
			).length;
			expect(count).to.equal(1);
		});
	});
});
