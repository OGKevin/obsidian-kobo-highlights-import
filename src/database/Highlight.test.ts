import { expect } from "chai";
import { HighlightService } from "./Highlight";
import { Bookmark } from "./interfaces";
import { Repository, stripSuffix, extractDepth } from "./repository";

/* eslint-disable @typescript-eslint/no-unused-expressions */

describe("stripSuffix", function () {
	it("removes trailing digits after dash", function () {
		expect(stripSuffix("book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4-2")).to.equal(
			"book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4",
		);
	});

	it("removes single digit suffix", function () {
		expect(stripSuffix("book.epub!OPS!xhtml/Cover.xhtml-1")).to.equal(
			"book.epub!OPS!xhtml/Cover.xhtml",
		);
	});

	it("leaves string unchanged when no suffix", function () {
		expect(stripSuffix("book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4")).to.equal(
			"book.epub!OPS!xhtml/Chapter01.xhtml#chapter01_4",
		);
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
		expect(extractDepth("book.epub!xhtml/Chapter01.xhtml#ch01_4-2")).to.equal(2);
	});

	it("extracts deep level", function () {
		expect(extractDepth("book.epub!Text/wahl.html#sigil_toc_id_6-4")).to.equal(4);
	});

	it("defaults to 1 when no suffix", function () {
		expect(extractDepth("book.epub!xhtml/Chapter01.xhtml#ch01_4")).to.equal(1);
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
