import { Database, Statement } from "sql.js";
import { BookDetails, Bookmark, Content } from "./interfaces";

export class Repository {
	db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Extract the depth level from the trailing "-N" suffix of a ContentID.
	 * E.g. "...xhtml#chapter01_4-2" → 2, "...Cover.xhtml-1" → 1
	 * Returns 1 if no suffix is found (treat as top-level).
	 */
	private extractDepthFromContentId(contentId: string): number {
		const match = contentId.match(/-(\d+)$/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return 1;
	}

	/**
	 * Strip the trailing "-N" (digits) suffix from a ContentID.
	 * E.g. "...xhtml#chapter01_4-2" → "...xhtml#chapter01_4"
	 *       "...Cover.xhtml-1"      → "...Cover.xhtml"
	 */
	stripContentIdSuffix(contentId: string): string {
		const match = contentId.match(/^(.+)-(\d+)$/);
		if (match) {
			return match[1];
		}
		return contentId;
	}

	/**
	 * Retrieves all bookmarks with their associated content metadata.
	 * Bookmarks are matched to content entries by stripping the TOC suffix from ContentIDs.
	 * Results are ordered by book title, TOC content ID, and chapter progress.
	 * 
	 * @returns Array of all bookmarks with text content
	 */
	async getAllBookmark(): Promise<Bookmark[]> {
		const res = this.db.exec(
			`SELECT DISTINCT
				b.BookmarkID, 
				b.Text, 
				b.ContentID, 
				b.annotation, 
				b.DateCreated, 
				b.ChapterProgress,
				MIN(CASE WHEN c.ContentType = '899' THEN 0 WHEN c.ContentType = '9' THEN 1 ELSE 2 END) as Priority,
				MAX(c.BookTitle) as BookTitle,
				MAX(CASE WHEN c.ContentType = '899' THEN c.ContentID ELSE NULL END) as TOCContentID
			FROM Bookmark b
			LEFT JOIN (
				SELECT ContentID, 
					CASE 
						WHEN ContentID GLOB '*-[0-9]' THEN SUBSTR(ContentID, 1, LENGTH(ContentID) - 2)
						WHEN ContentID GLOB '*-[0-9][0-9]' THEN SUBSTR(ContentID, 1, LENGTH(ContentID) - 3)
						ELSE ContentID 
					END AS MatchID,
					BookTitle,
					ContentType
				FROM content
			) c ON b.ContentID = c.ContentID OR b.ContentID = c.MatchID
			WHERE b.Text IS NOT NULL
			GROUP BY b.BookmarkID
			ORDER BY BookTitle ASC, COALESCE(TOCContentID, b.ContentID) ASC, b.ChapterProgress ASC;`,
		);
		const bookmarks: Bookmark[] = [];

		if (res[0].values == undefined) {
			console.warn(
				"Bookmarks table returned no results, do you have any annotations created?",
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
                where ContentID = $id
                OR (CASE 
                    WHEN ContentID GLOB '*-[0-9]' THEN SUBSTR(ContentID, 1, LENGTH(ContentID) - 2)
                    WHEN ContentID GLOB '*-[0-9][0-9]' THEN SUBSTR(ContentID, 1, LENGTH(ContentID) - 3)
                    ELSE ContentID 
                END) = $id;`,
			{ $id: contentId },
		);
		const contents = this.parseContentStatement(statement);
		statement.free();

		if (contents.length > 1) {
			console.warn(
				`filtering by contentId yielded more then 1 result: ${contentId}, using the first result with ChapterIDBookmarked.`,
			);
			const preferred = contents.find(
				(c) => c.chapterIdBookmarked != null,
			);
			if (preferred) {
				return preferred;
			}
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

	/**
	 * Retrieves the Table of Contents (TOC) entries for a specific book.
	 * Only fetches ContentType 899 entries which represent the hierarchical TOC structure.
	 * Results are ordered by VolumeIndex to preserve the book's chapter order.
	 * 
	 * @param bookTitle - The title of the book to fetch TOC for
	 * @returns Array of TOC content entries with depth information
	 */
	async getTocByBookTitle(bookTitle: string): Promise<Content[]> {
		const statement = this.db.prepare(
			`select Title, ContentID, ChapterIDBookmarked, BookTitle 
			 from "content" 
			 where BookTitle = $bookTitle 
			 AND ContentType = '899'
			 order by VolumeIndex`,
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

	async getAllBookDetails(): Promise<BookDetails[]> {
		const statement = this.db.prepare(
			`SELECT DISTINCT 
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
            ORDER BY Title ASC;`,
		);

		const books: BookDetails[] = [];

		while (statement.step()) {
			const row = statement.get();
			if (row[0] == null || row[1] == null) {
				continue; // Skip entries without title or author
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
			const contentId = row[1]?.toString() ?? "";
			contents.push({
				title: row[0]?.toString() ?? "",
				contentId: contentId,
				chapterIdBookmarked: row[2]?.toString(),
				bookTitle: row[3]?.toString(),
				depth: this.extractDepthFromContentId(contentId),
			});
		}

		return contents;
	}
}
