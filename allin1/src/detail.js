load("config.js");

function stvToVbookBreaks(text) {
    var value = text === null || typeof text === "undefined" ? "" : String(text);
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, "<br>")
        .replace(/\n/g, "<br>");
}

function stvStatusTextVi(status) {
    var text = stvTrim(status);
    if (text === "1") return "Còn tiếp";
    if (text === "2") return "Tạm ngưng";
    if (text === "0") return "Hoàn thành";

    var raw = stvStatusText(status);
    if (raw === "Con tiep") return "Còn tiếp";
    if (raw === "Tam ngung") return "Tạm ngưng";
    if (raw === "Hoan thanh") return "Hoàn thành";
    return raw;
}

function stvBuildDetailMeta(book, parsed) {
    var lines = [];
    var category = stvTrim(book.category);
    var host = stvFirst(book.host, parsed.host);

    if (book.name) lines.push(book.name);
     if (host) lines.push("Nguồn: " + host);
    if (book.id) lines.push("BookID: " + book.id);
    if (book.chaptercount) lines.push("Số chương: " + book.chaptercount);
    if (book.status) lines.push("Trạng thái: " + stvStatusTextVi(book.status));
    if (category) lines.push("Thể loại: " + category);

    return lines.join("<br>");
}

function stvDetailBuildSearchInput(params) {
    var pairs = [];
    for (var key in params) {
        if (!params.hasOwnProperty(key)) continue;
        var value = params[key];
        if (value === null || typeof value === "undefined") continue;
        var text = stvTrim(value);
        if (!text) continue;
        pairs.push(stvEncode(key) + "=" + stvEncode(text));
    }
    return "stvsearch://?" + pairs.join("&");
}

function stvDetailSlug(text) {
    var value = stvTrim(text).toLowerCase();
    if (!value) return "";

    var from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
    var to =   "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
    for (var i = 0; i < from.length; i++) {
        value = value.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }

    value = value.replace(/[^a-z0-9]+/g, "-");
    value = value.replace(/^-+|-+$/g, "");
    value = value.replace(/-{2,}/g, "-");
    return value;
}

function stvDetailResolveCategoryCode(title) {
    var key = stvDetailSlug(title);
    var map = {
        "huyen-huyen": "hh",
        "huyen-huyen-ky-huyen": "hh",
        "do-thi": "dt",
        "ngon-tinh": "nt",
        "vong-du": "vd",
        "khoa-hoc-vien-tuong": "kh",
        "khoa-huyen": "kh",
        "lich-su": "ls",
        "dong-nhan": "dn",
        "di-nang": "dna",
        "linh-di": "ld",
        "light-novel": "ln"
    };
    return map[key] || "";
}

function stvDetailCategoryTokens(categoryText) {
    var text = stvTrim(categoryText);
    if (!text) return [];

    text = text.replace(/[，、]/g, ",");
    var parts = text.split(/[,|;/]+/);
    if (parts.length <= 1) {
        parts = text.split(/\s{2,}/);
    }

    var out = [];
    var seen = {};
    for (var i = 0; i < parts.length; i++) {
        var token = stvTrim(parts[i]);
        if (!token) continue;
        var key = token.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        out.push(token);
    }
    return out;
}

function stvDetailBuildGenres(bookHost, categoryText) {
    var tokens = stvDetailCategoryTokens(categoryText);
    var out = [];
    var seen = {};

    for (var i = 0; i < tokens.length; i++) {
        var title = tokens[i];
        var code = stvDetailResolveCategoryCode(title);
        var tag = stvDetailSlug(title);

        var params = {
            method: "search",
            host: bookHost || "",
            sort: "update",
            minc: "50"
        };

        if (code) {
            params.category = code;
        } else if (tag) {
            params.tag = tag;
        } else {
            continue;
        }

        var input = stvDetailBuildSearchInput(params);
        if (!input || seen[input]) continue;
        seen[input] = true;
        out.push({
            title: title,
            input: input,
            script: "search.js"
        });
    }

    return out;
}

function stvDetailBuildCommentInput(base, host, bookid) {
    return stvBuildUrl(base,
        "/mobile/comment.php?act=readcomment"
        + "&host=" + stvEncode(host)
        + "&bookid=" + stvEncode(bookid)
        + "&start=0"
        + "&order=new"
    );
}

function execute(url) {
    var parsed = stvParseBookUrl(url);
    if (!parsed || !parsed.host || !parsed.id) {
        return Response.error("Không phân tích được URL sách STV.");
    }

    var path = "/mobile/bookinfo.php?host=" + stvEncode(parsed.host) + "&hid=" + stvEncode(parsed.id);
    var found = stvSearchJsonOnBases(path, function () {
        return {
            method: "GET",
            headers: stvHeaders()
        };
    }, parsed.base);

    if (!found || found.error) {
        return Response.error("Không tải được thông tin sách STV.");
    }

    var json = found.json;
    if (!json || json.code !== 100 || !json.book) {
        return Response.error("STV không trả về thông tin sách hợp lệ: Truyện đã bị xóa do vi phạm hoặc nguồn đã không còn hoạt động.");
    }

    var book = json.book || {};
    var name = stvFirst(book.tname, book.name, "(Không có tên)");
    var author = stvFirst(book.hauthor, book.author, "Không rõ");
    var bookHost = stvFirst(book.host, parsed.host);
    var bookId = stvFirst(book.id, parsed.id);
    var genres = stvDetailBuildGenres(bookHost, book.category);
    var comments = [{
        title: "Bình luận",
        input: stvDetailBuildCommentInput(found.base, bookHost, bookId),
        script: "comment.js"
    }];

    return Response.success({
        name: name,
        cover: stvNormalizeCover(book.thumb, found.base),
        host: stvPublicBase(),
        author: author,
        description: stvToVbookBreaks(stvFirst(book.info, "Không có mô tả.")),
        detail: stvBuildDetailMeta(book, parsed),
        ongoing: stvIsOngoing(book.status),
        genres: genres,
        comments: comments
    });
}
