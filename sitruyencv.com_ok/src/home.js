function execute() {
    return Response.success([
        { title: "Truyen Hot", input: "home:hot_stories", script: "gen.js" },
        { title: "Moi Cap Nhat", input: "home:recently_updated_stories", script: "gen.js" },
        { title: "De Cu", input: "home:recommended_stories", script: "gen.js" },
        { title: "Moi Dang", input: "home:newest_stories", script: "gen.js" }
    ]);
}
