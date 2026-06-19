import { Database, Statement } from "sql.js";
import { BookDetails, Bookmark, Content, Word } from "./interfaces";

export class Repository {
	db: Database;
	private bookmarkColorColumnExists?: boolean;
	private wordListTableExists?: boolean;
	private wordListColumns?: string[];

	constructor(db: Database) {
		this.db = db;
	}

	getAllBookmark(sortByChapterProgress?: boolean): Bookmark[] {
		const colorColumn = this.getBookmarkColorColumnSelection();
		let res;
		if (sortByChapterProgress) {
			res = this.db.exec(
				`select BookmarkID, Text, ContentID, annotation, DateCreated, ChapterProgress, ${colorColumn} from Bookmark where Text is not null order by ChapterProgress ASC, DateCreated ASC;`,
			);
		} else {
			res = this.db.exec(
				`select BookmarkID, Text, ContentID, annotation, DateCreated, ChapterProgress, ${colorColumn} from Bookmark where Text is not null order by DateCreated ASC;`,
			);
		}
		const bookmarks: Bookmark[] = [];

		if (res[0].values == undefined) {
			console.warn(
				"Bookmarks table returend no results, do you have any annotations created?",
			);

			return bookmarks;
		}

		res[0].values.forEach((row) => {
			if (!(row[0] && row[1] && row[2] && row[4])) {
				console.warn(
					"Skipping bookmark with invalid values",
					row[0],
					row[1],
					row[2],
					row[3],
					row[4],
				);

				return;
			}

			bookmarks.push({
				bookmarkId: row[0].toString(),
				text: row[1].toString().replace(/\s+/g, " ").trim(),
				contentId: row[2].toString(),
				note: row[3]?.toString(),
				dateCreated: new Date(row[4].toString()),
				color: row[6]?.toString(),
			});
		});

		return bookmarks;
	}

	getTotalBookmark(): number {
		const res = this.db.exec(
			`select count(*) from Bookmark where Text is not null;`,
		);

		return +res[0].values[0].toString();
	}

	getBookmarkById(id: string): Bookmark | null {
		const colorColumn = this.getBookmarkColorColumnSelection();
		const statement = this.db.prepare(
			`select BookmarkID, Text, ContentID, annotation, DateCreated, ${colorColumn} from Bookmark where BookmarkID = $id;`,
			{
				$id: id,
			},
		);

		if (!statement.step()) {
			return null;
		}

		const row = statement.get();

		if (!(row[0] && row[1] && row[2] && row[4])) {
			throw new Error("Bookmark column returned unexpected null");
		}

		return {
			bookmarkId: row[0].toString(),
			text: row[1].toString().replace(/\s+/g, " ").trim(),
			contentId: row[2].toString(),
			note: row[3]?.toString(),
			dateCreated: new Date(row[4].toString()),
			color: row[5]?.toString(),
		};
	}

	private getBookmarkColorColumnSelection(): string {
		return this.hasBookmarkColorColumn() ? "Color" : "NULL as Color";
	}

	private hasBookmarkColorColumn(): boolean {
		if (this.bookmarkColorColumnExists !== undefined) {
			return this.bookmarkColorColumnExists;
		}

		const res = this.db.exec(`PRAGMA table_info(Bookmark);`);
		this.bookmarkColorColumnExists =
			res[0]?.values.some((row) => row[1]?.toString() === "Color") ??
			false;

		return this.bookmarkColorColumnExists;
	}

	getContentByContentId(contentId: string): Content | null {
		const statement = this.db.prepare(
			`select
                Title, ContentID, ChapterIDBookmarked, BookTitle, VolumeIndex from content
                where ContentID = $id;`,
			{ $id: contentId },
		);
		const contents = this.parseContentStatement(statement);
		statement.free();

		if (contents.length > 1) {
			throw new Error(
				"filtering by contentId yielded more then 1 result",
			);
		}

		return contents.pop() || null;
	}

	getContentLikeContentId(contentId: string): Content | null {
		const statement = this.db.prepare(
			`select
                Title, ContentID, ChapterIDBookmarked, BookTitle, VolumeIndex from content
                where ContentID like $id;`,
			{ $id: `%${contentId}%` },
		);
		const contents = this.parseContentStatement(statement);
		statement.free();

		if (contents.length > 1) {
			console.warn(
				`filtering by contentId yielded more then 1 result: ${contentId}, using the first result.`,
			);
		}

		return contents.shift() || null;
	}

	getFirstContentLikeContentIdWithBookmarkIdNotNull(contentId: string) {
		const statement = this.db.prepare(
			`select
                Title, ContentID, ChapterIDBookmarked, BookTitle, VolumeIndex from "content"
                where "ContentID" like $id and "ChapterIDBookmarked" not NULL limit 1`,
			{ $id: `${contentId}%` },
		);
		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents.pop() || null;
	}

	getAllContent(limit = 100): Content[] {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle, VolumeIndex from content limit $limit`,
			{ $limit: limit },
		);

		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents;
	}

	getAllContentByBookTitle(bookTitle: string): Content[] {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle, VolumeIndex from "content" where BookTitle = $bookTitle`,
			{ $bookTitle: bookTitle },
		);

		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents;
	}

	getAllContentByBookTitleOrderedByContentId(
		bookTitle: string,
	): Content[] {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle, VolumeIndex from "content" where BookTitle = $bookTitle order by "ContentID"`,
			{ $bookTitle: bookTitle },
		);

		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents;
	}

	getBookDetailsByBookTitle(
		bookTitle: string,
	): BookDetails | null {
		const statement = this.db.prepare(
			`select Attribution, Description, Publisher, DateLastRead, ReadStatus, ___PercentRead, ISBN, Series, SeriesNumber, TimeSpentReading from content where Title = $title limit 1;`,
			{
				$title: bookTitle,
			},
		);

		if (!statement.step()) {
			return null;
		}

		const row = statement.get();

		if (row.length == 0 || row[0] == null) {
			console.debug(
				"Used query: select Attribution, Description, Publisher, DateLastRead, ReadStatus, ___PercentRead, ISBN, Series, SeriesNumber, TimeSpentReading from content where Title = $title limit 2;",
				{ $title: bookTitle, result: row },
			);
			console.warn("Could not find book details in database");

			return null;
		}

		return {
			title: bookTitle,
			author: row[0].toString(),
			description: row[1]?.toString(),
			publisher: row[2]?.toString(),
			dateLastRead: row[3] ? new Date(row[3].toString()) : undefined,
			readStatus: row[4] ? +row[4].toString() : 0,
			percentRead: row[5] ? +row[5].toString() : 0,
			isbn: row[6]?.toString(),
			series: row[7]?.toString(),
			seriesNumber: row[8] ? +row[8].toString() : undefined,
			timeSpentReading: row[9] ? +row[9].toString() : 0,
		};
	}

	getAllBookDetails(): BookDetails[] {
		const statement = this.db.prepare(
			`SELECT
                Title,
                Attribution as Author,
                Description,
                Publisher,
                DateLastRead,
                ReadStatus,
                ___PercentRead,
                ISBN,
                Series,
                SeriesNumber,
                TimeSpentReading
            FROM content
            WHERE Title IS NOT NULL
            GROUP BY Title
            ORDER BY Title ASC;`,
		);

		const books: BookDetails[] = [];

		while (statement.step()) {
			const row = statement.get();
			if (row[0] == null || row[1] == null) {
				continue;
			}

			books.push({
				title: row[0].toString(),
				author: row[1].toString(),
				description: row[2]?.toString(),
				publisher: row[3]?.toString(),
				dateLastRead: row[4] ? new Date(row[4].toString()) : undefined,
				readStatus: row[5] ? +row[5].toString() : 0,
				percentRead: row[6] ? +row[6].toString() : 0,
				isbn: row[7]?.toString(),
				series: row[8]?.toString(),
				seriesNumber: row[9] ? +row[9].toString() : undefined,
				timeSpentReading: row[10] ? +row[10].toString() : 0,
			});
		}

		statement.free();
		return books;
	}

	private parseContentStatement(statement: Statement): Content[] {
		const contents: Content[] = [];

		while (statement.step()) {
			const row = statement.get();
			contents.push({
				title: row[0]?.toString() ?? "",
				contentId: row[1]?.toString() ?? "",
				chapterIdBookmarked: row[2]?.toString(),
				bookTitle: row[3]?.toString(),
				volumeIndex: row[4] != null ? +row[4] : undefined,
			});
		}

		return contents;
	}

	hasWordListTable(): boolean {
		if (this.wordListTableExists !== undefined) {
			return this.wordListTableExists;
		}

		try {
			const res = this.db.exec(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='WordList';",
			);
			this.wordListTableExists =
				res.length > 0 && res[0].values.length > 0;
		} catch {
			this.wordListTableExists = false;
		}

		return this.wordListTableExists;
	}

	private getWordListColumns(): string[] {
		if (this.wordListColumns !== undefined) {
			return this.wordListColumns;
		}

		const res = this.db.exec("PRAGMA table_info(WordList);");
		this.wordListColumns =
			res[0]?.values.map((row) => row[1]?.toString() ?? "") ?? [];

		return this.wordListColumns;
	}

	getAllWords(): Word[] {
		if (!this.hasWordListTable()) {
			return [];
		}

		const columns = this.getWordListColumns();
		const hasDictSuffix = columns.includes("DictSuffix");
		const hasVolumeId = columns.includes("VolumeId");
		const hasDateCreated = columns.includes("DateCreated");

		const selectCols = ["Text"];
		if (hasDictSuffix) selectCols.push("DictSuffix");
		if (hasVolumeId) selectCols.push("VolumeId");
		if (hasDateCreated) selectCols.push("DateCreated");

		const orderBy = hasDateCreated ? "DateCreated DESC" : "Text ASC";
		const res = this.db.exec(
			`SELECT ${selectCols.join(", ")} FROM WordList ORDER BY ${orderBy};`,
		);

		if (!res[0]?.values) return [];

		const words: Word[] = [];
		for (const row of res[0].values) {
			if (!row[0]) continue;

			const word: Word = { text: row[0].toString() };
			let colIdx = 1;

			if (hasDictSuffix) {
				word.dictSuffix = row[colIdx]?.toString();
				colIdx++;
			}
			if (hasVolumeId) {
				word.volumeId = row[colIdx]?.toString();
				colIdx++;
			}
			if (hasDateCreated && row[colIdx]) {
				word.dateCreated = new Date(row[colIdx]!.toString());
			}

			words.push(word);
		}

		return words;
	}
}
