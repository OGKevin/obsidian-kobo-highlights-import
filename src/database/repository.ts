import { Database, Statement } from "sql.js";
import { BookDetails, Bookmark, Content } from "./interfaces";

export class Repository {
	db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	async getAllBookmark(sortByChapterProgress?: boolean, importArticles?: boolean): Promise<Bookmark[]> {
		let query = `select b.BookmarkID, b.Text, b.ContentID, b.annotation, b.DateCreated, b.ChapterProgress from Bookmark b join content c on b.ContentID = c.ContentID where b.Text is not null`;

		if (importArticles) {
			query += ` and (c.MimeType = 'application/xhtml+xml' or c.MimeType = 'application/x-kobo-epub+zip' or c.MimeType = 'application/x-kobo-html+instapaper')`;
		} else {
			query += ` and (c.MimeType = 'application/xhtml+xml' or c.MimeType = 'application/x-kobo-epub+zip')`;
		}

		if (sortByChapterProgress) {
			query += ` order by b.ChapterProgress ASC, b.DateCreated ASC;`;
		} else {
			query += ` order by b.DateCreated ASC;`;
		}

		const res = this.db.exec(query);

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
			});
		});

		return bookmarks;
	}

	async getTotalBookmark(): Promise<number> {
		const res = this.db.exec(
			`select count(*) from Bookmark where Text is not null;`,
		);

		return +res[0].values[0].toString();
	}

	async getBookmarkById(id: string): Promise<Bookmark | null> {
		const statement = this.db.prepare(
			`select BookmarkID, Text, ContentID, annotation, DateCreated from Bookmark where BookmarkID = $id;`,
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
		};
	}

	async getContentByContentId(contentId: string): Promise<Content | null> {
		const statement = this.db.prepare(
			`select
                Title, ContentID, ChapterIDBookmarked, BookTitle from content
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

	async getContentLikeContentId(contentId: string): Promise<Content | null> {
		const statement = this.db.prepare(
			`select
                Title, ContentID, ChapterIDBookmarked, BookTitle from content
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

	async getFirstContentLikeContentIdWithBookmarkIdNotNull(contentId: string) {
		const statement = this.db.prepare(
			`select
                Title, ContentID, ChapterIDBookmarked, BookTitle from "content"
                where "ContentID" like $id and "ChapterIDBookmarked" not NULL limit 1`,
			{ $id: `${contentId}%` },
		);
		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents.pop() || null;
	}

	async getAllContent(limit = 100): Promise<Content[]> {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle from content limit $limit`,
			{ $limit: limit },
		);

		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents;
	}

	async getAllContentByBookTitle(bookTitle: string): Promise<Content[]> {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle  from "content" where BookTitle = $bookTitle`,
			{ $bookTitle: bookTitle },
		);

		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents;
	}

	async getAllContentByBookTitleOrderedByContentId(
		bookTitle: string,
	): Promise<Content[]> {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle  from "content" where BookTitle = $bookTitle order by "ContentID"`,
			{ $bookTitle: bookTitle },
		);

		const contents = this.parseContentStatement(statement);
		statement.free();

		return contents;
	}

	async getBookDetailsByBookTitle(
		bookTitle: string,
	): Promise<BookDetails | null> {
		const statement = this.db.prepare(
			`select Attribution, Description, Publisher, DateLastRead, LastTimeStartedReading, ReadStatus, ___PercentRead, ISBN, Series, SeriesNumber, TimeSpentReading from content where Title = $title limit 1;`,
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
				"Used query: select Attribution, Description, Publisher, DateLastRead, LastTimeStartedReading, ReadStatus, ___PercentRead, ISBN, Series, SeriesNumber, TimeSpentReading from content where Title = $title limit 1;",
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
			lastTimeStartedReading: row[4] ? new Date(row[4].toString()) : undefined,
			readStatus: row[5] ? +row[5].toString() : 0,
			percentRead: row[6] ? +row[6].toString() : 0,
			isbn: row[7]?.toString(),
			series: row[8]?.toString(),
			seriesNumber: row[9] ? +row[9].toString() : undefined,
			timeSpentReading: row[10] ? +row[10].toString() : 0,
		};
	}

	async getAllBookDetails(importArticles?: boolean): Promise<BookDetails[]> {
		let query = `SELECT
                COALESCE(BookTitle, Title) as BookTitle,
                MAX(Attribution) as Author,
                MAX(Description) as Description,
                MAX(Publisher) as Publisher,
                MAX(DateLastRead) as DateLastRead,
                MAX(LastTimeStartedReading) as LastTimeStartedReading,
                MAX(ReadStatus) as ReadStatus,
                MAX(___PercentRead) as ___PercentRead,
                MAX(ISBN) as ISBN,
                MAX(Series) as Series,
                MAX(SeriesNumber) as SeriesNumber,
                MAX(TimeSpentReading) as TimeSpentReading
            FROM content
            WHERE COALESCE(BookTitle, Title) IS NOT NULL`;

		if (importArticles) {
			query += ` AND (MimeType = 'application/xhtml+xml' or MimeType = 'application/x-kobo-epub+zip' or MimeType = 'application/x-kobo-html+instapaper')`;
		} else {
			query += ` AND (MimeType = 'application/xhtml+xml' or MimeType = 'application/x-kobo-epub+zip')`;
		}

		query += ` GROUP BY COALESCE(BookTitle, Title) ORDER BY COALESCE(BookTitle, Title) ASC;`;

		const statement = this.db.prepare(query);

		const books: BookDetails[] = [];

		while (statement.step()) {
			const row = statement.get();
			if (row[0] == null) {
				continue; // Skip entries without title
			}

			books.push({
				title: row[0].toString(),
				author: row[1]?.toString() ?? "",
				description: row[2]?.toString(),
				publisher: row[3]?.toString(),
				dateLastRead: row[4] ? new Date(row[4].toString()) : undefined,
				lastTimeStartedReading: row[5] ? new Date(row[5].toString()) : undefined,
				readStatus: row[6] ? +row[6].toString() : 0,
				percentRead: row[7] ? +row[7].toString() : 0,
				isbn: row[8]?.toString(),
				series: row[9]?.toString(),
				seriesNumber: row[10] ? +row[10].toString() : undefined,
				timeSpentReading: row[11] ? +row[11].toString() : 0,
			});
		}

		statement.free();
		return books;
	}

	async getUniqueContentTypes(): Promise<string[]> {
		const statement = this.db.prepare(
			`select DISTINCT ContentType from content where ContentType is not null order by ContentType ASC;`,
		);

		const contentTypes: string[] = [];

		while (statement.step()) {
			const row = statement.get();
			if (row[0] != null) {
				contentTypes.push(row[0].toString());
			}
		}

		statement.free();
		return contentTypes;
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
			});
		}

		return contents;
	}
}
