load("config.js");

function execute() {
    return Response.success([
        { title: "Truyện Mới Cập Nhật", input: BASE_URL + "/truyen-moi-cap-nhat/", script: "gen.js" },
        { title: "Truyện Hot", input: BASE_URL + "/truyen-hot/", script: "gen.js" },
        { title: "Truyện Full", input: BASE_URL + "/truyen-full/", script: "gen.js" },
    ]);
}
