Blend4Web API Reference
=======================

**Intro**

This API reference is intended for programmers writing Blend4Web applications. It contains information on Blend4Web modules, their methods and members (variables and constants) as well as global `b4w` methods and type definitions.

For more general documentation please check out the [user manual](https://www.blend4web.com/doc/en/index.html).

**Using modules**

Use `b4w.require(module_name)` to import a module into your application.

Example - printing Blend4Web version using the `version` module:

    var m_version = b4w.require("version");
    console.log(m_version.version_str());

**Adding Custom Modules**

Use `b4w.register(module_name, module_body)` to create your own modules.

Example - registering a module:

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
    

Example - using the registered module:

    // import the module
    var m_my_module = b4w.require("my_module");
    
    // use a module's method
    m_my_module.print_build_date();


**Type System**

The engine API accepts only the types explicitly specified in the reference, however type checking capabilities are limited. Passing parameters with incorrect types may lead to difficult-to-detect errors and/or performance degradation. Cases with multiple allowed types are rare and documented as such.

In most cases you cannot create objects of the chosen type directly by using the `new` operator. For such cases the engine provides explicit constructors, e.g use `vec3.create()` to create 3D vectors.

**Namespaces**

To allow several instances of different Blend4Web applications runnning concurrently the engine provides namespaces. To import a module inside some namespace specify its name as a second param to `b4w.require` method.

Example - using two namespaces:

    // import to "namespace1"
    var m_my_mod_ns1 = b4w.require("my_module", "namespace1");

    // import to "namespace2"
    var m_my_mod_ns2 = b4w.require("my_module", "namespace2");

In most cases it's sufficient to specify a namespace name only for the parent modules of your applications. Namespaces inside these modules will be resolved automatically.
