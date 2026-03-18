load("config.js");

function execute() {
    let doc = fetchDoc(BASE_URL + "/");
    if (!doc) {
        return Response.error("Khong tai duoc danh sach the loai.");
    }

    let categories = parseCategoryLinks(doc);
    if (categories.length === 0) {
        return Response.error("Khong lay duoc danh sach the loai.");
    }

    let out = [];
    categories.forEach(cat => {
        out.push({
            title: cat.title,
            input: cat.url,
            script: "gen.js"
        });
    });

    return Response.success(out);
}
