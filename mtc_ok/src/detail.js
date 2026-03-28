load("config.js");

function execute(url) {
    var authorization = getToken();
    if (!authorization) return Response.error(ERROR_MESSAGE);

    var bookId = null;
    var idMatch = url.match(/\/(\d+)(?:[/?#].*)?$/);
    if (idMatch) {
        bookId = idMatch[1];
    } else {
        var slugMatch = url.match(/\/truyen\/([^/?#]+)/);
        if (!slugMatch) return Response.error("Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin t\u1eeb URL: " + url);
        var slug = slugMatch[1];

        var searchRes = fetch(API_HOST + "/api/books/search?keyword=" + encodeURIComponent(slug), {
            headers: apiHeaders(authorization)
        });
        if (!searchRes.ok) return Response.error(ERROR_MESSAGE);

        var searchJson = searchRes.json();
        if (!searchJson.data || searchJson.data.length === 0) {
            return Response.error("Kh\u00f4ng t\u00ecm th\u1ea5y truy\u1ec7n: " + slug);
        }

        var books = searchJson.data;
        for (var i = 0; i < books.length; i++) {
            if (books[i].slug === slug) {
                bookId = books[i].id;
                break;
            }
        }
        if (!bookId) bookId = books[0].id;
    }

    var detailRes = fetch(API_HOST + "/api/books/" + bookId + "?include=author,genres,tags,creator", {
        headers: apiHeaders(authorization)
    });
    if (!detailRes.ok) return Response.error(ERROR_MESSAGE);

    var book = detailRes.json().data;
    if (!book) return Response.error(ERROR_MESSAGE);

    var genres = [];
    if (book.genres) {
        book.genres.forEach(function (g) {
            genres.push({
                title: g.name,
                input: "/api/books?filter%5Bgender%5D=1&filter%5Bgenres.id%5D=" + g.id + "&filter%5Bkind%5D=1&filter%5Bstate%5D=published&include=author%2Cgenres%2Ccreator&sort=-new_chap_at",
                script: "book.js"
            });
        });
    }

    var kindMap = {
        "1": "Chuy\u1ec3n ng\u1eef",
        "2": "S\u00e1ng t\u00e1c"
    };
    var kind = kindMap[String(book.kind)] || book.kind || "";
    var sex = book.sex === 1 ? "Nam" : "N\u1eef";
    var tags = book.tags ? book.tags.map(function (t) {
        return t.name;
    }).join(", ") : "";
    var authorName = book.author
        ? (book.author.name + (book.author.local_name ? " (" + book.author.local_name + ")" : ""))
        : "";

    var info = [
        "Lo\u1ea1i: " + kind,
        "\u0110\u1ed1i t\u01b0\u1ee3ng: " + sex,
        "Tr\u1ea1ng th\u00e1i: \u0110ang ra",
        "\u0110\u00e1nh gi\u00e1: " + (book.review_score || "") + " \u2b50 (" + (book.review_count || 0) + " l\u01b0\u1ee3t)",
        "\u0110\u1ec1 c\u1eed: " + (book.vote_count || 0),
        "Tags: " + (tags || "\u2014")
    ].join("<br>");

    return Response.success({
        name: book.name,
        cover: (book.poster && (book.poster["600"] || book.poster["default"])) || "",
        host: BASE_URL,
        author: authorName,
        description: book.synopsis || "",
        detail: info,
        ongoing: true,
        genres: genres,
    });
}
