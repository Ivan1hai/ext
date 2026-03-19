function stvGetGlobalObject() {
    if (typeof globalThis !== "undefined") return globalThis;
    try {
        return Function("return this")();
    } catch (_) {
        return {};
    }
}

function stvAtobFallback(input) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var str = stvTrim(String(input)).replace(/[^A-Za-z0-9\+\/\=]/g, "");
    var output = "";
    var i = 0;

    while (i < str.length) {
        var e1 = chars.indexOf(str.charAt(i++));
        var e2 = chars.indexOf(str.charAt(i++));
        var e3 = chars.indexOf(str.charAt(i++));
        var e4 = chars.indexOf(str.charAt(i++));

        if (e1 < 0 || e2 < 0) continue;

        var c1 = (e1 << 2) | (e2 >> 4);
        var c2 = ((e2 & 15) << 4) | (e3 >> 2);
        var c3 = ((e3 & 3) << 6) | e4;

        output += String.fromCharCode(c1);
        if (e3 !== 64 && e3 >= 0) output += String.fromCharCode(c2);
        if (e4 !== 64 && e4 >= 0) output += String.fromCharCode(c3);
    }

    return output;
}

function stvBtoaFallback(input) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var str = input === null || typeof input === "undefined" ? "" : String(input);
    var output = "";
    var i = 0;

    while (i < str.length) {
        var c1 = str.charCodeAt(i++) & 255;
        var c2 = i < str.length ? (str.charCodeAt(i++) & 255) : NaN;
        var c3 = i < str.length ? (str.charCodeAt(i++) & 255) : NaN;

        var e1 = c1 >> 2;
        var e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : (c2 >> 4));
        var e3 = isNaN(c2) ? 64 : (((c2 & 15) << 2) | (isNaN(c3) ? 0 : (c3 >> 6)));
        var e4 = isNaN(c3) ? 64 : (c3 & 63);

        output += chars.charAt(e1)
            + chars.charAt(e2)
            + chars.charAt(e3)
            + chars.charAt(e4);
    }

    return output;
}

function stvDecodeBase64Utf8(base64Text) {
    var input = stvTrim(base64Text).replace(/\s+/g, "");
    if (!input) return "";

    var binary = "";
    var g = stvGetGlobalObject();

    try {
        binary = (g && typeof g.atob === "function") ? g.atob(input) : stvAtobFallback(input);
    } catch (_) {
        return "";
    }

    try {
        return decodeURIComponent(escape(binary));
    } catch (_) {
        return binary;
    }
}

function stvDecodeGrantHtml(htmlText) {
    var text = stvTrim(htmlText);
    if (!text) return "";

    text = text.replace(/^\s*<html[^>]*>\s*<head[^>]*>[\s\S]*?<\/head>\s*<body[^>]*>/i, "");
    text = text.replace(/<\/body>\s*<\/html>\s*$/i, "");

    text = text
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

    return text;
}

function stvLooksLikeGrantScript(text) {
    var sample = stvTrim(text);
    if (!sample) return false;
    if (sample.indexOf("(()=>") === 0 || sample.indexOf("(() =>") === 0) return true;
    if (sample.indexOf("app.reader") >= 0) return true;
    if (sample.indexOf("chapterkey") >= 0) return true;
    return false;
}

function stvFetchGrantText(url, options) {
    try {
        var response = fetch(url, options || {});
        var text = "";

        if (response && typeof response.html === "function") {
            try {
                var fromHtml = stvDecodeGrantHtml(response.html());
                if (stvLooksLikeGrantScript(fromHtml)) {
                    text = fromHtml;
                }
            } catch (_) {
                text = "";
            }
        }

        if (!text && response && typeof response.base64 === "function") {
            try {
                var fromBase64 = stvDecodeBase64Utf8(response.base64());
                if (stvLooksLikeGrantScript(fromBase64)) {
                    text = fromBase64;
                }
            } catch (_) {
                text = "";
            }
        }

        if (!text && response && typeof response.text === "function") {
            text = response.text();
        }

        return {
            ok: !!(response && response.ok),
            status: response ? response.status : 0,
            text: text,
            headers: response ? response.headers : null
        };
    } catch (e) {
        return {
            ok: false,
            status: 0,
            text: "",
            headers: null,
            error: e
        };
    }
}

function stvSortQuery(params) {
    var keys = [];
    for (var k in params) {
        if (params.hasOwnProperty(k)) keys.push(k);
    }

    keys.sort();

    var out = "";
    for (var i = 0; i < keys.length; i++) {
        out += keys[i] + "=" + params[keys[i]] + "&";
    }

    return out;
}

function stvEscapeHtml(text) {
    var value = text === null || typeof text === "undefined" ? "" : String(text);
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Decode STV webfont obfuscated glyphs in chapter content.
function giaiMaChuoi(input) {
    var text = input === null || typeof input === "undefined" ? "" : String(input);
    if (!text) return "";

    var mapping_list = [
        [0xE05F, "3"], [0xE063, "z"], [0xE06B, "K"], [0xE089, "l"],
        [0xE0D5, "S"], [0xE0D6, "T"], [0xE101, "P"], [0xE184, "O"],
        [0xE1AD, "e"], [0xE1B4, "k"], [0xE1B8, "f"], [0xE1BF, "n"],
        [0xE1C0, "Y"], [0xE1C1, "1"], [0xE1E4, "M"], [0xE215, "C"],
        [0xE218, "A"], [0xE248, "v"], [0xE257, "G"], [0xE2C5, "s"],
        [0xE2C7, "t"], [0xE30F, "V"], [0xE311, "u"], [0xE37C, "R"],
        [0xE39B, "X"], [0xE3B0, "l"], [0xE3B7, "B"], [0xE41B, "o"],
        [0xE41C, "H"], [0xE427, "J"], [0xE46A, "b"], [0xE477, "y"],
        [0xE4AE, "2"], [0xE4D3, "5"], [0xE4DB, "L"], [0xE4DF, "N"],
        [0xE550, "E"], [0xE557, "h"], [0xE571, "F"], [0xE5C9, "8"],
        [0xE5D1, "x"], [0xE5DC, "m"], [0xE5E1, "9"], [0xE5FF, "a"],
        [0xE603, "U"], [0xE62A, "w"], [0xE63E, "D"], [0xE648, "6"],
        [0xE6A4, "q"], [0xE6A5, "c"], [0xE6D7, "W"], [0xE6F5, "g"],
        [0xE735, "Z"], [0xE762, "r"], [0xE77A, "d"], [0xE77E, "4"],
        [0xE7C7, "Q"], [0xE7E5, "0"], [0xE7F6, "7"], [0xE95D, "9"],
        [0xE9A8, "y"], [0xE9CC, "P"], [0xE9D5, "o"], [0xE9F8, "O"],
        [0xEA15, "e"], [0xEA24, "N"], [0xEA2E, "R"], [0xEA2F, "C"],
        [0xEA43, "4"], [0xEA47, "l"], [0xEA75, "M"], [0xEA76, "H"],
        [0xEA77, "u"], [0xEAA1, "k"], [0xEAA4, "a"], [0xEAA5, "x"],
        [0xEAA6, "z"], [0xEAB4, "t"], [0xEAC5, "w"], [0xEAE3, "A"],
        [0xEB06, "s"], [0xEB0E, "f"], [0xEB75, "h"], [0xEB85, "X"],
        [0xEC6D, "g"], [0xEC75, "d"], [0xEC85, "n"], [0xECB4, "S"],
        [0xECD4, "L"], [0xECE6, "E"], [0xED07, "V"], [0xED35, "l"],
        [0xED37, "J"], [0xED48, "W"], [0xED64, "5"], [0xED71, "2"],
        [0xED72, "v"], [0xEDEB, "Y"], [0xEDED, "m"], [0xEE09, "Q"],
        [0xEE69, "b"], [0xEE8D, "0"], [0xEEBB, "F"], [0xEECC, "B"],
        [0xEECF, "c"], [0xEEDA, "1"], [0xEEDB, "D"], [0xEF26, "K"],
        [0xEF37, "6"], [0xEF5A, "U"], [0xEF61, "G"], [0xEF91, "8"],
        [0xEF94, "T"], [0xEFD7, "Z"], [0xEFEE, "3"], [0xF00A, "q"],
        [0xF073, "7"], [0xF0BA, "r"], [0xF8FF, ""]
    ];

    var mapping_dict = {};
    for (var i = 0; i < mapping_list.length; i++) {
        var code = String.fromCharCode(mapping_list[i][0]);
        mapping_dict[code] = mapping_list[i][1];
    }

    var output = "";
    for (var j = 0; j < text.length; j++) {
        var ch = text.charAt(j);
        output += mapping_dict.hasOwnProperty(ch) ? mapping_dict[ch] : ch;
    }
    return output;
}

function stvLooksLikeInterlinearHtml(text) {
    var sample = stvTrim(text);
    if (!sample) return false;
    return /<i\b[^>]*\b(?:t|v|p)\s*=\s*['"][^'"]*['"][^>]*>/i.test(sample);
}

function stvNormalizeInterlinearChapter(rawText) {
    var text = rawText === null || typeof rawText === "undefined" ? "" : String(rawText);
    if (!text) return "";

    var marker = "__STV_I_GAP__";

    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    text = text.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/br\s*>/gi, "\n");

    // Remove visual line breaks right before punctuation after an <i> block.
    text = text.replace(/<\/i>\s*\n+\s*(?=[,.;:!?%\)\]\}\u3002\uff0c\u3001\uff01\uff1f\uff1b\uff1a\u201d\u2019\u300d\u300f\u3011\u300b])/gi, "</i>");

    // Consecutive <i> blocks should have one space between them.
    text = text.replace(/<\/i>\s*<i\b/gi, "</i>" + marker + "<i");

    // Keep only the display text of each <i> block.
    text = text.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, "$1");

    // Preserve coarse block boundaries before stripping the rest of HTML.
    text = text.replace(/<\/?(p|div|article|section|li|tr|h[1-6]|blockquote|ul|ol)[^>]*>/gi, "\n");
    text = text.replace(/<[^>]+>/g, "");
    text = text.replace(/[<>]/g, "");

    text = text
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&");

    text = text.replace(new RegExp(marker, "g"), " ");

    text = text.replace(/[\t\f\v ]+/g, " ");
    text = text.replace(/ +([,.;:!?%\)\]\}\u3002\uff0c\u3001\uff01\uff1f\uff1b\uff1a\u201d\u2019\u300d\u300f\u3011\u300b])/g, "$1");
    text = text.replace(/\n+([,.;:!?%\)\]\}\u3002\uff0c\u3001\uff01\uff1f\uff1b\uff1a\u201d\u2019\u300d\u300f\u3011\u300b])/g, "$1");
    text = text.replace(/[ ]*\n[ ]*/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");

    text = stvTrim(text);
    if (!text) return "";

    return text.replace(/\n/g, "<br>");
}

function stvNormalizeChapterHtml(host, base, rawContent) {
    var hostKey = stvTrim(host).toLowerCase();
    var text = rawContent === null || typeof rawContent === "undefined" ? "" : String(rawContent);
    if (!text) return "";

    if (hostKey === "fanqie") {
        text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
        text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
        text = text.replace(/<\/?article>/gi, "");
        text = text.replace(/\sidx=\"\d+\"/g, "");
        if (stvLooksLikeInterlinearHtml(text)) {
            return stvNormalizeInterlinearChapter(text);
        }
        return text;
    }

    if (hostKey === "sangtac" || hostKey === "dich") {
        text = giaiMaChuoi(text);
        if (stvLooksLikeInterlinearHtml(text)) {
            return stvNormalizeInterlinearChapter(text);
        }
        var isHtml = /<\w+[^>]*>/.test(text);
        if (!isHtml) {
            text = stvEscapeHtml(text)
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .replace(/\n/g, "<br>");
        }
        return text;
    }

    if (!/<\w+[^>]*>/.test(text)) {
        return stvEscapeHtml(text)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n/g, "<br>");
    }

    if (stvLooksLikeInterlinearHtml(text)) {
        return stvNormalizeInterlinearChapter(text);
    }

    return text;
}

function stvCookieObjectFromText(cookieText) {
    var raw = stvNormalizeCookieText(cookieText);
    if (!raw) return null;

    var cookieObj = {};
    var parts = raw.split(";");
    var hasCookie = false;

    for (var i = 0; i < parts.length; i++) {
        var item = stvTrim(parts[i]);
        if (!item) continue;

        var eq = item.indexOf("=");
        if (eq <= 0) continue;

        var key = stvTrim(item.substring(0, eq));
        var value = stvTrim(item.substring(eq + 1));
        if (!key || !value) continue;

        cookieObj[key] = value;
        hasCookie = true;
    }

    return hasCookie ? cookieObj : null;
}

function stvExtractChapterKeyDirect(grantBody, readcontextid) {
    var code = stvTrim(grantBody);
    if (!code) {
        return {
            chapterkey: "",
            readcontextid: stvTrim(readcontextid),
            error: ""
        };
    }

    try {
        var g = stvGetGlobalObject();
        var cookieText = "mac_tt=true";
        if (readcontextid) cookieText += "; readcontextid=" + readcontextid;

        var sandboxWindow = {};
        var sandboxDocument = {
            hidden: false,
            cookie: cookieText,
            getElementById: function () { return null; },
            createElement: function () {
                return {
                    innerHTML: "",
                    appendChild: function () {}
                };
            },
            body: {
                appendChild: function () {}
            }
        };

        sandboxWindow.window = sandboxWindow;
        sandboxWindow.self = sandboxWindow;
        sandboxWindow.globalThis = sandboxWindow;
        sandboxWindow.document = sandboxDocument;
        sandboxWindow.navigator = {};
        sandboxWindow.localStorage = {
            getItem: function () { return null; },
            setItem: function () {},
            removeItem: function () {}
        };
        sandboxWindow.sessionStorage = {
            getItem: function () { return null; },
            setItem: function () {},
            removeItem: function () {}
        };
        sandboxWindow.app = { tcYCI: true, reader: {} };
        sandboxWindow.Capacitor = {};
        sandboxWindow.UWNgB = true;
        sandboxWindow.atob = g && typeof g.atob === "function"
            ? function (input) { return g.atob(String(input)); }
            : stvAtobFallback;
        sandboxWindow.btoa = g && typeof g.btoa === "function"
            ? function (input) { return g.btoa(String(input)); }
            : stvBtoaFallback;

        var runner = new Function(
            "window",
            "document",
            "navigator",
            "localStorage",
            "sessionStorage",
            "app",
            "Capacitor",
            "UWNgB",
            "atob",
            "btoa",
            "self",
            "globalThis",
            code + "; return {chapterkey:String((app&&app.reader&&app.reader.chapterkey)||''), cookie:String((document&&document.cookie)||'')};"
        );

        var result = runner.call(
            sandboxWindow,
            sandboxWindow,
            sandboxDocument,
            sandboxWindow.navigator,
            sandboxWindow.localStorage,
            sandboxWindow.sessionStorage,
            sandboxWindow.app,
            sandboxWindow.Capacitor,
            sandboxWindow.UWNgB,
            sandboxWindow.atob,
            sandboxWindow.btoa,
            sandboxWindow.self,
            sandboxWindow.globalThis
        ) || {};

        var chapterkey = stvTrim(result.chapterkey);
        var cookieOut = stvTrim(result.cookie);
        var nextReadContextId = stvFirst(stvFindReadContextId(cookieOut), readcontextid);

        return {
            chapterkey: chapterkey,
            readcontextid: nextReadContextId,
            error: chapterkey ? "" : "Grantcontext khÃ´ng tráº£ vá» chapterkey."
        };
    } catch (e) {
        return {
            chapterkey: "",
            readcontextid: stvTrim(readcontextid),
            error: stvTrim(e && e.message ? e.message : e)
        };
    }
}

function stvExtractChapterKeyByBrowser(base, host, bookid, grantBody, readcontextid, launchUrl) {
    var code = stvTrim(grantBody);
    if (!code && (!host || !bookid)) {
        return {
            chapterkey: "",
            error: ""
        };
    }

    if (typeof Engine === "undefined" || !Engine || typeof Engine.newBrowser !== "function") {
        return {
            chapterkey: "",
            error: "Engine.newBrowser không khả dụng"
        };
    }

    var browser = null;
    var baseUrl = stvBuildUrl(base, "/");
    var targetUrl = stvTrim(launchUrl);
    var grantPath = "/io/grantcontext/context?hostid=" + stvEncode(host) + "&bookid=" + stvEncode(bookid);
    if (!(targetUrl.indexOf("http://") === 0 || targetUrl.indexOf("https://") === 0)) {
        targetUrl = baseUrl;
    }
    var extraCookie = "mac_tt=true";
    if (readcontextid) extraCookie += "; readcontextid=" + readcontextid;
    var mergedCookie = stvBuildCookie(extraCookie, base);

    try {
        browser = Engine.newBrowser();
        if (!browser || typeof browser.callJs !== "function") {
            return {
                chapterkey: "",
                error: "Browser API không khả dụng"
            };
        }

        if (typeof browser.setUserAgent === "function") {
            browser.setUserAgent(STV_CONFIG.USER_AGENT);
        }

        if (typeof browser.overrideCookie === "function") {
            var cookieObj = stvCookieObjectFromText(mergedCookie);
            if (cookieObj) {
                browser.overrideCookie(cookieObj);
            }
        }

        var shell = "<html><head><meta charset='utf-8'></head><body><pre id='stv_chapterkey_out'></pre></body></html>";
        if (typeof browser.launch === "function") {
            browser.launch(targetUrl, 12000);
        } else if (typeof browser.loadHtml === "function") {
            browser.loadHtml(baseUrl, shell);
        } else {
            return {
                chapterkey: "",
                error: "Browser API không khả dụng"
            };
        }

        var keyVar = "stv_chapterkey_" + Math.random().toString(36).substring(2);
        var errVar = "stv_chapterkey_err_" + Math.random().toString(36).substring(2);
        var rcidVar = errVar + "_rcid";
        var runScript = "window.window=window;"
            + "window.globalThis=window;"
            + "window.Capacitor=window.Capacitor||{};"
            + "window.UWNgB=true;"
            + "window.document=window.document||{}; window.document.hidden=false;"
            + "window.navigator=window.navigator||{};"
            + "window.localStorage=window.localStorage||{getItem:function(){return null;},setItem:function(){},removeItem:function(){}};"
            + "window.sessionStorage=window.sessionStorage||{getItem:function(){return null;},setItem:function(){},removeItem:function(){}};"
            + "window.app=window.app||{}; window.app.tcYCI=true; window.app.reader=window.app.reader||{};"
            + "try{document.cookie=" + JSON.stringify("mac_tt=true; path=/") + ";}catch(_){ }"
            + (readcontextid
                ? "try{document.cookie=" + JSON.stringify("readcontextid=" + readcontextid + "; path=/") + ";}catch(_){ }"
                : "")
            + "var __write=function(__name,__value){"
            + "try{if(typeof Cache!=='undefined'&&Cache&&typeof Cache.putVariable==='function'){Cache.putVariable(__name,String(__value||''));}}catch(_){}"
            + "};"
            + "var __grantCode=" + JSON.stringify(code) + ";"
            + "var __err='';"
            + "try{"
            + "if(!document.getElementById('stv_chapterkey_out')){"
            + "var __host=document.createElement('div');"
            + "__host.innerHTML='<pre id=\"stv_chapterkey_out\"></pre><pre id=\"stv_chapterkey_err\"></pre><pre id=\"stv_chapterkey_rcid\"></pre>';"
            + "if(document.body&&document.body.appendChild){document.body.appendChild(__host);}"
            + "}"
            + "}catch(_){}"
            + "if(!__grantCode){"
            + "try{"
            + "var __xhr=new XMLHttpRequest();"
            + "__xhr.open('GET'," + JSON.stringify(grantPath) + ",false);"
            + "__xhr.setRequestHeader('x-stv-transport','app');"
            + "__xhr.setRequestHeader('x-requested-with','com.sangtacviet.mobilereader');"
            + "__xhr.setRequestHeader('Accept','*/*');"
            + "__xhr.send(null);"
            + "if(__xhr.status>=200&&__xhr.status<300){__grantCode=String(__xhr.responseText||'');}"
            + "else{__err='grant:'+String(__xhr.status||0);}"
            + "}catch(__ge){__err=String(__ge&&__ge.message?__ge.message:__ge);}"
            + "}"
            + "try{eval(__grantCode);}"
            + "catch(e){__err=(__err?(__err+'|'):'')+String(e&&e.message?e.message:e);};"
            + "var __k='';"
            + "try{__k=String((window.app&&window.app.reader&&window.app.reader.chapterkey)||'');}"
            + "catch(e2){__err=__err+'|read:'+String(e2&&e2.message?e2.message:e2);}"
            + "var __rc='';"
            + "try{var __m=String(document.cookie||'').match(/(?:^|;\\s*)readcontextid=([^;]+)/i); __rc=__m&&__m[1]?String(__m[1]):'';}"
            + "catch(_){__rc='';}"
            + "try{document.getElementById('stv_chapterkey_out').innerText=(__k?('__KEY__:'+__k):('__ERR__:'+__err));}catch(_){ }"
            + "try{document.getElementById('stv_chapterkey_err').innerText=String(__err||'');}catch(_){ }"
            + "try{document.getElementById('stv_chapterkey_rcid').innerText=String(__rc||'');}catch(_){ }"
            + "__write(" + JSON.stringify(keyVar) + ", __k);"
            + "__write(" + JSON.stringify(errVar) + ", __err);"
            + "__write(" + JSON.stringify(rcidVar) + ", __rc);";

        var doc = browser.callJs(runScript, 6000);
        var output = "";
        var chapterkey = "";
        var error = "";
        var browserReadContextId = "";

        if (typeof browser.getVariable === "function") {
            try {
                chapterkey = stvTrim(browser.getVariable(keyVar));
            } catch (_) {
                chapterkey = "";
            }

            try {
                error = stvTrim(browser.getVariable(errVar));
            } catch (_) {
                error = "";
            }

            try {
                browserReadContextId = stvTrim(browser.getVariable(errVar + "_rcid"));
            } catch (_) {
                browserReadContextId = "";
            }
        }

        try {
            var outNode = doc ? doc.select("#stv_chapterkey_out").first() : null;
            output = outNode ? stvTrim(outNode.text()) : "";
        } catch (_) {
            output = "";
        }

        if (typeof sleep === "function") {
            try {
                sleep(150);
            } catch (_) {
                // Ignore sleep errors.
            }
        }

        try {
            var liveDoc = browser.html();
            if (liveDoc) {
                if (!output) {
                    try {
                        var liveOutNode = liveDoc.select("#stv_chapterkey_out").first();
                        output = liveOutNode ? stvTrim(liveOutNode.text()) : output;
                    } catch (_) {}
                }

                if (!error) {
                    try {
                        var liveErrNode = liveDoc.select("#stv_chapterkey_err").first();
                        error = liveErrNode ? stvTrim(liveErrNode.text()) : error;
                    } catch (_) {}
                }

                if (!browserReadContextId) {
                    try {
                        var liveRcidNode = liveDoc.select("#stv_chapterkey_rcid").first();
                        browserReadContextId = liveRcidNode ? stvTrim(liveRcidNode.text()) : browserReadContextId;
                    } catch (_) {}
                }
            }
        } catch (_) {
            // Ignore browser.html() errors and keep previous fallbacks.
        }

        if (chapterkey) {
            return {
                chapterkey: chapterkey,
                readcontextid: browserReadContextId,
                error: ""
            };
        }

        if (output.indexOf("__KEY__:") === 0) {
            return {
                chapterkey: stvTrim(output.substring(8)),
                readcontextid: browserReadContextId,
                error: ""
            };
        }

        if (output.indexOf("__ERR__:") === 0) {
            return {
                chapterkey: "",
                readcontextid: browserReadContextId,
                error: stvFirst(error, stvTrim(output.substring(8)))
            };
        }

        return {
            chapterkey: "",
            readcontextid: browserReadContextId,
            error: stvFirst(error, stvTrim(output), "Grantcontext không trả về chapterkey.")
        };
    } catch (e) {
        return {
            chapterkey: "",
            readcontextid: "",
            error: stvTrim(e && e.message ? e.message : e)
        };
    } finally {
        try {
            if (browser && typeof browser.close === "function") browser.close();
        } catch (_) {
            // Ignore browser close errors.
        }
    }
}

function stvGrantContext(base, host, bookid, cid, status) {
    var path = "/io/grantcontext/context?hostid=" + stvEncode(host) + "&bookid=" + stvEncode(bookid);
    var url = stvBuildUrl(base, path);
    var referer = cid
        ? stvBuildChapterUrl(base, host, bookid, cid, status)
        : stvBuildBookUrl(base, host, bookid, status);
    function requestGrant() {
        var cookie = stvBuildCookie("mac_tt=true", base);
        var requestHeaders = {
            "Referer": referer
        };
        if (cookie) requestHeaders["Cookie"] = cookie;

        return stvFetchGrantText(url, {
            method: "GET",
            headers: stvHeaders(requestHeaders)
        });
    }

    var result = requestGrant();
    if (stvIsCloudflareBlockedResponse(result)) {
        var synced = stvSyncCloudflareCookie(base, referer);
        if (synced) {
            result = requestGrant();
        }
    }

    if (!result.ok || !result.text) {
        var blocked = stvIsCloudflareBlockedResponse(result);
        return {
            chapterkey: "",
            readcontextid: "",
            grantErr: blocked
                ? "Bị Cloudflare chặn khi xin quyền đọc chương. Đã thử tự đồng bộ cookie nhưng chưa thành công."
                : "Không tải được grantcontext."
        };
    }

    var setCookie = stvExtractSetCookie(result.headers);
    var readcontextid = stvFindReadContextId(setCookie);
    var browserResult = stvExtractChapterKeyByBrowser(base, host, bookid, result.text, readcontextid, referer);
    readcontextid = stvFirst(browserResult.readcontextid, readcontextid);

    return {
        chapterkey: stvTrim(browserResult.chapterkey),
        readcontextid: readcontextid,
        grantErr: stvTrim(browserResult.error)
    };
}
