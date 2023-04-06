import moment from 'moment';
import { Bookmark, Content, Highlight } from "./interfaces";
import { Repository } from "./repository";

type bookTitle = string
type chapter = string
type bookmark = {
    bookmarkId: string
    content: string
}

export class HighlightService {
    repo: Repository

    constructor(repo: Repository) {
        this.repo = repo
    }

    extractExistingHighlight(bookmarkId: string, existingFile: string): string {
        // Define search terms
        const startSearch = `%%START-${bookmarkId}%%`
        const endSearch = `%%END-${bookmarkId}%%`
        // Find substring indices
        const start = existingFile.indexOf(startSearch)
        const end = existingFile.indexOf(endSearch) + endSearch.length + 1 // Add length of search term to include it in substring extraction
        // Return the extracted substring
        return existingFile.substring(start, end)
    }

    fromMapToMarkdown(chapters: Map<chapter, bookmark[]>, existingFile?: string): string {
        let markdown = "";
        for (const [chapter, highlights] of chapters) {
            markdown += `## ${chapter.trim()}\n\n`
            markdown += highlights.map((highlight) => {
                if (existingFile?.includes(highlight.bookmarkId)) {
                    return this.extractExistingHighlight(highlight.bookmarkId, existingFile)
                } else {
                    return highlight.content
                }
            }).join('\n\n').trim()
            markdown += `\n\n`
        }

        return markdown.trim()
    }

    convertToMap(
        arr: Highlight[],
        includeDate: boolean,
        dateFormat: string,
        includeCallouts: boolean,
        highlightCallout: string,
        annotationCallout: string,
    ): Map<bookTitle, Map<chapter, bookmark[]>> {
        const m = new Map<string, Map<string, bookmark[]>>()

        arr.forEach(x => {
            if (!x.content.bookTitle) {
                throw new Error("bookTitle must be set")
            }
            
            // Start annotation marker
            let text = `%%START-${x.bookmark.bookmarkId}%%\n`;

            if (includeCallouts) {
                text += `> [!` + highlightCallout + `]\n`
            }
            
            text += `> ${x.bookmark.text}`

			if (x.bookmark.note) {
				text += `\n`

				if (includeCallouts) {
					text += `>> [!` + annotationCallout + `]`
					text += `\n> ${x.bookmark.note}`;
				} else {
					text += `\n${x.bookmark.note}`;
				}
			}

            if (includeDate) {
                text += ` — [[${moment(x.bookmark.dateCreated).format(dateFormat)}]]`
            }
            // End annotation marker
            text += `\n\n%%END-${x.bookmark.bookmarkId}%%\n`;

            const existingBook = m.get(x.content.bookTitle)
            const highlight: bookmark = {bookmarkId: x.bookmark.bookmarkId, content: text}
            if (existingBook) {
                const existingChapter = existingBook.get(x.content.title)

                if (existingChapter) {
                    existingChapter.push(highlight)
                } else {
                    existingBook.set(x.content.title, [highlight])
                }
            } else {
                m.set(x.content.bookTitle, new Map<string, bookmark[]>().set(x.content.title, [highlight]))
            }
        })

        return m
    }

    async getAllHighlight(): Promise<Highlight[]> {
        const highlights: Highlight[] = []

        const bookmarks = await this.repo.getAllBookmark()
        for (const bookmark of bookmarks) {
            highlights.push(await this.createHighlightFromBookmark(bookmark))
        }

        return highlights.sort(function (a, b): number {
            if (!a.content.bookTitle || !b.content.bookTitle) {
                throw new Error("bookTitle must be set");
            }

            return a.content.bookTitle.localeCompare(b.content.bookTitle) ||
                a.content.contentId.localeCompare(b.content.contentId);
        })
    }

    async createHighlightFromBookmark(bookmark: Bookmark): Promise<Highlight> {
        let content = await this.repo.getContentByContentId(bookmark.contentId)

        if (content == null) {
            content = await this.repo.getContentLikeContentId(bookmark.contentId)
            if (content == null) {
                throw Error(`bookmark seems to link to a non existing content: ${bookmark.contentId}`)
            }
        }

        if (content.chapterIdBookmarked == null) {
            return {
                bookmark: bookmark,
                content: await this.findRightContentForBookmark(bookmark, content)
            }
        }

        return {
            bookmark: bookmark,
            content: content
        }
    }

    private async findRightContentForBookmark(bookmark: Bookmark, originalContent: Content): Promise<Content> {
        if (!originalContent.bookTitle) {
            throw new Error("bookTitle field must be set")
        }

        const contents = await this.repo.getAllContentByBookTitleOrderedByContentId(originalContent.bookTitle)
        const potential = await this.repo.getFirstContentLikeContentIdWithBookmarkIdNotNull(originalContent.contentId)
        if (potential) {
            return potential
        }

        let foundContent: Content | null = null

        for (const c of contents) {
            if (c.chapterIdBookmarked) {
                foundContent = c
            }

            if (c.contentId === bookmark.contentId && foundContent) {
                return foundContent
            }
        }

        if (foundContent) {
            console.warn(`was not able to find chapterIdBookmarked for book ${originalContent.bookTitle}`)
        }

        return originalContent
    }
}
