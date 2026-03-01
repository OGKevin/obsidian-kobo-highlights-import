/* eslint-disable no-unused-vars */
export interface Bookmark {
	bookmarkId: string;
	text: string;
	contentId: string;
	volumeId: string;
	note?: string;
	dateCreated: Date;
}

export interface TocEntry {
	title: string;
	/** ContentID with trailing "-N" stripped, used for matching bookmarks */
	matchId: string;
	/** Original ContentID from the 899 row */
	contentId: string;
	/** Depth level extracted from trailing "-N" suffix (1=top, 2=part, 3=section...) */
	depth: number;
	/** VolumeIndex from DB, preserves TOC ordering */
	volumeIndex: number;
}

export interface ChapterEntry {
	title: string;
	depth: number;
	highlights: Bookmark[];
}

export interface Content {
	title: string;
	contentId: string;
	chapterIdBookmarked?: string;
	bookTitle?: string;
}

export interface BookDetails {
	title: string;
	author: string;
	description?: string;
	publisher?: string;
	dateLastRead?: Date;
	readStatus?: ReadStatus;
	percentRead?: number;
	isbn?: string;
	series?: string;
	seriesNumber?: number;
	timeSpentReading?: number;
}

export enum ReadStatus {
	Unknown = -1,
	Unopened = 0,
	Reading = 1,
	Read = 2,
}
