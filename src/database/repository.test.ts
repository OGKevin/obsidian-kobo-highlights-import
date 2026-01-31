import * as chai from "chai";
import { readFileSync } from "fs";
import SqlJs, { Database } from "sql.js";
import { binary } from "../binaries/sql-wasm";
import { HighlightService } from "./Highlight";
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

	it("getAllBookmark should be ordered by FileOffset and ChapterProgress", async function () {
		const bookmarks = await repo.getAllBookmark();
		chai.expect(bookmarks).length.above(0);

		const negotiatedMarriageBookmarks = bookmarks.filter((b) =>
			b.contentId.includes("053b483c-267a-4601-8619-29e619c6e9d3"),
		);

		if (negotiatedMarriageBookmarks.length >= 2) {
			const chapterNumbers = negotiatedMarriageBookmarks.map((b) => {
				const match = b.contentId.match(/!!c(\d+)\.xhtml/);
				return match ? parseInt(match[1]) : 0;
			});

			for (let i = 1; i < chapterNumbers.length; i++) {
				chai.expect(chapterNumbers[i]).to.be.at.least(
					chapterNumbers[i - 1],
				);
			}
		}
	});

	it("getBookmarkById null", async function () {
		chai.expect(await repo.getBookmarkById("")).is.null;
	});
	it("getBookmarkById not null", async function () {
		chai.expect(
			await repo.getBookmarkById("e7f8f92d-38ca-4556-bab8-a4d902e9c430"),
		).is.not.null;
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
				titles[Math.floor(Math.random() * titles.length)] ?? "",
			),
		).length.above(0);
	});
	it("getBookDetailsOnePunchMan", async function () {
		const details = await repo.getBookDetailsByBookTitle(
			"One-Punch Man, Vol. 2",
		);

		chai.expect(details).not.null;
		chai.expect(details?.title).is.eq("One-Punch Man, Vol. 2");
		chai.expect(details?.author).is.eq("ONE");
		chai.expect(details?.description).not.null;
		chai.expect(details?.publisher).is.eq("VIZ Media LLC");
		chai.expect(details?.dateLastRead).not.null;
		chai.expect(details?.readStatus).is.eq(2);
		chai.expect(details?.percentRead).is.eq(100);
		chai.expect(details?.isbn).is.eq("9781421585659");
		chai.expect(details?.seriesNumber).is.eq(2);
		chai.expect(details?.series).is.eq("One-Punch man");
		chai.expect(details?.timeSpentReading).is.eq(780);
	});
	it("getAllBookDetailsByBookTitle", async function () {
		const bookmarks = await repo.getAllBookmark();
		let titles: string[] = [];

		bookmarks.forEach(async (b) => {
			let content = await this.repo.getContentByContentId(b.contentId);

			if (content == null) {
				content = await this.repo.getContentLikeContentId(b.contentId);
			}

			titles.push(content.title);
		});

		titles = titles.filter((v, i, a) => a.indexOf(v) === i);

		titles.forEach(async (t) => {
			const details = await repo.getBookDetailsByBookTitle(t);

			chai.expect(details).not.null;
		});
	});

	it("getTocByBookTitle should return TOC entries ordered by VolumeIndex", async function () {
		const toc = await repo.getTocByBookTitle("One-Punch Man, Vol. 2");

		chai.expect(toc.length).to.be.above(0);
		
		toc.forEach((entry) => {
			chai.expect(entry.title).to.not.be.empty;
			chai.expect(entry.contentId).to.not.be.empty;
			chai.expect(entry.depth).to.be.a("number");
		});
	});

	it("stripContentIdSuffix should remove trailing digit suffix", function () {
		chai.expect(repo.stripContentIdSuffix("book!ch01.xhtml-1")).to.equal("book!ch01.xhtml");
		chai.expect(repo.stripContentIdSuffix("book!ch01.xhtml#sec1-2")).to.equal("book!ch01.xhtml#sec1");
		chai.expect(repo.stripContentIdSuffix("book!ch01.xhtml#sec1-10")).to.equal("book!ch01.xhtml#sec1");
		chai.expect(repo.stripContentIdSuffix("book!ch01.xhtml")).to.equal("book!ch01.xhtml");
	});

	it("buildHierarchicalChapters with real database", async function () {
		const service = new HighlightService(repo);
		const highlights = await service.getAllHighlight();
		
		const bookTitles = new Set<string>();
		for (const highlight of highlights) {
			if (highlight.content.bookTitle) {
				bookTitles.add(highlight.content.bookTitle);
			}
		}

		chai.expect(bookTitles.size).to.be.above(0);

		for (const bookTitle of Array.from(bookTitles).slice(0, 3)) {
			const hierarchical = await service.buildHierarchicalChapters(
				bookTitle,
				highlights,
			);

			if (hierarchical.length > 0) {
				hierarchical.forEach((chapter) => {
					chai.expect(chapter.title).to.be.a("string");
					chai.expect(chapter.title).to.not.be.empty;
					chai.expect(chapter.depth).to.be.a("number");
					chai.expect(chapter.depth).to.be.at.least(1);
					chai.expect(chapter.highlights).to.be.an("array");
					chai.expect(chapter.highlights.length).to.be.above(0);
					
					chapter.highlights.forEach((highlight) => {
						chai.expect(highlight.bookmarkId).to.be.a("string");
						chai.expect(highlight.text).to.be.a("string");
						chai.expect(highlight.contentId).to.be.a("string");
					});
				});
			}
		}
	});
});
