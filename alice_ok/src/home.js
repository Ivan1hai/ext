function execute() {
    return Response.success([
        { title: "最新小说", input: "/all/order/update_time+desc.html", script: "source.js" },
        { title: "原创专区", input: "/original.html", script: "source.js" },
        { title: "本日排行", input: "/other/rank_hits/order/hits_day.html", script: "source.js" },
        { title: "本周排行", input: "/other/rank_hits/order/hits_week.html", script: "source.js" },
        { title: "本月排行", input: "/other/rank_hits/order/hits_month.html", script: "source.js" },
        { title: "总排行", input: "/other/rank_hits/order/hits.html", script: "source.js" },

    ]);
}