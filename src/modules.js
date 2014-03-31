//"use strict";

b4w = {};

b4w.module = {};

b4w.register = function(module_id, fun) {
    var module = b4w.module;

    if (module[module_id])
        throw new Error("Module \"" + module_id + "\" already registered");

    module[module_id] = fun;
};

b4w.require = function(module_id) {
    var module = b4w.module;
    var require = b4w.require;

    var mod = module[module_id];
    if (!mod)
        throw new Error("Module \"" + module_id + "\" not found");
    
    if (!mod._compiled) {
        mod._compiled = {};
        mod(mod._compiled, require);
    }

    return mod._compiled;
};

b4w.module_check = function(module_id) {
    if (b4w.module[module_id])
        return true;
    else
        return false;
}
