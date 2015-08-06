Blend4Web API Reference
=======================

**Adding Modules**

Use `b4w.register(module_name, module_body)` to create your own modules.

Example - Registering a Module:

    // check if the module already exists
    if (b4w.module_check("my_module"))
        throw "Failed to register my_module";
    
    // register my_module
    b4w.register("my_module", function(exports, require) {
        
        // import a Blend4Web module
        var m_version = require("version");
        
        // create and export your own method
        exports.print_build_date = function() {

            // use a Blend4Web method
            console.log("Engine build date: " + m_version.date());
        }
    });
    

Example - Using the Registered Module:

    // import the module
    var m_my_module = b4w.require("my_module");
    
    // use a module's method
    m_my_module.print_build_date();


<!---

**Type System**

The engine API accepts only the types explicitly specified in the reference.
Cases with multiple allowed types are documented explicitly. A type of a variable
can be checked with the following code:

    VAR instanceof TYPE

e.g:

    obj instanceof Object -> true

Keep in mind, that an object may have several ancestors. In such cases the more
specific type takes precedence.

e.g:

    var vector = new Float32Array(3);

    vector instanceof Object;       // true
    vector instanceof Float32Array; // true, so the type of the vector is Float32Array


-->
