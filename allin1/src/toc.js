load("config.js");

function stvFetchChapterListOnBase(base, book) {
    var path = "/index.php?ngmar=chapterlist"
        + "&h=" + stvEncode(book.host)
        + "&bookid=" + stvEncode(book.id)
        + "&sajax=getchapterlist";

    var referer = stvBuildBookUrl(base, book.host, book.id, 1);
    var url = stvBuildUrl(base, path);
    function requestList() {
        var cookie = stvBuildCookie("mac_tt=true", base);
        var requestHeaders = {
            "Referer": referer
        };
        if (cookie) requestHeaders["Cookie"] = cookie;

        return stvFetchJson(url, {
            method: "GET",
            headers: stvHeaders(requestHeaders)
        });
    }

    var response = requestList();
    if ((!response.ok || !response.json) && stvIsCloudflareBlockedResponse(response)) {
        var synced = stvSyncCloudflareCookie(base, referer);
        if (synced) {
            response = requestList();
        }
    }

    if (!response.ok || !response.json || response.json.code !== 1 || !response.json.data) {
        return null;
    }

    return {
        base: base,
        json: response.json,
        chapters: stvParseChapterList(response.json.data)
    };
}

function execute(url) {
    var book = stvParseBookUrl(url);
    if (!book || !book.host || !book.id) {
        return Response.error("Không phân tích được URL mục lục STV.");
    }
    var bookStatus = stvTrim(book.status || "1");

    var bases = stvGetBaseCandidates(book.base);
    var loaded = null;

    for (var i = 0; i < bases.length; i++) {
        loaded = stvFetchChapterListOnBase(bases[i], book);
        if (loaded && loaded.chapters && loaded.chapters.length > 0) {
            STV_STATE.lastBase = bases[i];
            break;
        }
    }

    if (!loaded || !loaded.chapters || loaded.chapters.length === 0) {
        return Response.error("Không tải được danh sách chương từ STV.");
    }

    var out = [];
    var seenCid = {};
    for (var j = 0; j < loaded.chapters.length; j++) {
        var chapter = loaded.chapters[j];
        var cid = stvTrim(chapter.cid);
        if (!cid || seenCid[cid]) {
            continue;
        }
        seenCid[cid] = true;

        var title = chapter.title;

        if (chapter.vip && !chapter.unvip) {
            title = "[VIP] " + title;
        }

        out.push({
            name: title,
            url: stvBuildPublicChapterUrl(book.host, book.id, cid, bookStatus)
        });
    }

    return Response.success(out);
}
