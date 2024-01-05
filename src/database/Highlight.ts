import moment from 'moment';
import { Bookmark, Content, Highlight } from "./interfaces";
import { Repository } from "./repository";

type bookTitle = string
type chapter = string
type highlight = string

export class HighlightService {
    repo: Repository

    unkonwnBookTitle = 'Unknown Title'

    constructor(repo: Repository) {
        this.repo = repo
    }

    fromMapToMarkdown(chapters: Map<chapter, highlight[]>): string {
        let markdown = "";
        for (const [chapter, highlights] of chapters) {
            markdown += `## ${chapter.trim()}\n\n`
            markdown += highlights.join('\n\n').trim()
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
    ): Map<bookTitle, Map<chapter, highlight[]>> {
        const m = new Map<string, Map<string, string[]>>()

        arr.forEach(x => {
            if (!x.content.bookTitle) {
                throw new Error("bookTitle must be set")
            }

            let text = ``;

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

            const existingBook = m.get(x.content.bookTitle)

            if (existingBook) {
                const existingChapter = existingBook.get(x.content.title)

                if (existingChapter) {
                    existingChapter.push(text)
                } else {
                    existingBook.set(x.content.title, [text])
                }
            } else {
                m.set(x.content.bookTitle, new Map<string, string[]>().set(x.content.title, [text]))
            }
        })

        return m
    }

    async getAllHighlight(): Promise<Highlight[]> {
        const highlights: Highlight[] = []

        const bookmarks = await this.repo.getAllBookmark()
        for (const bookmark of bookmarks) {
            highlights.push(await this.createHilightFromBookmark(bookmark))
        }

        return highlights.sort(function (a, b): number {
            if (!a.content.bookTitle || !b.content.bookTitle) {
                throw new Error("bookTitle must be set");
            }

            return a.content.bookTitle.localeCompare(b.content.bookTitle) ||
                a.content.contentId.localeCompare(b.content.contentId);
        })
    }

    async createHilightFromBookmark(bookmark: Bookmark): Promise<Highlight> {
        let content = await this.repo.getContentByContentId(bookmark.contentId)

        if (content == null) {
            content = await this.repo.getContentLikeContentId(bookmark.contentId)
            if (content == null) {
                console.warn(`bookmark seems to link to a non existing content: ${bookmark.contentId}`)
                return {
                    bookmark: bookmark,
                    content: {
                        title: this.unkonwnBookTitle,
                        contentId: bookmark.contentId,
                        chapterIdBookmarked: 'false',
                        bookTitle: this.unkonwnBookTitle,
                    }
                }
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
