function execute() {
    return Response.success([
        { title: "Truyện Mới", input: "new", script: "homecontent.js" },
        { title: "Truyện Hot", input: "hot", script: "homecontent.js" },
        { title: "Truyện Full", input: "completed", script: "homecontent.js" }
    ]);
}
