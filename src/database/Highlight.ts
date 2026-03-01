import { BookDetails, Bookmark, Content, Highlight, ChapterWithHighlights } from "./interfaces";
import { Repository } from "./repository";

export class HighlightService {
	repo: Repository;
	unknownBookTitle = "Unknown Title";
	unknownAuthor = "Unknown Author";

	constructor(repo: Repository) {
		this.repo = repo;
	}

	async getBookDetailsFromBookTitle(title: string): Promise<BookDetails> {
		const details = await this.repo.getBookDetailsByBookTitle(title);

		if (details == null) {
			return {
				title: this.unknownBookTitle,
				author: this.unknownAuthor,
			};
		}

		return details;
	}

	async getAllHighlight(): Promise<Highlight[]> {
		const highlights: Highlight[] = [];

		const bookmarks = await this.repo.getAllBookmark();
		for (const bookmark of bookmarks) {
			highlights.push(await this.createHighlightFromBookmark(bookmark));
		}

		return highlights;
	}

	async createHighlightFromBookmark(bookmark: Bookmark): Promise<Highlight> {
		let content = await this.repo.getContentByContentId(bookmark.contentId);

		if (content == null) {
			content = await this.repo.getContentLikeContentId(
				bookmark.contentId,
			);
			if (content == null) {
				console.warn(
					`bookmark seems to link to a non existing content: ${bookmark.contentId}`,
				);
				return {
					bookmark: bookmark,
					content: {
						title: this.unknownBookTitle,
						contentId: bookmark.contentId,
						chapterIdBookmarked: "false",
						bookTitle: this.unknownBookTitle,
					},
				};
			}
		}

		if (content.chapterIdBookmarked == null) {
			return {
				bookmark: bookmark,
				content: await this.findRightContentForBookmark(
					bookmark,
					content,
				),
			};
		}

		return {
			bookmark: bookmark,
			content: content,
		};
	}

	private async findRightContentForBookmark(
		bookmark: Bookmark,
		originalContent: Content,
	): Promise<Content> {
		if (!originalContent.bookTitle) {
			throw new Error("bookTitle field must be set");
		}

		const contents =
			await this.repo.getAllContentByBookTitleOrderedByContentId(
				originalContent.bookTitle,
			);
		const potential =
			await this.repo.getFirstContentLikeContentIdWithBookmarkIdNotNull(
				originalContent.contentId,
			);
		if (potential) {
			return potential;
		}

		let foundContent: Content | null = null;

		for (const c of contents) {
			if (c.chapterIdBookmarked) {
				foundContent = c;
			}

			if (c.contentId === bookmark.contentId && foundContent) {
				return foundContent;
			}
		}

		if (foundContent) {
			console.warn(
				`was not able to find chapterIdBookmarked for book ${originalContent.bookTitle}`,
			);
		}

		return originalContent;
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

	/**
	 * Builds a hierarchical chapter structure for a book by matching highlights to TOC entries.
	 * The structure preserves the book's table of contents order and depth levels.
	 * Only chapters with highlights are included in the result.
	 * 
	 * @param bookTitle - The title of the book to build hierarchy for
	 * @param highlights - All highlights, will be filtered to match this book
	 * @returns Array of chapters with their hierarchical depth and associated highlights
	 */
	async buildHierarchicalChapters(bookTitle: string, highlights: Highlight[]): Promise<ChapterWithHighlights[]> {
		const toc = await this.repo.getTocByBookTitle(bookTitle);
		const result: ChapterWithHighlights[] = [];
		
		const tocMap = new Map<string, Content>();
		for (const entry of toc) {
			const strippedId = this.repo.stripContentIdSuffix(entry.contentId);
			tocMap.set(strippedId, entry);
		}

		const highlightsByToc = new Map<string, Bookmark[]>();
		for (const highlight of highlights) {
			if (highlight.content.bookTitle !== bookTitle) {
				continue;
			}
			
			const strippedContentId = this.repo.stripContentIdSuffix(highlight.bookmark.contentId);
			const tocEntry = tocMap.get(strippedContentId);
			
			if (tocEntry) {
				const key = tocEntry.contentId;
				if (!highlightsByToc.has(key)) {
					highlightsByToc.set(key, []);
				}
				highlightsByToc.get(key)?.push(highlight.bookmark);
			}
		}

		for (const tocEntry of toc) {
			const highlights = highlightsByToc.get(tocEntry.contentId) || [];
			if (highlights.length > 0) {
				result.push({
					title: tocEntry.title,
					depth: tocEntry.depth || 1,
					highlights: highlights,
				});
			}
		}

		return result;
	}
}
