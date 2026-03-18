load("config.js");

function parseInfoByLabel(root, label) {
    if (!root) return "";

    let out = "";
    root.select("p").forEach(p => {
        if (out) return;

        let text = cleanText(p.text());
        let lower = text.toLowerCase();
        if (lower.indexOf(label) === -1) return;

        out = text.replace(/^[^:]*:\s*/, "").trim();
    });

    return out;
}

function pickStoryTitle(doc) {
    let title = cleanText(doc.select("h3.story-name").first() ? doc.select("h3.story-name").first().text() : "");
    if (!title) title = cleanText(doc.select("h1").first() ? doc.select("h1").first().text() : "");

    if (!title) {
        let og = doc.select("meta[property='og:title']").first();
        title = og ? cleanText(og.attr("content")) : "";
        title = title.replace(/\s*-\s*Akay.*$/i, "").trim();
    }

    return title;
}

function extractChapterNumberFromHref(url) {
    let href = removeQueryAndHash(normalizeUrl(url));
    let matched = href.match(/\/chuong-(\d+)(?:-|$)/i);
    if (matched && matched[1]) return parseInt(matched[1], 10);
    return 0;
}

function findMaxChapterNumber(doc) {
    if (!doc) return 0;

    let maxChapter = 0;
    let selectors = ".story-detail__bottom--chapters-new a[href*='/chuong-'], .story-detail__list-chapter--list a[href*='/chuong-'], .story-detail__bottom--chapters-new [data-url*='/chuong-'], .story-detail__list-chapter--list [data-url*='/chuong-']";

    doc.select(selectors).forEach(el => {
        let href = el.attr("href") || el.attr("data-url") || "";
        let chapterNumber = extractChapterNumberFromHref(href);
        if (chapterNumber > maxChapter) maxChapter = chapterNumber;
    });

    return maxChapter;
}

function estimateChapterCount(storyUrl, doc) {
    let maxChapter = findMaxChapterNumber(doc);
    if (maxChapter > 0) return maxChapter;

    let firstPageCount = countUniqueChapterLinks(doc);
    if (firstPageCount <= 0) return 0;

    let maxPage = parseMaxPage(doc);
    if (maxPage <= 1) return firstPageCount;
    if (maxPage > MAX_TOC_PAGES) maxPage = MAX_TOC_PAGES;

    let lastDoc = fetchDoc(withPage(ensureOldFirst(stripPageParam(storyUrl)), maxPage));
    if (!lastDoc) return firstPageCount * maxPage;

    let lastPageCount = countUniqueChapterLinks(lastDoc);
    if (lastPageCount <= 0) return firstPageCount * maxPage;

    return firstPageCount * (maxPage - 1) + lastPageCount;
}

function execute(url) {
    let storyUrl = ensureOldFirst(normalizeUrl(url));
    let doc = fetchDoc(storyUrl);
    if (!doc) {
        return Response.error("Khong tai duoc trang chi tiet.");
    }

    let name = pickStoryTitle(doc);
    if (!name) {
        return Response.error("Khong tim thay ten truyen.");
    }

    let cover = "";
    let coverEl = doc.select(".story-detail__top--image img").first();
    if (!coverEl) coverEl = doc.select("meta[property='og:image']").first();
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("src") || coverEl.attr("content") || "";
    }

    let infoRoot = doc.select(".story-detail__bottom--info").first();
    let author = "";
    let status = "";

    if (infoRoot) {
        let authorEl = infoRoot.select("p a").first();
        if (authorEl) author = cleanText(authorEl.text());

        let statusEl = infoRoot.select("p span").first();
        if (statusEl) status = cleanText(statusEl.text());
    }

    if (!author) author = parseInfoByLabel(infoRoot, "tac gia");
    if (!status) status = parseInfoByLabel(infoRoot, "trang thai");

    if (!author) {
        let authorMeta = doc.select("meta[property='og:article:author']").first();
        if (authorMeta) author = cleanText(authorMeta.attr("content"));
    }

    let categories = [];
    if (infoRoot) {
        infoRoot.select("a").forEach(a => {
            let text = cleanText(a.text());
            if (!text) return;
            if (author && text === author) return;
            categories.push(text);
        });
    }

    let desc = "";
    let descEl = doc.select(".story-detail__top--desc").first();
    if (descEl) desc = cleanText(descEl.text());
    if (!desc) {
        let metaDesc = doc.select("meta[name='description']").first();
        desc = metaDesc ? cleanText(metaDesc.attr("content")) : "";
    }

    let chapterCount = estimateChapterCount(storyUrl, doc);

    let details = [];
    if (author) details.push("Tac gia: " + author);
    if (categories.length > 0) details.push("The loai: " + categories.join(", "));
    if (status) details.push("Trang thai: " + status);
    if (chapterCount > 0) details.push("So chuong: " + chapterCount);

    return Response.success({
        name: name,
        cover: toAbsolute(cover),
        author: author,
        description: desc,
        detail: details.join("<br>"),
        host: BASE_URL
    });
}
