var BASE_URL = "https://truyenhoan.com";
var CDN_URL = "https://cdn.truyenhoan.com";

try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL.replace(/\/+$/, "");
    }
} catch (error) {
}

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        return url.replace(/^https?:\/\/(?:www\.)?truyenhoan\.com/i, BASE_URL);
    }
    if (url.charAt(0) === "/") return BASE_URL + url;
    return BASE_URL + "/" + url.replace(/^\/+/, "");
}

function storyUrlFromItem(item) {
    var dmca = item && item.dmca ? parseInt(item.dmca, 10) : 0;
    var suffix = dmca > 0 ? "-f" + dmca : "";
    return BASE_URL + "/" + item.alias + suffix + "." + item.storyID + "/";
}

function storyCover(storyId, alias, size) {
    var variant = size || "large";
    return CDN_URL + "/medias/covers/" + Math.floor(parseInt(storyId, 10) / 1000) + "/" + storyId + "-" + alias + "_cover_" + variant + ".jpg";
}

function removeAccents(text) {
    var str = (text || "").toLowerCase();
    str = str.replace(/\u00e0|\u00e1|\u1ea1|\u1ea3|\u00e3|\u00e2|\u1ea7|\u1ea5|\u1ead|\u1ea9|\u1eab|\u0103|\u1eb1|\u1eaf|\u1eb7|\u1eb3|\u1eb5/g, "a");
    str = str.replace(/\u00e8|\u00e9|\u1eb9|\u1ebb|\u1ebd|\u00ea|\u1ec1|\u1ebf|\u1ec7|\u1ec3|\u1ec5/g, "e");
    str = str.replace(/\u00ec|\u00ed|\u1ecb|\u1ec9|\u0129/g, "i");
    str = str.replace(/\u00f2|\u00f3|\u1ecd|\u1ecf|\u00f5|\u00f4|\u1ed3|\u1ed1|\u1ed9|\u1ed5|\u1ed7|\u01a1|\u1edd|\u1edb|\u1ee3|\u1edf|\u1ee1/g, "o");
    str = str.replace(/\u00f9|\u00fa|\u1ee5|\u1ee7|\u0169|\u01b0|\u1eeb|\u1ee9|\u1ef1|\u1eed|\u1eef/g, "u");
    str = str.replace(/\u1ef3|\u00fd|\u1ef5|\u1ef7|\u1ef9/g, "y");
    str = str.replace(/\u0111/g, "d");
    return str;
}

function chapterSlug(text) {
    var raw = (text || "").split(":")[0].trim();
    if (!raw) return "";

    var normalized = removeAccents(raw);
    var chapterMatch = normalized.match(/chuong\s+([0-9\-\.]+)/i);
    if (chapterMatch) {
        return "chuong-" + chapterMatch[1].replace(/[^0-9\-\.]/g, "");
    }

    normalized = normalized.replace(/[^a-z0-9]+/g, "-");
    normalized = normalized.replace(/-+/g, "-");
    normalized = normalized.replace(/^\-+|\-+$/g, "");
    return normalized;
}

function chapterUrl(storyAlias, chapterName) {
    return BASE_URL + "/" + storyAlias + "/" + chapterSlug(chapterName) + ".html";
}

function buildPagedUrl(url, page) {
    var normalized = normalizeUrl(url);
    if (!page || page === "1") return normalized;

    normalized = normalized.replace(/\/trang-\d+\/?$/i, "");
    normalized = normalized.replace(/\/+$/, "");
    return normalized + "/trang-" + page + "/";
}

function extractNextPage(doc, currentPage) {
    var page = parseInt(currentPage || "1", 10);
    var next = page + 1;
    var links = doc.select(".pagination li a");

    for (var i = 0; i < links.size(); i++) {
        var href = links.get(i).attr("href");
        if (!href) continue;
        if (href.indexOf("paged=" + next) !== -1 || href.indexOf("/trang-" + next + "/") !== -1) {
            return "" + next;
        }
    }

    return null;
}

function extractLabels(row) {
    var labels = [];
    var labelEls = row.select(".label-title");

    for (var i = 0; i < labelEls.size(); i++) {
        var className = labelEls.get(i).attr("class");
        if (className.indexOf("label-full") !== -1) labels.push("Full");
        else if (className.indexOf("label-hot") !== -1) labels.push("Hot");
        else if (className.indexOf("label-new") !== -1) labels.push("New");
    }

    return labels;
}

function buildListingDescription(author, chapterText, labels) {
    var parts = [];
    if (author) parts.push("Tac gia: " + author);
    if (chapterText) parts.push(chapterText);
    if (labels && labels.length > 0) parts.push(labels.join(", "));
    return parts.join(" | ");
}

function extractListingItems(doc) {
    var items = [];
    var seen = {};
    var rows = doc.select(".col-truyen-main .list.list-truyen > .row[itemscope], .col-truyen-main .list.list-truyen .row[itemscope]");

    for (var i = 0; i < rows.size(); i++) {
        var row = rows.get(i);
        var titleEl = row.select("h3.truyen-title a").first();
        if (!titleEl) titleEl = row.select("h3 a").first();
        if (!titleEl) continue;

        var link = normalizeUrl(titleEl.attr("href"));
        if (!link || seen[link]) continue;
        seen[link] = true;

        var cover = "";
        var lazyEl = row.select(".lazyimg").first();
        if (lazyEl) {
            cover = lazyEl.attr("data-desk-image");
            if (!cover) cover = lazyEl.attr("data-image");
        }

        if (!cover) {
            var imgEl = row.select("img").first();
            if (imgEl) {
                cover = imgEl.attr("data-src");
                if (!cover) cover = imgEl.attr("src");
            }
        }

        var author = "";
        var chapterText = "";
        var infoEls = row.select(".author");
        if (infoEls.size() > 0) author = infoEls.get(0).text().trim();
        if (infoEls.size() > 1) chapterText = infoEls.get(1).text().trim();

        items.push({
            name: titleEl.text().trim(),
            link: link,
            cover: normalizeUrl(cover),
            description: buildListingDescription(author, chapterText, extractLabels(row)),
            host: BASE_URL
        });
    }

    return items;
}

function extractGenresFromDocument(doc) {
    var items = [];
    var html = doc.html();
    var match = html.match(/genres\s*=\s*JSON\.parse\('([^']+)'\)/);

    if (match) {
        try {
            var data = JSON.parse(match[1]);
            for (var key in data) {
                if (!data.hasOwnProperty(key)) continue;
                var genre = data[key];
                if (!genre || !genre.name || !genre.slug) continue;
                items.push({
                    title: genre.name.trim(),
                    input: BASE_URL + "/truyen-" + genre.slug + "/hoan/",
                    script: "gen.js"
                });
            }
        } catch (error) {
        }
    }

    if (items.length > 0) return items;

    var seen = {};
    var links = doc.select(".list.list-truyen.list-cat a[href*='/truyen-']");
    for (var i = 0; i < links.size(); i++) {
        var link = links.get(i);
        var href = normalizeUrl(link.attr("href"));
        var title = link.text().trim();
        var asciiTitle = removeAccents(title);
        if (asciiTitle.indexOf("truyen ") === 0) title = title.substring(7).trim();
        if (removeAccents(title).match(/\shoan$/)) title = title.substring(0, title.length - 5).trim();
        if (!title || !href || seen[href]) continue;
        seen[href] = true;
        items.push({
            title: title,
            input: href,
            script: "gen.js"
        });
    }

    return items;
}

function cleanDate(value) {
    if (!value) return "";
    return value.replace("T", " ").replace(/\+\d+:\d+$/, "");
}
