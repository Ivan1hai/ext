load("config.js");

function execute() {
    return Response.success([
        {
            title: "最近更新",
            input: BASE_URL + "/",
            script: "book.js"
        },
        {
            title: "男生 · 玄幻",
            input: BASE_URL + "/type/0/1/1/1",
            script: "book.js"
        },
        {
            title: "男生 · 仙侠",
            input: BASE_URL + "/type/0/4/1/1",
            script: "book.js"
        },
        {
            title: "女生 · 古代言情",
            input: BASE_URL + "/type/1/15/1/1",
            script: "book.js"
        },
        {
            title: "女生 · 现代言情",
            input: BASE_URL + "/type/1/17/1/1",
            script: "book.js"
        },
        {
            title: "全本 · 男生",
            input: BASE_URL + "/qb/male/1",
            script: "book.js"
        },
        {
            title: "全本 · 女生",
            input: BASE_URL + "/qb/female/1",
            script: "book.js"
        },
        {
            title: "推荐榜 · 男生",
            input: BASE_URL + "/rk/5/0/1",
            script: "book.js"
        },
        {
            title: "推荐榜 · 女生",
            input: BASE_URL + "/rk/13/0/1",
            script: "book.js"
        }
    ]);
}
