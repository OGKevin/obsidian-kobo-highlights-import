import moment from 'moment';
import { BookDetails, Bookmark, Content, Highlight } from "./interfaces";
import { Repository } from "./repository";

type bookTitle = string
type chapter = string
type bookmark = {
    bookmarkId: string
    // This contains the whole block, from START- to END-
    fullContent: string
    // This contains only the content inside START-EXTRACTED and END-EXTRACTED
    highlightContent: string
}

export const typeWhateverYouWantPlaceholder = `%% Here you can type whatever you want, it will not be overwritten by the plugin. %%`

export class HighlightService {
    repo: Repository

    unkonwnBookTitle = 'Unknown Title'
    unknownAuthor = 'Unknown Author'

    constructor(repo: Repository) {
        this.repo = repo
    }

    async getBookDetailsFromBookTitle(title: string): Promise<BookDetails> {
        const details = await this.repo.getBookDetailsByBookTitle(title)
        
        if (details == null) {
            return {
                title: this.unkonwnBookTitle,
                author: this.unknownAuthor
            }
        }

        return details;
    }

    extractExistingHighlight(bookmark: bookmark, existingContent: string): string {
        // Define search terms
        const startSearch = `%%START-${bookmark.bookmarkId}%%`
        const endSearch = `%%END-${bookmark.bookmarkId}%%`
        // Find substring indices
        const start = existingContent.indexOf(startSearch)
        const end = existingContent.indexOf(endSearch) + endSearch.length + 1 // Add length of search term to include it in substring extraction
        // Return the extracted substring
        return this.upateHighlightFromExtractedFile(bookmark, existingContent.substring(start, end))
    }

    upateHighlightFromExtractedFile(bookmark: bookmark, existingContent: string): string {
        const startSearch = `%%START-EXTRACTED-HIGHLIGHT-${bookmark.bookmarkId}%%`
        const endSearch = `%%END-EXTRACTED-HIGHLIGHT-${bookmark.bookmarkId}%%`

        const start = existingContent.indexOf(startSearch) + startSearch.length + 1
        const end = existingContent.indexOf(endSearch) - 1 // Add length of search term to include it in substring extraction

        return existingContent.replace(existingContent.substring(start, end), bookmark.highlightContent)
    }

    fromMapToMarkdown(chapters: Map<chapter, bookmark[]>, existingFileContents?: string): string {
        let markdown = "";
        for (const [chapter, highlights] of chapters) {
            markdown += `## ${chapter.trim()}\n\n`
            markdown += highlights.map((highlight) => {
                if (existingFileContents?.includes(highlight.bookmarkId)) {
                    return this.extractExistingHighlight(highlight, existingFileContents)
                } else {
                    return highlight.fullContent
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
            let text = `%%START-${x.bookmark.bookmarkId}%%\n\n`;
            text += `${typeWhateverYouWantPlaceholder}\n\n`
            text += `%%START-EXTRACTED-HIGHLIGHT-${x.bookmark.bookmarkId}%%\n`

            let higlightContent = ""

            if (includeCallouts) {
                higlightContent += `> [!` + highlightCallout + `]\n`
            }

            higlightContent += `> ${x.bookmark.text}`

            if (x.bookmark.note) {
                higlightContent += `\n`

                if (includeCallouts) {
                    higlightContent += `>> [!` + annotationCallout + `]`
                    higlightContent += `\n> ${x.bookmark.note}`;
                } else {
                    higlightContent += `\n${x.bookmark.note}`;
                }
            }

            if (includeDate) {
                higlightContent += ` — [[${moment(x.bookmark.dateCreated).format(dateFormat)}]]`
            }

            text += higlightContent

            // End annotation marker
            text += `\n%%END-EXTRACTED-HIGHLIGHT-${x.bookmark.bookmarkId}%%\n\n`
            text += `${typeWhateverYouWantPlaceholder}\n\n`
            text += `%%END-${x.bookmark.bookmarkId}%%\n`;

            const existingBook = m.get(x.content.bookTitle)
            const highlight: bookmark = { bookmarkId: x.bookmark.bookmarkId, fullContent: text, highlightContent: higlightContent }
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

    async getAllHighlight(sortByChapterProgress?: boolean): Promise<Highlight[]> {
        const highlights: Highlight[] = []

        const bookmarks = await this.repo.getAllBookmark(sortByChapterProgress)
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

    async getAllBooks(): Promise<Map<string, BookDetails>> {
        const books = await this.repo.getAllBookDetails();
        const bookMap = new Map<string, BookDetails>();
        
        for (const book of books) {
            bookMap.set(book.title, book);
        }
        
        return bookMap;
    }

    async getAllContentByBookTitle(bookTitle: string): Promise<Content[]> {
        return this.repo.getAllContentByBookTitle(bookTitle);
    }

    // Create an empty content map for books without highlights
    createEmptyContentMap(): Map<chapter, bookmark[]> {
        return new Map<chapter, bookmark[]>();
    }
}
