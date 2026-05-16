import { expect } from "chai";
import {
	HighlightService,
	groupBookmarksByVolume,
	buildTocMatchIndex,
	assignBookmarksToTocEntries,
	findRequiredHeadings,
	buildChapterEntries,
} from "./Highlight";
import { Bookmark, TocEntry } from "./interfaces";
import { Repository, stripSuffix, extractDepth } from "./repository";

/* eslint-disable @typescript-eslint/no-unused-expressions */

describe("groupBookmarksByVolume", function () {
	it("groups bookmarks by volumeId", function () {
		const bookmarks: Bookmark[] = [
			{
				bookmarkId: "bm1",
				text: "Text 1",
				contentId: "c1",
				volumeId: "book-a",
				dateCreated: new Date(),
			},
			{
				bookmarkId: "bm2",
				text: "Text 2",
				contentId: "c2",
				volumeId: "book-b",
				dateCreated: new Date(),
			},
			{
				bookmarkId: "bm3",
				text: "Text 3",
				contentId: "c3",
				volumeId: "book-a",
				dateCreated: new Date(),
			},
		];

		const result = groupBookmarksByVolume(bookmarks);

		expect(result.size).to.equal(2);
		expect(result.get("book-a")).to.have.length(2);
		expect(result.get("book-b")).to.have.length(1);
	});

	it("groups empty volumeId under empty string key", function () {
		const bookmarks: Bookmark[] = [
			{
				bookmarkId: "bm1",
				text: "Text 1",
				contentId: "c1",
				volumeId: "",
				dateCreated: new Date(),
			},
			{
				bookmarkId: "bm2",
				text: "Text 2",
				contentId: "c2",
				volumeId: "book-a",
				dateCreated: new Date(),
			},
		];

		const result = groupBookmarksByVolume(bookmarks);

		expect(result.size).to.equal(2);
		expect(result.get("")).to.have.length(1);
		expect(result.get("book-a")).to.have.length(1);
	});

	it("returns empty map for empty input", function () {
		const result = groupBookmarksByVolume([]);
		expect(result.size).to.equal(0);
	});
});

describe("buildTocMatchIndex", function () {
	it("builds index mapping matchId to position", function () {
		const toc: TocEntry[] = [
			{
				title: "Ch1",
				matchId: "match-a",
				contentId: "c1",
				depth: 1,
				volumeIndex: 0,
			},
			{
				title: "Ch2",
				matchId: "match-b",
				contentId: "c2",
				depth: 1,
				volumeIndex: 1,
			},
			{
				title: "Ch3",
				matchId: "match-c",
				contentId: "c3",
				depth: 1,
				volumeIndex: 2,
			},
		];

		const result = buildTocMatchIndex(toc);

		expect(result.size).to.equal(3);
		expect(result.get("match-a")).to.equal(0);
		expect(result.get("match-b")).to.equal(1);
		expect(result.get("match-c")).to.equal(2);
	});

	it("keeps only first occurrence for duplicate matchIds", function () {
		const toc: TocEntry[] = [
			{
				title: "Ch1",
				matchId: "match-a",
				contentId: "c1",
				depth: 1,
				volumeIndex: 0,
			},
			{
				title: "Ch2",
				matchId: "match-a",
				contentId: "c2",
				depth: 2,
				volumeIndex: 1,
			},
		];

		const result = buildTocMatchIndex(toc);

		expect(result.size).to.equal(1);
		expect(result.get("match-a")).to.equal(0);
	});

	it("returns empty map for empty input", function () {
		const result = buildTocMatchIndex([]);
		expect(result.size).to.equal(0);
	});
});

describe("assignBookmarksToTocEntries", function () {
	it("assigns bookmarks to matching TOC entries", function () {
		const bookmarks: Bookmark[] = [
			{
				bookmarkId: "bm1",
				text: "Text 1",
				contentId: "match-a",
				volumeId: "book",
				dateCreated: new Date(),
			},
			{
				bookmarkId: "bm2",
				text: "Text 2",
				contentId: "match-b",
				volumeId: "book",
				dateCreated: new Date(),
			},
		];
		const matchIndex = new Map([
			["match-a", 0],
			["match-b", 1],
		]);

		const result = assignBookmarksToTocEntries(bookmarks, matchIndex);

		expect(result.assigned.size).to.equal(2);
		expect(result.assigned.get(0)).to.have.length(1);
		expect(result.assigned.get(1)).to.have.length(1);
		expect(result.uncategorized).to.have.length(0);
	});

	it("puts unmatched bookmarks in uncategorized", function () {
		const bookmarks: Bookmark[] = [
			{
				bookmarkId: "bm1",
				text: "Text 1",
				contentId: "unknown",
				volumeId: "book",
				dateCreated: new Date(),
			},
		];
		const matchIndex = new Map([["match-a", 0]]);

		const result = assignBookmarksToTocEntries(bookmarks, matchIndex);

		expect(result.assigned.size).to.equal(0);
		expect(result.uncategorized).to.have.length(1);
	});

	it("assigns multiple bookmarks to same TOC entry", function () {
		const bookmarks: Bookmark[] = [
			{
				bookmarkId: "bm1",
				text: "Text 1",
				contentId: "match-a",
				volumeId: "book",
				dateCreated: new Date(),
			},
			{
				bookmarkId: "bm2",
				text: "Text 2",
				contentId: "match-a",
				volumeId: "book",
				dateCreated: new Date(),
			},
		];
		const matchIndex = new Map([["match-a", 0]]);

		const result = assignBookmarksToTocEntries(bookmarks, matchIndex);

		expect(result.assigned.get(0)).to.have.length(2);
	});
});

describe("findRequiredHeadings", function () {
	const toc: TocEntry[] = [
		{
			title: "Part 1",
			matchId: "p1",
			contentId: "c1",
			depth: 1,
			volumeIndex: 0,
		},
		{
			title: "Ch 1",
			matchId: "ch1",
			contentId: "c2",
			depth: 2,
			volumeIndex: 1,
		},
		{
			title: "Sec 1",
			matchId: "s1",
			contentId: "c3",
			depth: 3,
			volumeIndex: 2,
		},
		{
			title: "Part 2",
			matchId: "p2",
			contentId: "c4",
			depth: 1,
			volumeIndex: 3,
		},
		{
			title: "Ch 2",
			matchId: "ch2",
			contentId: "c5",
			depth: 2,
			volumeIndex: 4,
		},
	];

	it("includes assigned index and its ancestors", function () {
		const assignedIndices = new Set([2]); // Sec 1 at depth 3

		const result = findRequiredHeadings(toc, assignedIndices);

		expect(result.has(0)).to.be.true; // Part 1 (depth 1)
		expect(result.has(1)).to.be.true; // Ch 1 (depth 2)
		expect(result.has(2)).to.be.true; // Sec 1 (depth 3)
		expect(result.has(3)).to.be.false; // Part 2 (not ancestor)
		expect(result.has(4)).to.be.false; // Ch 2 (not ancestor)
	});

	it("handles multiple assigned indices from different branches", function () {
		const assignedIndices = new Set([2, 4]); // Sec 1 and Ch 2

		const result = findRequiredHeadings(toc, assignedIndices);

		expect(result.has(0)).to.be.true; // Part 1 (ancestor of Sec 1)
		expect(result.has(1)).to.be.true; // Ch 1 (ancestor of Sec 1)
		expect(result.has(2)).to.be.true; // Sec 1 (assigned)
		expect(result.has(3)).to.be.true; // Part 2 (ancestor of Ch 2)
		expect(result.has(4)).to.be.true; // Ch 2 (assigned)
	});

	it("returns empty set for empty input", function () {
		const result = findRequiredHeadings(toc, new Set());
		expect(result.size).to.equal(0);
	});

	it("handles top-level entry with no ancestors", function () {
		const assignedIndices = new Set([0]); // Part 1 at depth 1

		const result = findRequiredHeadings(toc, assignedIndices);

		expect(result.size).to.equal(1);
		expect(result.has(0)).to.be.true;
	});
});

describe("buildChapterEntries", function () {
	const toc: TocEntry[] = [
		{
			title: "Part 1",
			matchId: "p1",
			contentId: "c1",
			depth: 1,
			volumeIndex: 0,
		},
		{
			title: "Ch 1",
			matchId: "ch1",
			contentId: "c2",
			depth: 2,
			volumeIndex: 1,
		},
		{
			title: "",
			matchId: "empty",
			contentId: "c3",
			depth: 2,
			volumeIndex: 2,
		},
		{
			title: "Ch 2",
			matchId: "ch2",
			contentId: "c4",
			depth: 2,
			volumeIndex: 3,
		},
	];

	it("builds chapter entries for required indices", function () {
		const requiredIndices = new Set([0, 1]);
		const assigned = new Map([[1, [createBookmark("bm1")]]]);

		const result = buildChapterEntries(toc, requiredIndices, assigned, []);

		expect(result).to.have.length(2);
		expect(result[0].title).to.equal("Part 1");
		expect(result[0].depth).to.equal(1);
		expect(result[0].highlights).to.have.length(0);
		expect(result[1].title).to.equal("Ch 1");
		expect(result[1].highlights).to.have.length(1);
	});

	it("skips entries without title", function () {
		const requiredIndices = new Set([0, 2]); // index 2 has empty title
		const assigned = new Map<number, Bookmark[]>();

		const result = buildChapterEntries(toc, requiredIndices, assigned, []);

		expect(result).to.have.length(1);
		expect(result[0].title).to.equal("Part 1");
	});

	it("appends uncategorized entries at the end", function () {
		const requiredIndices = new Set([0]);
		const assigned = new Map<number, Bookmark[]>();
		const uncategorized = [createBookmark("bm1"), createBookmark("bm2")];

		const result = buildChapterEntries(
			toc,
			requiredIndices,
			assigned,
			uncategorized,
		);

		expect(result).to.have.length(2);
		expect(result[1].title).to.equal("Uncategorized");
		expect(result[1].depth).to.equal(1);
		expect(result[1].highlights).to.have.length(2);
	});

	it("does not add Uncategorized if empty", function () {
		const requiredIndices = new Set([0]);
		const assigned = new Map<number, Bookmark[]>();

		const result = buildChapterEntries(toc, requiredIndices, assigned, []);

		expect(result).to.have.length(1);
		expect(result.find((c) => c.title === "Uncategorized")).to.be.undefined;
	});
});

function createBookmark(id: string): Bookmark {
	return {
		bookmarkId: id,
		text: `Text for ${id}`,
		contentId: `content-${id}`,
		volumeId: "book",
		dateCreated: new Date(),
	};
}

describe("stripSuffix", function () {
	it("removes trailing digits after dash", function () {
		expect(
			stripSuffix("book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4-2"),
		).to.equal("book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4");
	});

	it("removes single digit suffix", function () {
		expect(stripSuffix("book.epub!OPS!xhtml/Cover.xhtml-1")).to.equal(
			"book.epub!OPS!xhtml/Cover.xhtml",
		);
	});

	it("leaves string unchanged when no suffix", function () {
		expect(
			stripSuffix("book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4"),
		).to.equal("book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4");
	});

	it("leaves string unchanged when dash not followed by digits", function () {
		expect(stripSuffix("some-path/file.xhtml#section-abc")).to.equal(
			"some-path/file.xhtml#section-abc",
		);
	});

	it("handles empty string", function () {
		expect(stripSuffix("")).to.equal("");
	});
});

describe("extractDepth", function () {
	it("extracts single digit depth", function () {
		expect(extractDepth("book.epub!xhtml/Cover.xhtml-1")).to.equal(1);
	});

	it("extracts multi-digit depth", function () {
		expect(
			extractDepth("book.epub!xhtml/Chapter01.xhtml#ch01_4-2"),
		).to.equal(2);
	});

	it("extracts deep level", function () {
		expect(
			extractDepth("book.epub!Text/wahl.html#sigil_toc_id_6-4"),
		).to.equal(4);
	});

	it("defaults to 1 when no suffix", function () {
		expect(extractDepth("book.epub!xhtml/Chapter01.xhtml#ch01_4")).to.equal(
			1,
		);
	});

	it("defaults to 1 when dash not followed by digits", function () {
		expect(extractDepth("some-path/file.xhtml#section-abc")).to.equal(1);
	});
});

describe("HighlightService", async function () {
	describe("Import All Books", async function () {
		let service: HighlightService;
		let repo: Repository;
		const bookDetails = [
			{
				title: "Book with Highlights",
				author: "Author 1",
				description: "Description 1",
				publisher: "Publisher 1",
				dateLastRead: new Date("2024-01-01"),
				readStatus: 2,
				percentRead: 100,
				isbn: "1234567890",
				series: "Series 1",
				seriesNumber: 1,
				timeSpentReading: 1000,
			},
			{
				title: "Book without Highlights",
				author: "Author 2",
				description: "Description 2",
				publisher: "Publisher 2",
				dateLastRead: new Date("2024-01-02"),
				readStatus: 1,
				percentRead: 50,
				isbn: "0987654321",
				series: "Series 2",
				seriesNumber: 2,
				timeSpentReading: 500,
			},
		];

		before(async function () {
			repo = {} as Repository;

			repo.getAllBookDetails = () => Promise.resolve(bookDetails);
			repo.getBookDetailsByBookTitle = (title) => {
				const details = bookDetails.find(
					(book) => book.title === title,
				);
				return Promise.resolve(details || null);
			};

			service = new HighlightService(repo);
		});

		it("getAllBooks should return all books with correct details", async function () {
			const books = await service.getAllBooks();
			expect(books.size).to.equal(2);

			const bookWithHighlights = books.get("Book with Highlights");
			const bookWithoutHighlights = books.get("Book without Highlights");

			expect(bookWithHighlights).to.not.be.undefined;
			expect(bookWithoutHighlights).to.not.be.undefined;

			expect(bookWithHighlights?.author).to.equal("Author 1");
			expect(bookWithHighlights?.percentRead).to.equal(100);
			expect(bookWithoutHighlights?.author).to.equal("Author 2");
			expect(bookWithoutHighlights?.percentRead).to.equal(50);
		});

		it("getBookDetailsFromBookTitle should return correct book details", async function () {
			const details1 = await service.getBookDetailsFromBookTitle(
				"Book with Highlights",
			);
			expect(details1).to.deep.include({
				title: "Book with Highlights",
				author: "Author 1",
				description: "Description 1",
				percentRead: 100,
				isbn: "1234567890",
			});

			const details2 = await service.getBookDetailsFromBookTitle(
				"Book without Highlights",
			);
			expect(details2).to.deep.include({
				title: "Book without Highlights",
				author: "Author 2",
				description: "Description 2",
				percentRead: 50,
				isbn: "0987654321",
			});

			const nonExistentBook =
				await service.getBookDetailsFromBookTitle("Non-existent Book");
			expect(nonExistentBook).to.deep.equal({
				title: "Unknown Title",
				author: "Unknown Author",
			});
		});
	});

	describe("buildBookHighlightMap", async function () {
		it("matches bookmarks to TOC entries via stripped suffix", async function () {
			const repo = {} as Repository;
			repo.getBookTitleByContentId = () =>
				Promise.resolve("The Starlight Archive");
			repo.getTocEntriesByBookId = () =>
				Promise.resolve([
					{
						title: "Part One: The Voyage",
						contentId: "book!ch01.xhtml#part1-1",
						matchId: "book!ch01.xhtml#part1",
						depth: 1,
						volumeIndex: 0,
					},
					{
						title: "1. The Departure",
						contentId: "book!ch01.xhtml#sec1-2",
						matchId: "book!ch01.xhtml#sec1",
						depth: 2,
						volumeIndex: 1,
					},
					{
						title: "2. The Storm",
						contentId: "book!ch01.xhtml#sec2-2",
						matchId: "book!ch01.xhtml#sec2",
						depth: 2,
						volumeIndex: 2,
					},
				]);

			const service = new HighlightService(repo);
			const bookmarks: Bookmark[] = [
				{
					bookmarkId: "bm1",
					text: "A passage about stars",
					contentId: "book!ch01.xhtml#sec1",
					volumeId: "book-volume",
					dateCreated: new Date("2024-01-01"),
				},
			];

			const result = await service.buildBookHighlightMap(bookmarks);

			expect(result.size).to.equal(1);
			const chapters = result.get("The Starlight Archive");
			expect(chapters).to.not.be.undefined;
			expect(chapters).to.have.length(2);

			// Part One emitted as ancestor
			expect(chapters![0].title).to.equal("Part One: The Voyage");
			expect(chapters![0].depth).to.equal(1);
			expect(chapters![0].highlights).to.have.length(0);

			// Section 1 with the highlight
			expect(chapters![1].title).to.equal("1. The Departure");
			expect(chapters![1].depth).to.equal(2);
			expect(chapters![1].highlights).to.have.length(1);
		});

		it("puts unmatched bookmarks in Uncategorized", async function () {
			const repo = {} as Repository;
			repo.getBookTitleByContentId = () =>
				Promise.resolve("The Starlight Archive");
			repo.getTocEntriesByBookId = () =>
				Promise.resolve([
					{
						title: "Chapter One",
						contentId: "book!ch01.xhtml-1",
						matchId: "book!ch01.xhtml",
						depth: 1,
						volumeIndex: 0,
					},
				]);

			const service = new HighlightService(repo);
			const bookmarks: Bookmark[] = [
				{
					bookmarkId: "bm1",
					text: "An unmatched passage",
					contentId: "book!unknown.xhtml#x",
					volumeId: "book-volume",
					dateCreated: new Date("2024-01-01"),
				},
			];

			const result = await service.buildBookHighlightMap(bookmarks);
			const chapters = result.get("The Starlight Archive")!;

			const uncategorized = chapters.find(
				(c) => c.title === "Uncategorized",
			);
			expect(uncategorized).to.not.be.undefined;
			expect(uncategorized!.highlights).to.have.length(1);
		});

		it("falls back to Uncategorized when no 899 entries exist", async function () {
			const repo = {} as Repository;
			repo.getBookTitleByContentId = () =>
				Promise.resolve("The Starlight Archive");
			repo.getTocEntriesByBookId = () => Promise.resolve([]);

			const service = new HighlightService(repo);
			const bookmarks: Bookmark[] = [
				{
					bookmarkId: "bm1",
					text: "Some text",
					contentId: "book!ch01.xhtml",
					volumeId: "book-volume",
					dateCreated: new Date("2024-01-01"),
				},
			];

			const result = await service.buildBookHighlightMap(bookmarks);
			const chapters = result.get("The Starlight Archive")!;

			expect(chapters).to.have.length(1);
			expect(chapters[0].title).to.equal("Uncategorized");
			expect(chapters[0].highlights).to.have.length(1);
		});

		it("handles multi-level hierarchy with ancestor emission", async function () {
			const repo = {} as Repository;
			repo.getBookTitleByContentId = () =>
				Promise.resolve("The Starlight Archive");
			repo.getTocEntriesByBookId = () =>
				Promise.resolve([
					{
						title: "The Enchanted Forest",
						contentId: "book!forest.html#id_1-1",
						matchId: "book!forest.html#id_1",
						depth: 1,
						volumeIndex: 0,
					},
					{
						title: "I. The Crystal Cave",
						contentId: "book!forest.html#id_2-2",
						matchId: "book!forest.html#id_2",
						depth: 2,
						volumeIndex: 1,
					},
					{
						title: "1. The Hidden Door",
						contentId: "book!forest.html#id_3-3",
						matchId: "book!forest.html#id_3",
						depth: 3,
						volumeIndex: 2,
					},
					{
						title: "II. The Mountain Pass",
						contentId: "book!forest.html#id_4-2",
						matchId: "book!forest.html#id_4",
						depth: 2,
						volumeIndex: 3,
					},
				]);

			const service = new HighlightService(repo);
			const bookmarks: Bookmark[] = [
				{
					bookmarkId: "bm1",
					text: "Deep passage",
					contentId: "book!forest.html#id_3",
					volumeId: "book-volume",
					dateCreated: new Date("2024-01-01"),
				},
			];

			const result = await service.buildBookHighlightMap(bookmarks);
			const chapters = result.get("The Starlight Archive")!;

			// Should emit: Forest (depth 1), Crystal Cave (depth 2), Hidden Door (depth 3)
			// Should NOT emit: Mountain Pass (no highlights)
			expect(chapters).to.have.length(3);
			expect(chapters[0].title).to.equal("The Enchanted Forest");
			expect(chapters[0].depth).to.equal(1);
			expect(chapters[1].title).to.equal("I. The Crystal Cave");
			expect(chapters[1].depth).to.equal(2);
			expect(chapters[2].title).to.equal("1. The Hidden Door");
			expect(chapters[2].depth).to.equal(3);
			expect(chapters[2].highlights).to.have.length(1);
		});
	});
});
