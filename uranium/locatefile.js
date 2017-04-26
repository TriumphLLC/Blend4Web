Module['locateFile'] = is_worker_env() ? null : function() {
    var worker_namespace = b4w.get_namespace(require);

    for (var i = 0; i < b4w.worker_namespaces.length; i+=2)
        if (b4w.worker_namespaces[i+1] == worker_namespace) {
            var main_namespace = b4w.worker_namespaces[i];
            var m_cfg_main = b4w.require("config", main_namespace);
            return m_cfg_main.get("physics_uranium_bin");
        }

    return "NOT_FOUND";
}