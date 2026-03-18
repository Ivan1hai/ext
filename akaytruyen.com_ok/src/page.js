load("config.js");

function execute(url) {
    let storyUrl = ensureOldFirst(stripPageParam(url));
    let doc = fetchDoc(storyUrl);
    if (!doc) return Response.success([storyUrl]);

    let maxPage = parseMaxPage(doc);
    if (!maxPage || maxPage <= 1) {
        return Response.success([storyUrl]);
    }

    if (maxPage > MAX_TOC_PAGES) maxPage = MAX_TOC_PAGES;

    let pages = [];
    for (let pageNum = 1; pageNum <= maxPage; pageNum++) {
        pages.push(withPage(storyUrl, pageNum));
    }

    return Response.success(pages);
}
