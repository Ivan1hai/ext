load('config.js');

function execute(url) {
    let response = httpGet(url);
    if (response && response.ok) {
        let doc = response.html();
        if (doc) {
            let content = doc.select("div.read-content");
            if (content && content.html()) {
                // Xóa quảng cáo nếu có
                content.select("#user_ad").remove();
                content.select(".user_img_ad").remove();
                content.select(".user_text_ad").remove();

                let htm = content.html();
                htm = htm.replace(/\&nbsp;/g, "");
                return Response.success(htm);
            }
        }
    }
    return null;
}