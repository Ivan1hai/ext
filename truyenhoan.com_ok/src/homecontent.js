load("config.js");

function execute(url, page) {
    var requestUrl = buildPagedUrl(url, page);
    var response = fetch(requestUrl);

    if (!response.ok) return null;

    var doc = response.html();
    return Response.success(extractListingItems(doc), extractNextPage(doc, page));
}
