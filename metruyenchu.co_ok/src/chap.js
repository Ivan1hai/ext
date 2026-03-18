function execute(url) {
    let doc = Http.get(url).html();

    let el = doc.select("article");
    if (el.size() > 0) {
        return Response.success(el.html());
    }

    // Fallback if the content is inside scripts or different node
    let content = "";
    doc.select("script").forEach(e => {
        let text = e.html();
        if (text.indexOf('self.__next_f.push(') !== -1 && text.indexOf('Đại Triệu') !== -1) {
            // Highly unlikely to need manual reconstruction since the NextJS App router renders initial HTML
        }
    });

    return null;
}
