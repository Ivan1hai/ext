function execute(key, page) {
    if (!page) page = '1';
    let url = "https://api.blhvip.vn/v1/search?q=" + key + "&page=" + page;
    let response = fetch(url);
    if (response.ok) {
        let json = response.json();
        if (json.success) {
            let data = [];
            let list = json.data;
            if (list) {
                for (let i = 0; i < list.length; i++) {
                    let item = list[i];
                    data.push({
                        name: item.name,
                        link: "https://blhvip.vn/truyen/" + item.slug,
                        cover: item.img_url,
                        description: item.author_name,
                        host: "https://blhvip.vn"
                    });
                }
            }

            let next = "";
            let totalPage = json.total_page;
            if (parseInt(page) < totalPage) {
                next = (parseInt(page) + 1).toString();
            }

            return Response.success(data, next);
        }
    }
    return null;
}