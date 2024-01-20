import * as chai from 'chai';
import { readFileSync } from 'fs';
import SqlJs, { Database } from 'sql.js';
import { binary } from '../binaries/sql-wasm';
import { Repository } from './repository';

describe('Repository', async function () {
    let db: Database
    let repo: Repository

    before(async function () {
        const SQLEngine = await SqlJs({
            wasmBinary: binary
        })

        db = new SQLEngine.Database(readFileSync("KoboReader.sqlite"))
        repo = new Repository(db);
    })

    after(function () {
        db.close()
    })

    it('getAllBookmark', async function () {
        chai.expect(await repo.getAllBookmark()).length.above(0)
    });
    it('getBookmarkById null', async function () {
        chai.expect(await repo.getBookmarkById("")).is.null
    });
    it('getBookmarkById not null', async function () {
        chai.expect(await repo.getBookmarkById("e7f8f92d-38ca-4556-bab8-a4d902e9c430")).is.not.null
    });
    it('getAllContent', async function () {
        chai.expect(await repo.getAllContent()).length.above(0)
    });
    it('getContentByContentId', async function () {
        const content = await repo.getAllContent(1)
        chai.expect(await repo.getContentByContentId(content.pop()?.contentId ?? "")).not.null
    });
    it('getContentByContentId no results', async function () {
        chai.expect(await repo.getContentByContentId("")).null
    });
    it('getAllContentByBookTitle', async function () {
        const contents = await repo.getAllContent()
        const titles: string[] = []
        contents.forEach(c => {
            if (c.bookTitle != null) {
                titles.push(c.bookTitle)
            }
        });
        chai.expect(await repo.getAllContentByBookTitle(titles.at(Math.floor(Math.random() * titles.length)) ?? "")).length.above(0)
    });
    it('getBookDetailsOnePunchMan', async function () {
        const details = await repo.getBookDetailsByBookTitle("One-Punch Man, Vol. 2")

        chai.expect(details).not.null
        chai.expect(details?.title).is.eq("One-Punch Man, Vol. 2")
        chai.expect(details?.author).is.eq("ONE")
        chai.expect(details?.description).not.null
        chai.expect(details?.publisher).is.eq("VIZ Media LLC")
        chai.expect(details?.dateLastRead).not.null
        chai.expect(details?.readStatus).is.eq(2)
        chai.expect(details?.percentRead).is.eq(100)
        chai.expect(details?.isbn).is.eq("9781421585659")
        chai.expect(details?.seriesNumber).is.eq(2)
        chai.expect(details?.series).is.eq("One-Punch man")
        chai.expect(details?.timeSpentReading).is.eq(780)
    });
    it('getAllBookDetailsByBookTitle', async function () {
        const bookmarks = await repo.getAllBookmark()
        let titles: string[] = []

        bookmarks.forEach(async b => {
            let content = await this.repo.getContentByContentId(b.contentId)

            if (content == null) {
                content = await this.repo.getContentLikeContentId(b.contentId)
            }

            titles.push(content.title)
        })

        titles = titles.filter((v, i, a) => a.indexOf(v) === i)

        titles.forEach(async t => {
            const details = await repo.getBookDetailsByBookTitle(t)

            chai.expect(details).not.null;
        })
    });
});
