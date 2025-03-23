import * as chai from 'chai';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { HighlightService, typeWhateverYouWantPlaceholder } from './Highlight';
import { Bookmark, Content, Highlight } from './interfaces';
import { Repository } from './repository';

describe('HighlightService', async function () {

    describe('Sample Content', async function () {

        let service: HighlightService

        before(async function () {
            const repo = <Repository>{}
            repo.getContentByContentId = () => Promise.resolve({
                bookmarkId: "c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe",
                title: "Chapter Eight: Holden",
                contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                bookTitle: "Nemesis Games",
                chapterIdBookmarked: "true"
            })
            service = new HighlightService(repo)
        })

        describe('Sample Bookmark with no annotation', async function () {

            let highlight: Highlight
            let dateCreatedText: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmark: Bookmark = {
                    bookmarkId: "c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe",
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    note: '',
                    dateCreated
                }
                highlight = await service.createHighlightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
            })

            it('fromMaptoMarkdown with date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown without date', async function () {
                const map = service
                    .convertToMap([highlight], false, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?”
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!quote]
> “I guess I can’t be. How do you prove a negative?”
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!quote]
> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with custom callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'bug', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!bug]
> “I guess I can’t be. How do you prove a negative?”
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with custom callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'bug', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!bug]
> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })
        })

        describe('Sample Bookmark with annotation', async function () {

            let highlight: Highlight
            let dateCreatedText: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmark: Bookmark = {
                    bookmarkId: "c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe",
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    note: 'This is a great note!',
                    dateCreated
                }
                highlight = await service.createHighlightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
            })

            it('fromMaptoMarkdown with date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?”

This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown without date', async function () {
                const map = service
                    .convertToMap([highlight], false, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?”

This is a great note!
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!note]
> This is a great note!
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'quote', 'note')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!note]
> This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with custom callouts', async function () {
                const map = service
                    .convertToMap([highlight], false, "", true, 'quote', 'bug')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!bug]
> This is a great note!
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })

            it('fromMaptoMarkdown with custom callouts and date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", true, 'quote', 'bug')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> [!quote]
> “I guess I can’t be. How do you prove a negative?”
>> [!bug]
> This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })
        })

        describe('Sample Bookmark with annotation, with existing highlights and added notes', async function () {
            let highlight: Highlight
            let dateCreatedText: string
            let existingFile: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmark: Bookmark = {
                    bookmarkId: "c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe",
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    note: 'This is a great note!',
                    dateCreated
                }
                highlight = await service.createHighlightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
                existingFile = `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?”

This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

This is an exising note, added to the highlight.

^325d95

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
            })

            it('fromMaptoMarkdown with existing file', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map, existingFile)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?”

This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

This is an exising note, added to the highlight.

^325d95

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })
        })

        describe('Sample Bookmark with annotation, with outdated existing highlights and added notes', async function () {
            let highlight: Highlight
            let dateCreatedText: string
            let existingFile: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmark: Bookmark = {
                    bookmarkId: "c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe",
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    note: 'This is a great note!',
                    dateCreated
                }
                highlight = await service.createHighlightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
                existingFile = `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be.”

This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

This is an exising note, added to the highlight.

^325d95

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
            })

            it('fromMaptoMarkdown with existing file', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map, existingFile)
                chai.assert.deepEqual(
                    markdown, `## Chapter Eight: Holden

%%START-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%
> “I guess I can’t be. How do you prove a negative?”

This is a great note! — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%

This is an exising note, added to the highlight.

^325d95

%%END-c5b2637d-ddaf-4f15-9a81-dd701e0ad8fe%%`
                )
            })
        })
    })

    describe('Sample Content Missing', async function () {

        let service: HighlightService

        before(async function () {
            const repo = <Repository>{}
            repo.getContentByContentId = () => Promise.resolve(null);
            repo.getContentLikeContentId = () => Promise.resolve(null);
            service = new HighlightService(repo)
        })
        describe('Sample Bookmark linked to missing content', async function () {

            let highlight: Highlight
            let dateCreatedText: string

            before(async function () {
                const dateCreated = new Date(Date.UTC(2022, 7, 5, 20, 46, 41, 0))
                const bookmarkID = uuidv4()
                const bookmark: Bookmark = {
                    bookmarkId: bookmarkID,
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "missing-content-id",
                    note: '',
                    dateCreated
                }
                highlight = await service.createHighlightFromBookmark(bookmark)
                dateCreatedText = moment(dateCreated).format("")
            })

            it('fromMaptoMarkdown with date', async function () {
                const map = service
                    .convertToMap([highlight], true, "", false, '[!quote]', '[!note]')
                    .get(highlight.content.bookTitle ?? "")

                if (!map) {
                    chai.assert.isNotNull(map)
                    return
                }

                const markdown = service.fromMapToMarkdown(map)
                chai.assert.deepEqual(
                    markdown, `## Unknown Title

%%START-` + highlight.bookmark.bookmarkId + `%%

${typeWhateverYouWantPlaceholder}

%%START-EXTRACTED-HIGHLIGHT-${highlight.bookmark.bookmarkId}%%
> “I guess I can’t be. How do you prove a negative?” — [[` + dateCreatedText + `]]
%%END-EXTRACTED-HIGHLIGHT-${highlight.bookmark.bookmarkId}%%

${typeWhateverYouWantPlaceholder}

%%END-` + highlight.bookmark.bookmarkId + `%%`
                )
            })
        })
    })

    describe('with multiple content', async function () {

        const contentMap = new Map<string, Content>([
            [
                "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
                {
                    title: "Chapter Eight: Holden",
                    contentId: "file:///mnt/onboard/Corey, James S.A_/Nemesis Games - James S.A. Corey.epub#(12)OEBPS/Text/ch09.html",
                    bookTitle: "Nemesis Games",
                    chapterIdBookmarked: "e7f8f92d-38ca-4556-bab8-a4d902e9c430!Text/chapter002.xhtml"
                }
            ],
            [
                "d40c9071-993f-4f1f-ae53-594847d9fd27",
                {
                    title: "On Passwords and Power Drills",
                    contentId: "/mnt/onboard/Adkins, Heather & Beyer, Betsy & Blankiotr & Oprea, Ana & Stubblefield, Adam/Building Secure and Reliable Systems_ Best PractiLewandowski & Ana Oprea & Adam Stubblefield.kepub.epub!!OEBPS/ch01.html#on_passwords_and_power_drills-2",
                    bookTitle: "Building Secure and Reliable Systems: Best Practices for Designing, Implementing, and Maintaining Systems",
                    chapterIdBookmarked: "/mnt/onboard/Adkins, Heather & Beyer, Betsy & Blankiotr & Oprea, Ana & Stubblefield, Adam/Building Secure and Reliable Systems_ Best PractiLewandowski & Ana Oprea & Adam Stubblefield.kepub.epub!!OEBPS/ch01.html"
                }
            ],
            [
                "3408844d-65a6-4d23-9d99-8f189ca07d0b",
                {
                    title: "Dune",
                    contentId: "23ba3dcf-3543-476c-984b-2f746c859763!OEBPS!Text/chapter001.xhtml-1",
                    bookTitle: "Dune",
                    chapterIdBookmarked: "23ba3dcf-3543-476c-984b-2f746c859763!OEBPS!Text/chapter001.xhtml"
                }
            ],
            [
                "c0d92aca-e4bb-476a-8131-ee0c0c21ced5",
                {
                    title: "11. Being On-Call",
                    contentId: "bce81485-5e92-4cca-8965-613c3ca12737!OEBPS!ch11.html#chapter_oncall-engineer-1",
                    bookTitle: "Site Reliability Engineering",
                    chapterIdBookmarked: "bce81485-5e92-4cca-8965-613c3ca12737!OEBPS!ch11.html"
                }
            ]
        ])

        const bookmarkMap = new Map<string, Bookmark>([
            [
                "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
                <Bookmark>{
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "e7f8f92d-38ca-4556-bab8-a4d902e9c430",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
            [
                "d40c9071-993f-4f1f-ae53-594847d9fd27",
                <Bookmark>{
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "d40c9071-993f-4f1f-ae53-594847d9fd27",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
            [
                "3408844d-65a6-4d23-9d99-8f189ca07d0b",
                <Bookmark>{
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "3408844d-65a6-4d23-9d99-8f189ca07d0b",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
            [
                "c0d92aca-e4bb-476a-8131-ee0c0c21ced5",
                <Bookmark>{
                    text: "“I guess I can’t be. How do you prove a negative?”",
                    contentId: "c0d92aca-e4bb-476a-8131-ee0c0c21ced5",
                    note: '',
                    dateCreated: new Date('2022-08-05T20:46:41+00:00')
                }
            ],
        ])

        let repo: Repository
        let service: HighlightService

        before(async function () {
            repo = <Repository>{}
            repo.getContentByContentId = (contentId) => Promise.resolve(contentMap.get(contentId) ?? null)
            repo.getTotalBookmark = () => Promise.resolve(contentMap.size);
            const bookmarks = new Array<Bookmark>()
            bookmarkMap.forEach(entry => bookmarks.push(entry))
            repo.getAllBookmark = () => Promise.resolve(bookmarks);
            repo.getBookmarkById = (bookmarkId) => Promise.resolve(bookmarkMap.get(bookmarkId) ?? null)
            service = new HighlightService(repo)
        })

        it('getAllHighlight', async function () {
            const all = await service.getAllHighlight()
            const total = await repo.getTotalBookmark()
            chai.expect(all).length(total)
        })

        for (const [id, content] of contentMap) {
            it(`createHighlightFromBookmark ${id}`, async function () {
                const bookmark = await repo.getBookmarkById(id)
                if (!bookmark) {
                    chai.assert.isNotNull(bookmark)
                    return
                }

                const highlight = await service.createHighlightFromBookmark(bookmark)
                chai.assert.deepEqual(highlight, {
                    content: content,
                    bookmark: bookmark
                })
            })
        }
    })

    describe('Import All Books', async function () {
        let service: HighlightService
        let repo: Repository
        const bookDetails = [
            {
                title: "Book with Highlights",
                author: "Author 1",
                description: "Description 1",
                publisher: "Publisher 1",
                dateLastRead: new Date("2024-01-01"),
                readStatus: 2,
                percentRead: 100,
                isbn: "1234567890",
                series: "Series 1",
                seriesNumber: 1,
                timeSpentReading: 1000
            },
            {
                title: "Book without Highlights",
                author: "Author 2",
                description: "Description 2",
                publisher: "Publisher 2",
                dateLastRead: new Date("2024-01-02"),
                readStatus: 1,
                percentRead: 50,
                isbn: "0987654321",
                series: "Series 2",
                seriesNumber: 2,
                timeSpentReading: 500
            }
        ];

        before(async function () {
            repo = <Repository>{};
            
            repo.getAllBookDetails = () => Promise.resolve(bookDetails);
            repo.getBookDetailsByBookTitle = (title) => {
                const details = bookDetails.find(book => book.title === title);
                return Promise.resolve(details || null);
            };
            repo.getAllBookmark = () => Promise.resolve([{
                bookmarkId: "bookmark1",
                text: "Sample highlight",
                contentId: "content1",
                note: "Test note",
                dateCreated: new Date("2024-01-01")
            }]);
            repo.getContentByContentId = () => Promise.resolve({
                title: "Chapter 1",
                contentId: "content1",
                bookTitle: "Book with Highlights",
                chapterIdBookmarked: "chapter1"
            });

            service = new HighlightService(repo);
        });

        it('getAllBooks should return all books with correct details', async function () {
            const books = await service.getAllBooks();
            chai.expect(books.size).to.equal(2);
            
            const bookWithHighlights = books.get("Book with Highlights");
            const bookWithoutHighlights = books.get("Book without Highlights");
            
            chai.expect(bookWithHighlights).to.not.be.undefined;
            chai.expect(bookWithoutHighlights).to.not.be.undefined;
            
            chai.expect(bookWithHighlights?.author).to.equal("Author 1");
            chai.expect(bookWithHighlights?.percentRead).to.equal(100);
            chai.expect(bookWithoutHighlights?.author).to.equal("Author 2");
            chai.expect(bookWithoutHighlights?.percentRead).to.equal(50);
        });

        it('convertToMap should handle books with and without highlights correctly', async function () {
            const highlights = await service.getAllHighlight();
            const contentMap = service.convertToMap(highlights, false, "", false, "quote", "note");
            
            // Verify initial state with only books containing highlights
            chai.expect(contentMap.size).to.equal(1);
            chai.expect(contentMap.has("Book with Highlights")).to.be.true;
            chai.expect(contentMap.has("Book without Highlights")).to.be.false;

            // Add books without highlights
            const allBooks = await service.getAllBooks();
            for (const [bookTitle, bookDetails] of allBooks) {
                if (!contentMap.has(bookTitle)) {
                    contentMap.set(bookTitle, service.createEmptyContentMap());
                }
            }

            // Verify final state with all books
            chai.expect(contentMap.size).to.equal(2);
            
            const bookWithHighlights = contentMap.get("Book with Highlights");
            const bookWithoutHighlights = contentMap.get("Book without Highlights");
            
            chai.expect(bookWithHighlights).to.not.be.undefined;
            chai.expect(bookWithoutHighlights).to.not.be.undefined;
            chai.expect(bookWithoutHighlights?.size).to.equal(0);
        });

        it('getBookDetailsFromBookTitle should return correct book details', async function () {
            const details1 = await service.getBookDetailsFromBookTitle("Book with Highlights");
            chai.expect(details1).to.deep.include({
                title: "Book with Highlights",
                author: "Author 1",
                description: "Description 1",
                percentRead: 100,
                isbn: "1234567890"
            });

            const details2 = await service.getBookDetailsFromBookTitle("Book without Highlights");
            chai.expect(details2).to.deep.include({
                title: "Book without Highlights",
                author: "Author 2",
                description: "Description 2",
                percentRead: 50,
                isbn: "0987654321"
            });

            const nonExistentBook = await service.getBookDetailsFromBookTitle("Non-existent Book");
            chai.expect(nonExistentBook).to.be.null;
        });
    });
});
