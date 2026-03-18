function execute(key, page) {
    key = (key || "").trim();
    if (!key) return Response.success([], "");

    var targetPage = parseTargetPage(page);
    var browser = Engine.newBrowser();
    var doc = null;

    try {
        doc = loadSearchPage(browser, key, targetPage);
    } catch (e) {
        try {
            browser.close();
        } catch (closeError) {}
        return Response.success([], "");
    }

    try {
        var data = parseBooks(doc);
        var next = parseNextPage(doc, targetPage);
        return Response.success(data, next);
    } finally {
        browser.close();
    }
}

function parseTargetPage(page) {
    var value = parseInt(page, 10);
    if (isNaN(value) || value < 1) return 1;
    return value;
}

function loadSearchPage(browser, key, targetPage) {
    browser.launch("https://wap.faloo.com/SearchIndex.html", 8000);
    browser.callJs(
        "var form=document.forms[0];" +
        "var input=document.getElementById('txt_search');" +
        "if(input){input.value=" + JSON.stringify(key) + ";}" +
        "if(form){form.submit();}",
        500
    );
    browser.waitUrl(".*?/search_\\d+_1\\.html.*", 12000);
    sleep(300);

    var currentPage = 1;
    while (currentPage < targetPage) {
        var nextPage = currentPage + 1;
        browser.callJs(buildNextPageScript(nextPage), 500);
        browser.waitUrl(".*?/search_\\d+_" + nextPage + "\\.html.*", 12000);
        sleep(300);
        currentPage = nextPage;
    }

    return browser.html();
}

function buildNextPageScript(nextPage) {
    return (
        "(function(){" +
        "var links=document.querySelectorAll('.pageliste_body a');" +
        "for(var i=0;i<links.length;i++){" +
        "var href=links[i].getAttribute('href')||'';" +
        "if(/search_\\\\d+_" + nextPage + "\\\\.html/.test(href)){links[i].click();return;}" +
        "}" +
        "if(links.length>0){links[links.length-1].click();}" +
        "})();"
    );
}

function parseBooks(doc) {
    var items = doc.select(".novelList li");
    var data = [];

    for (var i = 0; i < items.size(); i++) {
        var item = items.get(i);
        var titleLinks = item.select(".bl_r1_tit a");
        var introLinks = item.select(".bl_r1_into a");
        var authorLinks = item.select(".nl_r1_author a");
        var metaBlocks = item.select(".nl_r2");
        var coverImages = item.select("img.cover");
        var titleNode = titleLinks.size() > 0 ? titleLinks.first() : null;
        var introNode = introLinks.size() > 0 ? introLinks.first() : null;
        var authorNode = authorLinks.size() > 0 ? authorLinks.get(0) : null;
        var categoryNode = authorLinks.size() > 1 ? authorLinks.get(1) : null;
        var metaNode = metaBlocks.size() > 0 ? metaBlocks.first() : null;
        var coverNode = coverImages.size() > 0 ? coverImages.first() : null;
        var name = titleNode ? cleanText(titleNode.text()) : "";
        var link = titleNode ? normalizeUrl(titleNode.attr("href")) : "";
        var cover = coverNode ? normalizeUrl(coverNode.attr("src")) : "";
        var parts = [];

        if (!name || !link) continue;

        if (authorNode) {
            var author = cleanText(authorNode.text());
            if (author) parts.push(author);
        }

        if (categoryNode) {
            var category = cleanText(categoryNode.text());
            if (category) parts.push(category);
        }

        if (metaNode) {
            var meta = cleanText(metaNode.text());
            if (meta) parts.push(meta);
        }

        if (parts.length === 0 && introNode) {
            var intro = cleanText(introNode.text());
            if (intro) parts.push(intro);
        }

        data.push({
            name: name,
            link: link,
            cover: cover,
            description: parts.join(" - "),
            host: "https://b.faloo.com"
        });
    }

    return data;
}

function parseNextPage(doc, currentPage) {
    var next = "";
    var pages = doc.select(".pageliste_body a");

    for (var i = 0; i < pages.size(); i++) {
        var href = pages.get(i).attr("href") || "";
        var match = href.match(/search_\d+_(\d+)\.html/);
        if (!match) continue;

        var nextPage = parseInt(match[1], 10);
        if (nextPage > currentPage && (next === "" || nextPage < parseInt(next, 10))) {
            next = String(nextPage);
        }
    }

    return next;
}

function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(url) {
    if (!url) return "";
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) return url;
    if (url.charAt(0) === "/") return "https://wap.faloo.com" + url;
    return "https://wap.faloo.com/" + url;
}
