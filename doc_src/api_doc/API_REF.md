Blend4Web API Reference
=======================

**Introduction**

Use `b4w.require(module_name, module_function)` to import module.

**Basic usage example:**

    // check if module exists
    if (b4w.module_check("my_module"))
        throw "Failed to register module: my_module";
    
    // register my_module
    b4w.register("my_module", function(exports, require) {
        
        // import module "version"
        var m_version = require("version");
        
        // export print_build_date() from module "my_module"
        exports.print_build_date = function() {
            // exec function date() from module "version"
            console.log("Engine build date: " + m_version.date());
        }
    });
    
    // import module "my_module"
    var m_my_module = b4w.require("my_module");
    
    // exec function print_build_date() from module "my_module"
    m_my_module.print_build_date();
