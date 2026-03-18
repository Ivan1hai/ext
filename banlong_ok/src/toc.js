function execute(url) {
    let slug = url.split("/").pop();
    if (!slug && url.endsWith("/")) {
        let parts = url.split("/");
        slug = parts[parts.length - 2];
    }

    let page = 1;
    let totalPage = 1;
    let data = [];

    do {
        let response = fetch("https://api.blhvip.vn/v1/story/" + slug + "/chapter_list?page=" + page);
        if (response.ok) {
            let json = response.json();
            if (json.success) {
                totalPage = json.total_page;
                let list = json.data;
                for (let i = 0; i < list.length; i++) {
                    let item = list[i];
                    data.push({
                        name: item.name,
                        url: "https://blhvip.vn" + item.url,
                        host: "https://blhvip.vn"
                    });
                }
            } else {
                break;
            }
        } else {
            break;
        }
        page++;
    } while (page <= totalPage);

    return Response.success(data);
}