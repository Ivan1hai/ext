load("config.js");

const KTC_HOME_PAGE_ID = 142360;

function ktcSectionNeedle(sectionKey) {
    switch (ktcTrim(sectionKey)) {
        case "new":
            return "truyen moi cua kho";
        case "updated":
            return "truyen moi cap nhat";
        case "top-qidian":
            return "top xep hang qidian";
        case "yeu-cau-dich":
            return "doc gia yeu cau dich";
        case "huyen-huyen-tien-hiep":
            return "huyen huyen tien hiep";
        default:
            return "";
    }
}

function ktcNormalizeNeedle(text) {
    return ktcFoldText(text).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function ktcParseSectionCard(item) {
    let titleEl = item.select(".hs-title a").first();
    if (!titleEl) titleEl = item.select(".story-list-title").first();
    if (!titleEl) titleEl = item.select("a[href*='/truyen/']").first();
    if (!titleEl) titleEl = item.select("a").first();
    if (!titleEl) return null;

    let link = ktcToAbsolute(titleEl.attr("href") || item.attr("href"));
    let name = ktcTrim(titleEl.text().replace(/\s+/g, " "));
    if (!name || !link) return null;

    let coverEl = item.select(".hs-thumb img").first();
    if (!coverEl) coverEl = item.select(".story-thumb-fixed img, .story-thumb-img").first();
    if (!coverEl) coverEl = item.select("img").first();

    let cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("data-lazy-src") || coverEl.attr("src") || "";
    }

    let description = "";
    let author = ktcTrim(item.select(".story-list-author").text().replace(/\s+/g, " "));
    let time = ktcTrim(item.select(".story-list-time").text().replace(/\s+/g, " "));
    if (author) description = author;
    if (time) description += (description ? " | " : "") + time;

    return {
        name: name,
        link: link,
        cover: ktcToAbsolute(cover || DEFAULT_COVER),
        description: description,
        host: BASE_URL
    };
}

function ktcParseUpdatedSection(segment) {
    let list = [];
    let regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/ig;
    let match = null;

    while ((match = regex.exec(segment)) !== null) {
        let attrs = match[1] || "";
        if (!/class=["'][^"']*story-list-item[^"']*["']/i.test(attrs)) continue;

        let hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
        let href = ktcToAbsolute(hrefMatch ? (hrefMatch[1] || "") : "");
        let cardDoc = Html.parse("<div>" + match[2] + "</div>");

        let title = ktcTrim(cardDoc.select(".story-list-title").text().replace(/\s+/g, " "));
        let author = ktcTrim(cardDoc.select(".story-list-author").text().replace(/\s+/g, " "));
        let time = ktcTrim(cardDoc.select(".story-list-time").text().replace(/\s+/g, " "));
        let coverEl = cardDoc.select(".story-thumb-fixed img, .story-thumb-img, img").first();
        let cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("data-lazy-src") || coverEl.attr("src") || "") : "";

        if (!title || !href) continue;

        let description = author;
        if (time) description += (description ? " | " : "") + time;

        list.push({
            name: title,
            link: href,
            cover: ktcToAbsolute(cover || DEFAULT_COVER),
            description: description,
            host: BASE_URL
        });
    }

    return list;
}

function ktcParseUpdatedFromDoc(doc) {
    let list = [];
    if (!doc) return list;

    doc.select(".latest-stories-list .story-list-item").forEach(card => {
        let parsed = ktcParseSectionCard(card);
        if (parsed) list.push(parsed);
    });

    return list;
}

function ktcFetchHomeContentHtml() {
    let apiUrl = BASE_URL + "/wp-json/wp/v2/pages/" + KTC_HOME_PAGE_ID;
    let jsonData = ktcFetchJson(apiUrl, null, BASE_URL);
    if (jsonData.data && jsonData.data.content && jsonData.data.content.rendered) {
        return jsonData.data.content.rendered;
    }

    let pageData = ktcFetchPage(BASE_URL, null, 15000, BASE_URL);
    if (!pageData || !pageData.doc || pageData.blocked) return "";
    return pageData.doc.html();
}

function ktcParseSectionFromHome(sectionKey) {
    let needle = ktcSectionNeedle(sectionKey);
    if (!needle) return [];

    if (ktcTrim(sectionKey) === "updated") {
        let pageData = ktcFetchPage(BASE_URL, null, 15000, BASE_URL);
        if (pageData && pageData.doc && !pageData.blocked) {
            let liveList = ktcParseUpdatedFromDoc(pageData.doc);
            if (liveList.length > 0) return liveList;
        }
    }

    let html = ktcFetchHomeContentHtml();
    if (!html) return [];

    if (ktcTrim(sectionKey) === "updated") {
        let updatedDoc = Html.parse("<div>" + html + "</div>");
        let updatedList = ktcParseUpdatedFromDoc(updatedDoc);
        if (updatedList.length > 0) return updatedList;
    }

    let headingRegex = /<h2[^>]*class=["'][^"']*home-genre-title[^"']*["'][^>]*>\s*<span>([\s\S]*?)<\/span>\s*<\/h2>/ig;
    let matches = [];
    let match = null;

    while ((match = headingRegex.exec(html)) !== null) {
        matches.push({
            index: match.index,
            title: ktcNormalizeNeedle(ktcDecodeHtml(match[1] || ""))
        });
    }

    for (let i = 0; i < matches.length; i++) {
        let item = matches[i];
        if (!item.title || item.title.indexOf(needle) === -1) continue;

        let endIndex = i + 1 < matches.length ? matches[i + 1].index : html.length;
        let segment = html.substring(item.index, endIndex);

        if (ktcTrim(sectionKey) === "updated") {
            let updatedList = ktcParseUpdatedSection(segment);
            if (updatedList.length > 0) return updatedList;
        }

        let doc = Html.parse("<div>" + segment + "</div>");
        let list = [];

        doc.select(".home-story-card, .story-list-item").forEach(card => {
            let parsed = ktcParseSectionCard(card);
            if (parsed) list.push(parsed);
        });

        if (list.length > 0) return list;
    }

    return [];
}

function execute(sectionKey, page) {
    if (page && page !== "1") return Response.success([]);
    return Response.success(ktcParseSectionFromHome(sectionKey));
}
