load("config.js");

function execute(url, page) {
    var pageUrl = buildFilterUrl(url || BASE_URL, page || "1");
    var response = fetch(pageUrl);
    if (!response || !response.ok) return null;

    var doc = response.html();
    var novels = [];

    extractListItems(doc).forEach(function (item) {
        novels.push(toNovel(item));
    });

    return Response.success(novels, getNextPage(doc));
}
