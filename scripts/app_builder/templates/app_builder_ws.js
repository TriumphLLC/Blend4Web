function b4w_app_builder_run() {
    var state = "pending";
    var b4w_build_engine = null;
    var b4w_build_html = null;
    var b4w_reload_on_update = null;
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        var b = scripts[i]
        if (src.indexOf("/scripts/app_builder/templates/app_builder_ws.js") >= 0) {
            b4w_build_engine = scripts[i].attributes["b4w-build-engine"].value;
            b4w_build_html = scripts[i].attributes["b4w-build-html"].value;
            if (scripts[i].attributes["b4w-reload-on-update"])
                b4w_reload_on_update = scripts[i].attributes["b4w-reload-on-update"].value;
            break;
        }
    }
    var send_get_state = function() {
        socket.send(JSON.stringify(
        {
            type: "app",
            id: window.location.pathname.substr(1),
            cmd: "get_state",
            build_html: b4w_build_html,
            build_engine: b4w_build_engine
        }))
    }
    var ws_proto = "ws:";
    if (location.protocol == "https:")
        ws_proto = "wss:";
    var socket = new WebSocket(ws_proto + "//" + window.location.host + "/app_builder/");
    socket.onopen = function() {
        setInterval(send_get_state, 2000);
        send_get_state();
    };

    socket.onclose = function (event) {
    
    };

    socket.onmessage = function (event) {
        msg = JSON.parse(event.data);
        if (msg.type == "server") {
            var reload = false;
            if (state == "pending" && msg.state != "pending" && b4w_reload_on_update)
                window.location.reload();
            if (msg.state)
                state = msg.state;
        }
    };

    socket.onerror = function (error) {
        console.log("Error " + error.message);
    };
}

b4w_app_builder_run();