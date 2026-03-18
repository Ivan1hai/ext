load("config.js");

function extractStorySlug(storyUrl) {
    let normalized = normalizeUrl(storyUrl);
    let matched = normalized.match(/\/truyen\/([^\/?#]+)/i);
    if (matched && matched[1]) return matched[1].toLowerCase();

    let path = normalized.replace(/^https?:\/\/[^\/]+/i, "");
    let parts = path.split("/").filter(x => x);
    if (parts.length > 0) return parts[0].toLowerCase();

    return "";
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isChapterUrl(url, storySlug) {
    if (!url || !storySlug) return false;
    let pure = removeQueryAndHash(normalizeUrl(url));
    if (pure.indexOf("/truyen/") > -1) return false;

    let pattern = new RegExp("^https?://[^/]+/" + escapeRegex(storySlug) + "/[^/?#]+$", "i");
    return pattern.test(pure);
}

function chapterOrder(item) {
    if (!item || !item.url) return 0;
    let realUrl = extractChapterUrlFromKey(item.url);
    let matched = realUrl.match(/\/chuong-(\d+)/i);
    if (matched) return parseInt(matched[1], 10);

    matched = item.url.match(/^chap:(\d+):/i);
    if (matched) return parseInt(matched[1]);

    matched = item.name.match(/chuong\s+(\d+)/i);
    if (matched) return parseInt(matched[1]);

    return 0;
}

function extractChapterNumberFromUrl(url) {
    if (!url) return 0;

    let matched = url.match(/\/chuong-(\d+)(?:-|$)/i);
    if (matched) return parseInt(matched[1]);

    matched = url.match(/\/(\d+)(?:-|$)/i);
    if (matched) return parseInt(matched[1]);

    return 0;
}

function appendChaptersFromDoc(doc, slug, list, seen) {
    if (!doc) return 0;

    let added = 0;

    doc.select(CHAPTER_LINK_SELECTOR).forEach(a => {
        let link = removeQueryAndHash(normalizeUrl(a.attr("href")));
        if (!isChapterUrl(link, slug)) return;
        if (seen[link]) return;
        seen[link] = true;

        let chapterNum = cleanText(a.select(".chapter-number").text());
        let chapterTitle = cleanText(a.select(".chapter-title").text());
        let name = cleanText(a.text());
        let numberFromUrl = extractChapterNumberFromUrl(link);

        if (!chapterNum && numberFromUrl > 0) {
            chapterNum = "Chuong " + numberFromUrl;
        }

        if (chapterNum && chapterTitle) name = chapterNum + " - " + chapterTitle;
        else if (chapterNum && name && !/chuong\s*\d+/i.test(name)) name = chapterNum + " - " + name;
        else if (chapterTitle) name = chapterTitle;
        else if (chapterNum) name = chapterNum;

        if (!name) {
            let tail = link.split("/").pop();
            name = tail ? tail.replace(/-/g, " ") : "Chuong";
        }

        list.push({
            name: buildChapterSortName(name, numberFromUrl),
            url: buildChapterKey(link, numberFromUrl),
            host: BASE_URL,
            pay: false
        });

        added += 1;
    });

    return added;
}

function execute(url) {
    let storyUrl = ensureOldFirst(normalizeUrl(url));
    let doc = fetchDoc(storyUrl);
    if (!doc) {
        return Response.error("Khong tai duoc muc luc.");
    }

    let slug = extractStorySlug(storyUrl);
    let list = [];
    let seen = {};

    appendChaptersFromDoc(doc, slug, list, seen);

    if (list.length === 0) {
        return Response.error("Khong lay duoc danh sach chuong.");
    }

    let hasOrder = 0;
    list.forEach(item => {
        if (chapterOrder(item) > 0) hasOrder += 1;
    });

    if (hasOrder >= Math.ceil(list.length * 0.5)) {
        list.sort((a, b) => {
            let oa = chapterOrder(a);
            let ob = chapterOrder(b);
            if (oa > 0 && ob > 0 && oa !== ob) return oa - ob;
            return a.name.localeCompare(b.name);
        });
    }

    return Response.success(list);
}
