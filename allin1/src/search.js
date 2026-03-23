load("config.js");

function stvBuildSearchOption(rawInput) {
    var option = {
        method: "search",
        minc: "",
        category: "",
        findinname: "",
        find: "",
        sort: "update",
        host: "",
        tag: "",
        step: ""
    };

    var input = stvTrim(rawInput);
    if (!input) return option;

    if (input.indexOf("stvsearch://") === 0) {
        var qPos = input.indexOf("?");
        var q = stvParseQuery(qPos >= 0 ? input.substring(qPos + 1) : "");
        option.method = stvTrim(q.method || option.method);
        option.minc = stvTrim(q.minc || q.minchapter || option.minc);
        option.category = stvTrim(q.category || option.category);
        option.findinname = stvTrim(q.findinname || q.keyword || option.findinname);
        option.find = stvTrim(q.find || q.findincontent || option.find);
        option.sort = stvNormalizeSearchSort(stvTrim(q.sort || option.sort));
        option.host = stvTrim(q.host || option.host);
        option.tag = stvTrim(q.tag || option.tag);
        option.step = stvTrim(q.step || option.step);
        return option;
    }

    option.findinname = input;
    option.sort = stvNormalizeSearchSort(option.sort);
    return option;
}

function stvNormalizeSearchSort(sort) {
    var text = stvTrim(sort).toLowerCase();
    if (!text) return "update";
    if (text === "lastupdate") return "update";
    if (text === "viewtotal") return "view";
    if (text === "week" || text === "readweek") return "viewweek";
    if (text === "day" || text === "readday") return "viewday";
    return text;
}

function stvToSearchItem(base, book) {
    var bookHost = stvFirst(book.host, "sangtac");
    var bookId = stvFirst(book.id, "");
    var name = stvFirst(book.tname, book.name, "(Không có tên)");
    var author = stvFirst(book.hauthor, book.author, "Không rõ");
    var status = "Dang ra";
    var desc = author;
    if (status) desc += " · " + status;
    if (bookHost) desc += " · " + bookHost;

    return {
        name: name,
        link: stvBuildPublicBookUrl(bookHost, bookId, book.status || 1, base),
        cover: stvNormalizeCover(book.thumb, base),
        description: desc,
        host: stvPublicBase()
    };
}

function execute(key, page) {
    var option = stvBuildSearchOption(key);

    var pageIndex = parseInt(stvTrim(page || "0"), 10);
    if (isNaN(pageIndex) || pageIndex < 0) pageIndex = 0;

    var path = "/io/searchtp/searchBooks"
        + "?method=search"
        + "&minc=" + stvEncode(option.minc)
        + "&category=" + stvEncode(option.category)
        + "&findinname=" + stvEncode(option.findinname)
        + "&find=" + stvEncode(option.find)
        + "&host=" + stvEncode(option.host)
        + "&sort=" + stvEncode(stvNormalizeSearchSort(option.sort))
        + "&tag=" + stvEncode(option.tag)
        + "&step=" + stvEncode(option.step)
        + "&p=" + pageIndex;

    var found = stvSearchJsonOnBases(path, function () {
        return {
            method: "GET",
            headers: stvHeaders()
        };
    }, STV_STATE.lastBase);

    if (!found || found.error) {
        return Response.error("Không thể tải kết quả tìm kiếm STV.");
    }

    var json = found.json;
    if (!json || !json.list || Object.prototype.toString.call(json.list) !== "[object Array]") {
        return Response.error("STV không trả về dữ liệu tìm kiếm hợp lệ.");
    }

    var out = [];
    for (var i = 0; i < json.list.length; i++) {
        out.push(stvToSearchItem(found.base, json.list[i] || {}));
    }

    var next = null;
    if (out.length > 0) {
        next = String(pageIndex + 1);
    }

    return Response.success(out, next);
}
