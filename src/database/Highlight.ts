import { BookDetails, Bookmark, ChapterEntry, TocEntry } from "./interfaces";
import { Repository } from "./repository";

/**
 * Groups bookmarks by their volumeId (book's ContentID).
 * Bookmarks with empty/missing volumeId are grouped under an empty string key.
 */
export function groupBookmarksByVolume(
	bookmarks: Bookmark[],
): Map<string, Bookmark[]> {
	const grouped = new Map<string, Bookmark[]>();
	for (const bm of bookmarks) {
		const key = bm.volumeId || "";
		const arr = grouped.get(key) ?? [];
		arr.push(bm);
		grouped.set(key, arr);
	}
	return grouped;
}

/**
 * Builds an index mapping TOC entry matchIds to their position in the TOC array.
 * Only the first occurrence of each matchId is recorded.
 */
export function buildTocMatchIndex(toc: TocEntry[]): Map<string, number> {
	const index = new Map<string, number>();
	for (let i = 0; i < toc.length; i++) {
		if (!index.has(toc[i].matchId)) {
			index.set(toc[i].matchId, i);
		}
	}
	return index;
}

/**
 * Result of assigning bookmarks to TOC entries.
 */
export interface BookmarkAssignment {
	/** Map of TOC index → bookmarks assigned to that entry */
	assigned: Map<number, Bookmark[]>;
	/** Bookmarks that couldn't be matched to any TOC entry */
	uncategorized: Bookmark[];
}

/**
 * Assigns bookmarks to TOC entries by matching bookmark contentId to TOC matchId.
 * Unmatched bookmarks are collected in the uncategorized array.
 */
export function assignBookmarksToTocEntries(
	bookmarks: Bookmark[],
	matchIndex: Map<string, number>,
): BookmarkAssignment {
	const assigned = new Map<number, Bookmark[]>();
	const uncategorized: Bookmark[] = [];

	for (const bm of bookmarks) {
		const idx = matchIndex.get(bm.contentId);
		if (idx !== undefined) {
			const arr = assigned.get(idx) ?? [];
			arr.push(bm);
			assigned.set(idx, arr);
		} else {
			uncategorized.push(bm);
		}
	}

	return { assigned, uncategorized };
}

/**
 * Finds all TOC indices that should be included in the output.
 * This includes entries with highlights and their ancestor headings.
 *
 * Walks backwards from each highlighted entry to find parent headings
 * (entries with lower depth values) that provide context.
 */
export function findRequiredHeadings(
	toc: TocEntry[],
	assignedIndices: Set<number>,
): Set<number> {
	const required = new Set<number>();

	for (const i of assignedIndices) {
		required.add(i);

		// Walk backwards to find and mark ancestor headings
		let needDepth = toc[i].depth;
		for (let j = i - 1; j >= 0; j--) {
			if (toc[j].depth < needDepth) {
				required.add(j);
				needDepth = toc[j].depth;
				if (needDepth <= 1) break;
			}
		}
	}

	return required;
}

/**
 * Builds the final ordered array of ChapterEntry objects from TOC entries.
 * Only includes entries that are in the requiredIndices set and have a title.
 * Appends uncategorized bookmarks as a final "Uncategorized" entry if any exist.
 */
export function buildChapterEntries(
	toc: TocEntry[],
	requiredIndices: Set<number>,
	assigned: Map<number, Bookmark[]>,
	uncategorized: Bookmark[],
): ChapterEntry[] {
	const chapters: ChapterEntry[] = [];

	for (let i = 0; i < toc.length; i++) {
		if (!requiredIndices.has(i) || !toc[i].title.trim()) continue;
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

	return chapters;
}

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
	 * Matches bookmarks to TOC entries by comparing bookmark contentId to TOC matchId.
	 * Only emits TOC headings that have highlights or are ancestors of highlighted sections.
	 */
	async buildBookHighlightMap(
		bookmarks: Bookmark[],
	): Promise<Map<string, ChapterEntry[]>> {
		const result = new Map<string, ChapterEntry[]>();
		const bookmarksByBook = groupBookmarksByVolume(bookmarks);

		for (const [volumeId, bms] of bookmarksByBook) {
			const bookTitle = await this.resolveBookTitle(volumeId);
			const chapters = await this.buildChaptersForBook(volumeId, bms);
			result.set(bookTitle, chapters);
		}

		return result;
	}

	/**
	 * Resolves a volumeId to a book title, falling back to unknownBookTitle.
	 */
	private async resolveBookTitle(volumeId: string): Promise<string> {
		if (!volumeId) {
			return this.unknownBookTitle;
		}
		return (
			(await this.repo.getBookTitleByContentId(volumeId)) ??
			this.unknownBookTitle
		);
	}

	/**
	 * Builds chapter entries for a single book's bookmarks.
	 * If no TOC entries exist, returns all bookmarks under "Uncategorized".
	 */
	private async buildChaptersForBook(
		volumeId: string,
		bookmarks: Bookmark[],
	): Promise<ChapterEntry[]> {
		const toc = volumeId
			? await this.repo.getTocEntriesByBookId(volumeId)
			: [];

		if (toc.length === 0) {
			return [
				{
					title: "Uncategorized",
					depth: 1,
					highlights: bookmarks,
				},
			];
		}

		const matchIndex = buildTocMatchIndex(toc);
		const { assigned, uncategorized } = assignBookmarksToTocEntries(
			bookmarks,
			matchIndex,
		);
		const requiredHeadings = findRequiredHeadings(
			toc,
			new Set(assigned.keys()),
		);

		return buildChapterEntries(
			toc,
			requiredHeadings,
			assigned,
			uncategorized,
		);
	}
}
