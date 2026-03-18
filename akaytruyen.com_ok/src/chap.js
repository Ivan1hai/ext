load("config.js");

function cleanChapterHtml(html) {
    return (html || "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .trim();
}

function extractElementInnerHtml(html, startIndex, tagName) {
    if (!html || startIndex < 0 || !tagName) return "";

    let openTagEnd = html.indexOf(">", startIndex);
    if (openTagEnd < 0) return "";

    let openTag = html.substring(startIndex, openTagEnd + 1);
    if (/\/\s*>$/.test(openTag)) return "";

    let depth = 1;
    let tagRegex = new RegExp("<\\/?\\s*" + tagName + "\\b[^>]*>", "ig");
    tagRegex.lastIndex = openTagEnd + 1;

    let match;
    while ((match = tagRegex.exec(html)) !== null) {
        let token = match[0];
        let isClosing = /^<\//.test(token);
        let isSelfClosing = /\/\s*>$/.test(token);

        if (isClosing) {
            depth -= 1;
            if (depth === 0) {
                return html.substring(openTagEnd + 1, match.index);
            }
            continue;
        }

        if (!isSelfClosing) {
            depth += 1;
        }
    }

    return "";
}

function findElementStartByMarker(html, marker) {
    if (!html || !marker) return -1;

    let index = html.indexOf(marker);
    while (index > -1) {
        let tagStart = html.lastIndexOf("<", index);
        let tagEnd = html.indexOf(">", index);
        if (tagStart > -1 && tagEnd > index) {
            return tagStart;
        }

        index = html.indexOf(marker, index + marker.length);
    }

    return -1;
}

function extractChapterContentFromHtml(html) {
    if (!html) return "";

    let markers = [
        'id="chapter-content"',
        "id='chapter-content'",
        'class="chapter-content',
        "class='chapter-content"
    ];

    for (let i = 0; i < markers.length; i++) {
        let startIndex = findElementStartByMarker(html, markers[i]);
        if (startIndex < 0) continue;

        let openTagEnd = html.indexOf(">", startIndex);
        if (openTagEnd < 0) continue;

        let tagMatch = html.substring(startIndex, openTagEnd + 1).match(/^<([a-z0-9:-]+)/i);
        if (!tagMatch || !tagMatch[1]) continue;

        let content = extractElementInnerHtml(html, startIndex, tagMatch[1]);
        content = cleanChapterHtml(content);
        if (content) return content;
    }

    return "";
}

function extractChapterContentFromDoc(doc) {
    if (!doc) return "";

    let contentEl = doc.select("#chapter-content").first();
    if (!contentEl) contentEl = doc.select(".chapter-content").first();
    if (!contentEl) return "";

    contentEl.select("script, style").remove();
    return cleanChapterHtml(contentEl.html());
}

function detectChapterError(text) {
    let fullText = cleanText((text || "").replace(/<[^>]+>/g, " ")).toLowerCase();
    if (!fullText) return "";

    if (fullText.indexOf("dang nhap") > -1) {
        return "Chuong co the yeu cau dang nhap.";
    }

    if (fullText.indexOf("khong co quyen") > -1 || fullText.indexOf("truy cap bi tu choi") > -1) {
        return "Khong co quyen doc chuong nay.";
    }

    return "";
}

function execute(url) {
    let chapterUrl = normalizeUrl(extractChapterUrlFromKey(url));
    let rawHtml = fetchText(chapterUrl);
    let content = extractChapterContentFromHtml(rawHtml);

    if (!content && rawHtml) {
        try {
            content = extractChapterContentFromDoc(Html.parse(rawHtml));
        } catch (e) {
        }
    }

    if (!content) {
        let doc = fetchDoc(chapterUrl);
        if (!doc) {
            let fastError = detectChapterError(rawHtml);
            if (fastError) {
                return Response.error(fastError);
            }
            return Response.error("Khong tai duoc noi dung chuong.");
        }

        content = extractChapterContentFromDoc(doc);
        if (!content) {
            let fullText = cleanText(doc.text()).toLowerCase();
            if (fullText.indexOf("dang nhap") > -1) {
                return Response.error("Chuong co the yeu cau dang nhap.");
            }
            if (fullText.indexOf("khong co quyen") > -1 || fullText.indexOf("truy cap bi tu choi") > -1) {
                return Response.error("Khong co quyen doc chuong nay.");
            }
            return Response.error("Khong tim thay noi dung chuong.");
        }
    }

    return Response.success(content);
}
