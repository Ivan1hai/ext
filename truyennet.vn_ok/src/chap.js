load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Primary: #story contains only the actual text content
        let contentEl = doc.select("#story").first();
        if (contentEl) {
            // Clean ads and unnecessary elements
            contentEl.select("script").remove();
            contentEl.select("ins").remove();
            contentEl.select("iframe").remove();
            contentEl.select(".ads").remove();
            contentEl.select(".quangcao").remove();

            return Response.success(contentEl.html());
        }

        // Fallback: use .vung-doc but strip navigation/header elements
        let vungDoc = doc.select(".vung-doc").first();
        if (vungDoc) {
            vungDoc.select(".chapter_wrap").remove();
            vungDoc.select(".chapter_control").remove();
            vungDoc.select("#download-book").remove();
            vungDoc.select("h1").remove();
            vungDoc.select("h2").remove();
            vungDoc.select("script").remove();
            vungDoc.select("ins").remove();
            vungDoc.select("iframe").remove();
            vungDoc.select(".ads").remove();
            vungDoc.select(".quangcao").remove();

            return Response.success(vungDoc.html());
        }

        // Last fallback
        let fallbackEl = doc.select("#chapter-content").first();
        if (!fallbackEl) fallbackEl = doc.select(".chapter-content").first();
        if (fallbackEl) {
            fallbackEl.select("script").remove();
            return Response.success(fallbackEl.html());
        }
    }

    return null;
}
