load("config.js");

function execute() {
    return Response.success([
        {
            title: "Trang chủ",
            input: buildFilterUrl(BASE_URL, 1),
            script: "book.js"
        },
        {
            title: "TOP",
            input: buildFilterUrl(BASE_URL + "/?m_orderby=views", 1),
            script: "book.js"
        },
        {
            title: "Truyện Full",
            input: BASE_URL + "/?" + buildQueryString({
                s: "",
                post_type: "wp-manga",
                "status[0]": "end",
                m_orderby: "latest",
                paged: 1
            }),
            script: "book.js"
        }
    ]);
}
