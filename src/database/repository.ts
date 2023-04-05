import { Database, Statement } from "sql.js";
import { Bookmark, Content } from "./interfaces";

export class Repository {
    db: Database

    constructor(db: Database) {
        this.db = db
    }

    async getAllBookmark(): Promise<Bookmark[]> {
        const res = this.db.exec(`select Text, ContentID, annotation, DateCreated from Bookmark where Text is not null;`)
        const bookmarks: Bookmark[] = []

        res[0].values.forEach(row => {
            if (!(row[0] && row[1] && row[3])) {
                console.warn(
                    "Skipping bookmark with invalid values",
                    row[0],
                    row[1],
                    row[3],
                )

                return
            }

            bookmarks.push({
                text: row[0].toString().replace(/\s+/g, ' ').trim(),
                contentId: row[1].toString(),
                note: row[2]?.toString(),
                dateCreated: new Date(row[3].toString())
            })
        });

        return bookmarks
    }

    async getTotalBookmark(): Promise<number> {
        const res = this.db.exec(`select count(*) from Bookmark where Text is not null;`)

        return +res[0].values[0].toString()
    }

    async getBookmarkById(id: string): Promise<Bookmark | null> {
        const statement = this.db.prepare(
            `select Text, ContentID, annotation, DateCreated from Bookmark where BookmarkID = $id;`,
            {
                $id: id
            }
        )

        if (!statement.step()) {
            return null
        }

        const row = statement.get()

        if (!(row[0] && row[1] && row[3])) {
            throw new Error("Bookmark column returned unexpected null")
        }

        return {
            text: row[0].toString().replace(/\s+/g, ' ').trim(),
            contentId: row[1].toString(),
            note: row[2]?.toString(),
            dateCreated: new Date(row[3].toString())
        }
    }

    async getContentByContentId(contentId: string): Promise<Content | null> {
        const statement = this.db.prepare(
            `select 
                Title, ContentID, ChapterIDBookmarked, BookTitle from content
                where ContentID = $id;`,
            { $id: contentId },
        )
        const contents = this.parseContentStatement(statement)
        statement.free()

        if (contents.length > 1) {
            throw new Error("filtering by contentId yielded more then 1 result")
        }

        return contents.pop() || null
    }

    async getContentLikeContentId(contentId: string): Promise<Content | null> {
        const statement = this.db.prepare(
            `select 
                Title, ContentID, ChapterIDBookmarked, BookTitle from content
                where ContentID like $id;`,
            { $id: `${contentId}%` },
        )
        const contents = this.parseContentStatement(statement)
        statement.free()

        if (contents.length > 1) {
            console.warn(`filtering by contentId yielded more then 1 result: ${contentId}, using the first result.`)
        }

        return contents.shift() || null
    }

    async getFirstContentLikeContentIdWithBookmarkIdNotNull(contentId: string) {
        const statement = this.db.prepare(
            `select 
                Title, ContentID, ChapterIDBookmarked, BookTitle from "content" 
                where "ContentID" like $id and "ChapterIDBookmarked" not NULL limit 1`,
            { $id: `${contentId}%` },
        )
        const contents = this.parseContentStatement(statement)
        statement.free()

        return contents.pop() || null
    }

    async getAllContent(limit = 100): Promise<Content[]> {
        const statement = this.db.prepare(
            `select Title, ContentID, ChapterIDBookmarked, BookTitle from content limit $limit`,
            { $limit: limit },
        )

        const contents = this.parseContentStatement(statement)
        statement.free()

        return contents
    }

    async getAllContentByBookTitle(bookTitle: string): Promise<Content[]> {
        const statement = this.db.prepare(
            `select Title, ContentID, ChapterIDBookmarked, BookTitle  from "content" where BookTitle = $bookTitle`,
            { $bookTitle: bookTitle },
        )

        const contents = this.parseContentStatement(statement)
        statement.free()

        return contents
    }

    async getAllContentByBookTitleOrderedByContentId(bookTitle: string): Promise<Content[]> {
        const statement = this.db.prepare(
            `select Title, ContentID, ChapterIDBookmarked, BookTitle  from "content" where BookTitle = $bookTitle order by "ContentID"`,
            { $bookTitle: bookTitle },
        )

        const contents = this.parseContentStatement(statement)
        statement.free()

        return contents
    }

    private parseContentStatement(statement: Statement): Content[] {
        const contents: Content[] = []

        while (statement.step()) {
            const row = statement.get();
            contents.push({
                title: row[0]?.toString() ?? "",
                contentId: row[1]?.toString() ?? "",
                chapterIdBookmarked: row[2]?.toString(),
                bookTitle: row[3]?.toString()
            })
        }

        return contents
    }
}