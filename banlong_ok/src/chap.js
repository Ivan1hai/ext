function execute(url) {
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let content = doc.select(".s-content").html();
        if (content) {
            return Response.success(content);
        }
    }
    return null;
}