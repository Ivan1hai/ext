load("config.js");

function execute() {
    let sections = [
        {
            title: "Trang chủ",
            input: BASE_URL + "/",
            script: "gen.js"
        }
    ];

    let doc = fetchDoc(BASE_URL + "/");
    let categories = parseCategoryLinks(doc);

    categories.forEach(cat => {
        sections.push({
            title: cat.title,
            input: cat.url,
            script: "gen.js"
        });
    });

    return Response.success(sections);
}
