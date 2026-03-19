function stvHomeSearchInput(params) {
    var pairs = [];
    for (var key in params) {
        if (!params.hasOwnProperty(key)) continue;
        var value = params[key];
        if (value === null || typeof value === "undefined") continue;
        var text = String(value);
        if (!text) continue;
        pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(text));
    }
    return "stvsearch://?" + pairs.join("&");
}

function stvHomeTab(title, params) {
    return {
        title: title,
        input: stvHomeSearchInput(params || {}),
        script: "search.js"
    };
}

function execute() {
    var minChapter = "50";
    return Response.success([
        stvHomeTab("Mới cập nhật", { method: "search", minc: minChapter, sort: "update" }),
        stvHomeTab("Mới nhập kho", { method: "search", minc: minChapter, sort: "new" }),
        stvHomeTab("Đọc tổng", { method: "search", minc: minChapter, sort: "view" }),
        stvHomeTab("Đọc tuần", { method: "search", minc: minChapter, sort: "viewweek" }),
        stvHomeTab("Đọc ngày", { method: "search", minc: minChapter, sort: "viewday" }),
        stvHomeTab("Thích nhất", { method: "search", minc: minChapter, sort: "like" }),
        stvHomeTab("Lượt theo dõi", { method: "search", minc: minChapter, sort: "following" }),
        stvHomeTab("Lượt đánh dấu", { method: "search", minc: minChapter, sort: "bookmarked" }),
        stvHomeTab("Đề cử ngẫu nhiên", { method: "search", minc: minChapter, sort: "auto", step: "5" })
    ]);
}
