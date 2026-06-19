import * as chai from "chai";
import { readFileSync } from "fs";
import SqlJs, { Database } from "sql.js";
import { binary } from "../binaries/sql-wasm";
import { Repository } from "./repository";

/* eslint-disable @typescript-eslint/no-unused-expressions */

describe("Repository", async function () {
	let db: Database;
	let repo: Repository;

	before(async function () {
		const SQLEngine = await SqlJs({
			wasmBinary: binary.buffer,
		});

		db = new SQLEngine.Database(readFileSync("KoboReader.sqlite"));
		repo = new Repository(db);
	});

	after(function () {
		db.close();
	});

	it("getAllBookmark", async function () {
		chai.expect(await repo.getAllBookmark()).length.above(0);
	});
	it("getBookmarkById null", async function () {
		chai.expect(await repo.getBookmarkById("")).is.null;
	});
	it("getBookmarkById not null", async function () {
		const bookmarks = await repo.getAllBookmark();
		chai.expect(bookmarks.length).to.be.above(0);
		const first = bookmarks[0];
		chai.expect(await repo.getBookmarkById(first.bookmarkId)).is.not
			.null;
	});
	it("extracts bookmark color", async function () {
		const SQLEngine = await SqlJs({
			wasmBinary: binary.buffer,
		});
		const colorDb = new SQLEngine.Database();
		const colorRepo = new Repository(colorDb);

		colorDb.run(`
			CREATE TABLE Bookmark (
				BookmarkID TEXT,
				Text TEXT,
				ContentID TEXT,
				annotation TEXT,
				DateCreated TEXT,
				ChapterProgress REAL,
				Color INTEGER
			);
			INSERT INTO Bookmark
				(BookmarkID, Text, ContentID, annotation, DateCreated, ChapterProgress, Color)
			VALUES
				('bookmark-with-color', 'Highlighted text', 'content-id', 'Note', '2024-01-01T00:00:00Z', 0.1, 2);
		`);

		const bookmarks = await colorRepo.getAllBookmark();
		const bookmark = await colorRepo.getBookmarkById("bookmark-with-color");

		chai.expect(bookmarks[0].color).eq("2");
		chai.expect(bookmark?.color).eq("2");

		colorDb.close();
	});
	it("getAllContent", async function () {
		chai.expect(await repo.getAllContent()).length.above(0);
	});
	it("getContentByContentId", async function () {
		const content = await repo.getAllContent(1);
		chai.expect(
			await repo.getContentByContentId(content.pop()?.contentId ?? ""),
		).not.null;
	});
	it("getContentByContentId no results", async function () {
		chai.expect(await repo.getContentByContentId("")).null;
	});
	it("getAllContentByBookTitle", async function () {
		const contents = await repo.getAllContent();
		const titles: string[] = [];
		contents.forEach((c) => {
			if (c.bookTitle != null) {
				titles.push(c.bookTitle);
			}
		});
		chai.expect(
			await repo.getAllContentByBookTitle(
				titles.at(Math.floor(Math.random() * titles.length)) ?? "",
			),
		).length.above(0);
	});
	it("getBookDetailsByBookTitle returns details for a real book", async function () {
		const allBooks = repo.getAllBookDetails();
		chai.expect(allBooks.length).to.be.above(0);

		const firstBook = allBooks[0];
		const details = repo.getBookDetailsByBookTitle(firstBook.title);

		chai.expect(details).not.null;
		chai.expect(details?.title).is.eq(firstBook.title);
		chai.expect(details?.author).is.eq(firstBook.author);
	});
	it("getAllBookDetails returns books with valid data", async function () {
		const allBooks = repo.getAllBookDetails();
		chai.expect(allBooks.length).to.be.above(0);

		for (const book of allBooks) {
			chai.expect(book.title).to.be.a("string").and.not.empty;
			chai.expect(book.author).to.be.a("string").and.not.empty;
		}
	});

	describe("WordList", function () {
		it("hasWordListTable returns false when table absent", async function () {
			const SQLEngine = await SqlJs({
				wasmBinary: binary.buffer,
			});
			const emptyDb = new SQLEngine.Database();
			const emptyRepo = new Repository(emptyDb);

			chai.expect(emptyRepo.hasWordListTable()).to.be.false;
			chai.expect(emptyRepo.getAllWords()).to.have.length(0);

			emptyDb.close();
		});

		it("getAllWords returns words from WordList table", async function () {
			const SQLEngine = await SqlJs({
				wasmBinary: binary.buffer,
			});
			const wordDb = new SQLEngine.Database();
			const wordRepo = new Repository(wordDb);

			wordDb.run(`
				CREATE TABLE WordList (
					Text TEXT,
					VolumeId TEXT,
					DictSuffix TEXT,
					DateCreated TEXT
				);
				INSERT INTO WordList (Text, VolumeId, DictSuffix, DateCreated)
				VALUES
					('ephemeral', 'file:///mnt/onboard/book1.epub', '-en', '2024-01-15T10:00:00Z'),
					('ubiquitous', 'file:///mnt/onboard/book2.epub', '-en-fr', '2024-02-20T14:30:00Z'),
					('Wanderlust', 'file:///mnt/onboard/book3.epub', '-de', '2024-03-01T09:00:00Z');
			`);

			chai.expect(wordRepo.hasWordListTable()).to.be.true;

			const words = wordRepo.getAllWords();
			chai.expect(words).to.have.length(3);
			chai.expect(words[0].text).to.equal("Wanderlust");
			chai.expect(words[0].dictSuffix).to.equal("-de");
			chai.expect(words[0].volumeId).to.equal("file:///mnt/onboard/book3.epub");
			chai.expect(words[0].dateCreated).to.be.instanceOf(Date);

			wordDb.close();
		});

		it("getAllWords handles missing optional columns", async function () {
			const SQLEngine = await SqlJs({
				wasmBinary: binary.buffer,
			});
			const wordDb = new SQLEngine.Database();
			const wordRepo = new Repository(wordDb);

			wordDb.run(`
				CREATE TABLE WordList (Text TEXT);
				INSERT INTO WordList (Text) VALUES ('hello'), ('world');
			`);

			const words = wordRepo.getAllWords();
			chai.expect(words).to.have.length(2);
			chai.expect(words[0].text).to.equal("hello");
			chai.expect(words[0].dictSuffix).to.be.undefined;
			chai.expect(words[0].dateCreated).to.be.undefined;

			wordDb.close();
		});
	});
});
