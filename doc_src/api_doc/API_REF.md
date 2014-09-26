Blend4Web API Reference
=======================

**Introduction**

Use `b4w.require(module_name, module_function)` to import module.

**Basic usage example**

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

**Type system**

The engine API accepts only the types explicitly specified in the reference.
Cases with multiple allowed types are documented explicitly. A variable type
can be checked with the following code:

    VAR instanceof TYPE

e.g:

    obj instanceof Object -> true

Keep in mind, that any object may have several ancestors. In such cases the more
specific type takes precedence.

e.g:

    var vector = new Float32Array(3);

    vector instanceof Object;       // true
    vector instanceof Float32Array; // true, so type of the vector is Float32Array

**Object**

To prevent confusion between a 3D object rendered on the scene and
some other JavaScript Object the former is always referenced as "Object ID" in
the documentation. Currently, "Object ID" is a JavaScript Object, but it's strongly
discouraged to access it by its properties. Instead, you should always rely on the
engine's API to manipulate your 3D objects.
