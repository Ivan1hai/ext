load("config.js");

function execute() {
    var response = fetch(BASE_URL, {
        queries: {
            s: "",
            post_type: "wp-manga"
        }
    });
    if (!response || !response.ok) return null;

    var doc = response.html();
    var genreList = [];

    doc.select("input[name='genre[]']").forEach(function (item) {
        var slug = cleanText(item.attr("value"));
        var id = item.attr("id");
        var label = slug;
        var labelNode = id ? doc.select("label[for='" + id + "']").first() : null;

        if (labelNode) label = cleanText(labelNode.text());
        if (!slug || !label) return;

        genreList.push({
            title: label,
            input: buildGenreInput(slug),
            script: "book.js"
        });
    });

    return Response.success(genreList);
}
