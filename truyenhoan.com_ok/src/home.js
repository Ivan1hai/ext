load("config.js");

function execute() {
    return Response.success([
        { title: "Truyen Hot", input: BASE_URL + "/truyen-hot/", script: "gen.js" },
        { title: "Truyen Full", input: BASE_URL + "/truyen-full/", script: "gen.js" },
        { title: "Truyen Moi Dang", input: BASE_URL + "/truyen-moi-dang/", script: "gen.js" }
    ]);
}
