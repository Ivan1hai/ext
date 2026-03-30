load("config.js");

function execute() {
    try {
        let data = stvUnwrapData(stvApiGet("/categories/?page=1&limit=100"));
        let items = data && data.items ? data.items.slice() : [];

        items.sort(function (left, right) {
            let diff = stvToInt(right.story_count, 0) - stvToInt(left.story_count, 0);
            if (diff !== 0) return diff;
            return stvCompareText(left.name, right.name);
        });

        let out = [
            { title: "Tat Ca", input: BASE_URL + "/stories", script: "gen.js" },
            { title: "Dang Ra", input: BASE_URL + "/stories?status=OnGoing", script: "gen.js" },
            { title: "Hoan Thanh", input: BASE_URL + "/stories?status=Completed", script: "gen.js" },
            { title: "Convert", input: BASE_URL + "/stories?story_type=Convert", script: "gen.js" }
        ];

        items.forEach(function (category) {
            if (!category || !category.id || !category.name) return;
            if (stvToInt(category.story_count, 0) <= 0) return;

            out.push({
                title: stvTrim(category.name),
                input: BASE_URL + "/stories?category_id=" + stvTrim(category.id),
                script: "gen.js"
            });
        });

        return Response.success(out);
    } catch (error) {
        return Response.error(stvErrorMessage(error, "Khong tai duoc danh sach the loai."));
    }
}
