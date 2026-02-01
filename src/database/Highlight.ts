import { BookDetails, Bookmark, ChapterEntry } from "./interfaces";
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

	async getAllBooks(): Promise<Map<string, BookDetails>> {
		const books = await this.repo.getAllBookDetails();
		const bookMap = new Map<string, BookDetails>();

		for (const book of books) {
			bookMap.set(book.title, book);
		}

		return bookMap;
	}

	/**
	 * Build a map of book title → ordered chapter entries with depth-based hierarchy.
	 *
	 * Uses ContentType=899 TOC entries ordered by VolumeIndex.
	 * Matches bookmarks to TOC entries by stripping the trailing "-N" suffix.
	 * Only emits TOC headings that have highlights or are ancestors of highlighted sections.
	 */
	async buildBookHighlightMap(
		bookmarks: Bookmark[],
	): Promise<Map<string, ChapterEntry[]>> {
		const result = new Map<string, ChapterEntry[]>();

		// Group bookmarks by volumeId (book's ContentID)
		const bookmarksByBook = new Map<string, Bookmark[]>();
		for (const bm of bookmarks) {
			const key = bm.volumeId || "";
			const arr = bookmarksByBook.get(key) ?? [];
			arr.push(bm);
			bookmarksByBook.set(key, arr);
		}

		for (const [volumeId, bms] of bookmarksByBook) {
			const bookTitle = volumeId
				? ((await this.repo.getBookTitleByContentId(volumeId)) ??
					this.unknownBookTitle)
				: this.unknownBookTitle;

			const toc = volumeId
				? await this.repo.getTocEntriesByBookId(volumeId)
				: [];

			if (toc.length === 0) {
				// No 899 entries: put all highlights under "Uncategorized"
				result.set(bookTitle, [
					{
						title: "Uncategorized",
						depth: 1,
						highlights: bms,
					},
				]);
				continue;
			}

			// Build matchId → TOC index map
			const matchIndex = new Map<string, number>();
			for (let i = 0; i < toc.length; i++) {
				if (!matchIndex.has(toc[i].matchId)) {
					matchIndex.set(toc[i].matchId, i);
				}
			}

			// Assign highlights to TOC entries
			const assigned = new Map<number, Bookmark[]>();
			const uncategorized: Bookmark[] = [];
			for (const bm of bms) {
				const idx = matchIndex.get(bm.contentId);
				if (idx !== undefined) {
					const arr = assigned.get(idx) ?? [];
					arr.push(bm);
					assigned.set(idx, arr);
				} else {
					uncategorized.push(bm);
				}
			}

			// Determine which headings are needed (ancestors of highlighted sections)
			const headingNeeded = new Set<number>();
			for (const i of assigned.keys()) {
				headingNeeded.add(i);
				// Walk backwards to find and mark ancestor headings
				let needDepth = toc[i].depth;
				for (let j = i - 1; j >= 0; j--) {
					if (toc[j].depth < needDepth) {
						headingNeeded.add(j);
						needDepth = toc[j].depth;
						if (needDepth <= 1) break;
					}
				}
			}

			// Build ordered ChapterEntry array
			const chapters: ChapterEntry[] = [];
			for (let i = 0; i < toc.length; i++) {
				if (!headingNeeded.has(i) || !toc[i].title) continue;
				chapters.push({
					title: toc[i].title,
					depth: toc[i].depth,
					highlights: assigned.get(i) ?? [],
				});
			}

			if (uncategorized.length > 0) {
				chapters.push({
					title: "Uncategorized",
					depth: 1,
					highlights: uncategorized,
				});
			}

			result.set(bookTitle, chapters);
		}

		return result;
	}
}
