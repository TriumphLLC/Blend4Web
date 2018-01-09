.. _developers_advanced:

*********************
For Engine Developers
*********************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

.. _coding_style:

Coding Style
============

This engine uses structural programming. The code is organized in modules. OOP methods are not used, classes are not defined, inheritance is not performed and so on. 

The `K&R style <http://en.wikipedia.org/wiki/1_true_brace_style#K.26R_style>`_ is used except for the fact that the opening bracket for a compound operator is placed on the same line, for example:

.. code-block:: javascript

    function foo_bar() {
        // ...
    }

    if (a > b) {
        // ...
    } 

4 spaces are used for indentation (no tabs allowed).

Examples
--------

The underscore symbol is used in function and variable names:

.. code-block:: javascript

    var foo_bar = 123;  // correct
    var fooBar = 123;   // wrong
    
All global variables begin with an underscore:

.. code-block:: javascript

    var _foo_bar = null;

The constants are written in capital letters and never begin with an underscore:

.. code-block:: javascript

    var FOO_BAR = 100;

The names of external API methods and properties are written after a point. To avoid obfuscation of fields they must be listed with the ``@cc_externs`` tag:

.. code-block:: javascript

    exports.FOO_BAR = 123;

    exports.foo_bar = function() {
        
    }

    /**
     * Set properties.
     * @method module:properties.set_props
     * @param {Object} foo Foo object
     * @cc_externs props_1 props_2
     * @cc_externs props_3 props_4
     */
    exports.set_props = function(foo) {

        var bar_1 = foo.props_1;
        var bar_2 = foo.props_2;
        var bar_3 = foo.props_3;
        var bar_4 = foo.props_4;

        ...
    }
 
Commenting is in English only. Comment style - JSDoc.


Building the Engine
===================

Before building please make sure that your system has all required dependencies installed (see the :ref:`table <dependencies>`).

To compile the engine and the applications included into the SDK please execute the following command (in the SDK root):

.. code-block:: bash

    make compile

The full building that includes converting resources (textures, sounds and videos), compilation and converting the docs, can be performed with the following command:

.. code-block:: bash

    make build

Building the archives with the distributions:

.. code-block:: bash

    make dist

All above mentioned operations can be performed with a single command:

.. code-block:: bash

    make all

Building the Add-on
===================

Binary Blend4Web addon builds are available for the following platforms: Linux x32/64, macOS x64, Windows x32/64. At the same time users can compile the addon by themselves.

To do this Python 3.x (it's better if it's the same version as in Blender) and a C compiler are required. Under Linux it's enough to install the python3-dev and build-essential packages.

Paths relative to the repository root:
    - build script: ``csrc/b4w_bin/build.py``
    - Blend4Web addon: ``addons/blend4web/``

The building process is started in the following way:

.. code-block:: bash
    
    python3 ./csrc/b4w_bin/build.py

As a result of the building you'll get a binary file called:

``b4w_bin_[PLATFORM]_[ARCHITECTURE].[STANDARD_EXTENSION]``,

located in the same directory as the addon. Example: ``b4w_bin_Linux_64.so``. After this the addon is ready to use under this platform.



.. _dependencies:

Dependencies
============

All dependencies are listed in the table below in order of decreasing importance.

+-------------------------------+-------------------------------+----------------------------+
| Name                          | Ubuntu 16.04 package          | Purpose                    |
|                               |                               |                            |
+===============================+===============================+============================+
| Bash                          | included by default           | script interpreter         |
+-------------------------------+-------------------------------+----------------------------+
| Python 3                      | included by default           | script interpreter         |
+-------------------------------+-------------------------------+----------------------------+
| NodeJS                        | nodejs                        | compiling shaders          |
+-------------------------------+-------------------------------+----------------------------+
| Java                          | default-jre                   | compiling and obfuscating  |
|                               |                               | the engine modules         |
+-------------------------------+-------------------------------+----------------------------+
| ImageMagick                   | imagemagick                   | converting textures        |
+-------------------------------+-------------------------------+----------------------------+
| NVIDIA Texture Tools          | libnvtt-bin                   | converting textures        |
+-------------------------------+-------------------------------+----------------------------+
| Libav                         | libav-tools                   | converting media resources |
+-------------------------------+-------------------------------+----------------------------+
| NVIDIA Cg Toolkit             | nvidia-cg-toolkit             | debugging shaders          |
+-------------------------------+-------------------------------+----------------------------+
| OptiPNG                       | optipng                       | optimizing PNG files       |
+-------------------------------+-------------------------------+----------------------------+
| Emscripten                    | `from EMSDK source code`_     | building Uranium           |
+-------------------------------+-------------------------------+----------------------------+
| Gnuplot                       | gnuplot                       | debugging                  |
+-------------------------------+-------------------------------+----------------------------+
| Graphviz                      | graphviz                      | debugging                  |
+-------------------------------+-------------------------------+----------------------------+
| xsel                          | xsel                          | debugging                  |
+-------------------------------+-------------------------------+----------------------------+
| Sphinx                        | python3-sphinx                | building the manual        |
+-------------------------------+-------------------------------+----------------------------+
| sphinx-intl                   | installed with PIP v3         | building the manual        |
|                               | (pip3 install sphinx-intl)    | (internationalization)     |
+-------------------------------+-------------------------------+----------------------------+
| TeX Live                      | texlive texlive-latex-extra   | building the manual        |
|                               | texlive-lang-cyrillic         | (PDF version)              |
|                               | texlive-lang-chinese          |                            |
|                               | texlive-xetex                 |                            |
+-------------------------------+-------------------------------+----------------------------+
| JSDoc 3                       | installed with NPM            | building the API           |
|                               | (npm install -g jsdoc)        | documentation              |
+-------------------------------+-------------------------------+----------------------------+
| PEG.js                        | `from PEG.js source code`_    | building shader            |
|                               |                               | preprocessor               |
+-------------------------------+-------------------------------+----------------------------+

.. _from EMSDK source code: http://kripken.github.io/emscripten-site/docs/building_from_source/index.html
.. _from PEG.js source code: http://pegjs.majda.cz/

Naming Functions and Variables
==============================

When creating new functions and variables it is recommended to use the following prefixes and suffixes.

*init_*
    create an abstract object

*create_*
    create a certain object

*update_*
    update the state of an existing object

*attach_/detach_*
    add/remove a temporary object property

*append_/remove_*
    add/remove a temporary property to the already existing properties of the same kind

*insert_/pop_*
    add/remove an array element (accessed by index)

*switch_*
    switch flag's binary value

*apply_/clear_*
    operation with flags, binary values or arbitrary parameters

*set_/get_*
    set/get the property/variable value

*_tmp*
    global variable - cache in the form of a simple object (array, vector)

*_cache*
    global variable - cache in the form of a complex object



.. _debugging:

Debugging
=========

Engine debugging is performed with the ``debug.js`` module methods.

The structure of the current render graph can be saved in the DOT format using the ``b4w.debug.scenegraph_to_dot()`` call, for example, in the browser console. After calling this method, save the console output into the file with the .gv extension. To get the graph in a visual form the `graphviz <http://www.graphviz.org/>`_ utilities are required. Converting to the SVG format is performed using the command:

.. code-block:: bash

    > dot -Tsvg graph.gv -o graph.svg

where ``graph.gv`` is the name of the file with the saved graph.

.. _shaders:


.. index:: compiling shaders

Shader Compilation
==================

All shaders used in the engine are processed by a compiler. The compiler performs the following three main procedures:

* validation of the shader code,
* its obfuscation and
* optimization.

In order to run the compiler, execute one of the following commands in the SDK root:

.. code-block:: bash

    > make compile_shaders
    > make verify_shaders
    
    
* **make** *compile_shaders* - performs validation, obfuscation, optimization and finally, export of the compiled shaders,
* **make** *verify_shaders* - performs only validation, obfuscation and optimization.

Syntax analysis (parsing) of the shader text is first performed during compilation. The corresponding parser is created automatically based on the grammar, using the `PEG.js <http://pegjs.majda.cz/>`_ generator. Then the shaders are validated, obfuscated and optimized according to the parser data, and after that the shaders are exported in the form of an abstract syntax tree (AST) for direct loading in the engine.

The location of the main files in the repository:

* initial grammar - glsl_utils/pegjs/glsl_parser.pegjs
* parser generation script - glsl_utils/pegjs/gen_nodejs.sh
* parser - glsl_utils/compiler/glsl_parser.js


.. index:: compiling shaders; validation

Validation
----------

The compiler performs the following procedures related to shader code validation:

* reporting about unused variables and functions (dead code),
* checking the syntax of shaders,
* checking the conformance of shaders to the import/export mechanism,
* removing odd or repetitive tokens: spaces, line ends and semicolons.


.. index:: compiling shaders; obfuscation

Obfuscation
-----------

Obfuscation minifies the GLSL code and makes it difficult to understand it. So far the following procedure is implemented:

* replacing the user-defined identifiers with shorter single-symbol, two-symbol etc. names (with support of the import/export mechanism).


.. index:: compiling shaders; optimization

Optimization
------------

Optimization constitutes the following procedures:

* removing curly brackets which are not useful in any ways except creating local scopes (this functionality is used for processing node/lamp directives),
* optimization inside functions - creating shared local variables to replace ones originally created by the programmer.

An example of removing unused curly brackets: replacing the following code

.. code-block:: glsl

    void function(){
        int a;
        {
            a = 1;
        }
    }

with this code

.. code-block:: glsl

    void function(){
        int a;
        a = 1;
    }

Low number of temporary local variables is achieved by repetitively using them in different contexts. For example, the following code

.. code-block:: glsl

    int function(){
        int a = 1;
        int b = a + 3;
        return b;
    }

will be replaced with

.. code-block:: glsl

    int function(){
        int _int_tmp0 = 1;
        _int_tmp0 = _int_tmp0 + 3;
        return _int_tmp0;
    }

.. note::

    Local variables for structures and arrays are not optimized this way.


.. index:: compiling shaders; import/export directives

Import/Export Directives
------------------------

import/export directives are used to organize, structure and increase the readability of the shader code in the include file. They are specified in the beginning of the file and should look approximately like this:

.. code-block:: glsl

    #import u_frame_factor u_quatsb u_quatsa u_transb u_transa a_influence 
    #import qrot

    #export skin

The ``#import`` directive defines a set of ids which are declared outside the include file but can be accessed from inside it. There is a limitation though: such ids must necessarily be declared somewhere above the place where the include file is linked.

The ``#export`` directive defines a set of ids which can be accessed from outside this file. Such ids must necessarily be declared in this file.

Therefore, the shader which uses the include file must have all the declarations necessary for import before the place of linking, and can use the exported ids after it.

Ids can be both variable names and function names. If there are no import/export directives it's considered by default that the include file does not use external declarations and does not allow the using of internal ones.



.. index:: compiling shaders; recommendations and limitations

Recommendations and Limitations
-------------------------------

Because of the following reasons: preprocessing, the need to process multiple shaders and include files and due to the compiler's features - its possible to guarantee the work of the output code only if a number of rules and limitations are respected with regard to the shader source code:

1. In order to describe constants which are defined by the engine at run, it's necessary to use the ``#var`` special directive. For example:

.. code-block:: glsl

    #var AU_QUALIFIER uniform
    AU_QUALIFIER float a;

The syntax here is similar to the #define directive. The point of the #var directive is that the value which it defines allows to parse the initial shader. It's irrelevant what exactly it will be (e.g. 'uniform' or 'attribute' in the above example), because at this level it's unknown anyway. Nevertheless, it's better to specify a more or less suitable description and not something arbitrary.

.. note::

    The #var directive is not necessary for constants used not in the shader code but in the preprocessor expressions.

2. Using the import/export directives when needed.
3. The built-in functions must not be overloaded - only the user ones.
4. Variables should not be declared with names of the built-in functions, or main (even if it doesn't lead to errors).
5. The #var and #define directives must not be used for replacing single symbols in such operators as: "++", "--", "\*=", "/=", "+=", "-=", "==", "<=", ">=", "!=", "&&", "||", "^^".

For example:

.. code-block:: glsl

    #var EQUAL =
    ...
    a *EQUAL b;
    ...

6. The usage of the #include directive should not lead to ambiguity during the obfuscation of the include file. This can happen when multiple shaders are included into the same file and the above defined directives (like #var or #define) can have influence on any of them. Also, it's better not to use undeclared functions and variables in the include file.

7. Multi-level includes or multiple inclusion of the same include into the same shader is not supported.
8. Shader malfunction can also be caused by nontrivial using of preprocessing, for example, creating an invalid GLSL code:

.. code-block:: glsl

    #if TYPE
    void function1() {
    #else
    void function1(int i) {
    #endif
        ...
    }
    
9. Do not declare variables with such names as ``node_[NODE_NAME]_var_[IN_OUT_NODE]``, where ``NODE_NAME`` --- name of some node, ``IN_OUT_NODE`` --- name of an input or an output of the node.

10. Repetitive use of ``#nodes_main``, ``#nodes_global`` or ``#lamps_main`` directives is not permitted inside a single shader.
    
11. The ``#nodes_main``, ``#nodes_global`` and ``#lamps_main`` directives are recommended to use in the file, containing these shader nodes description, for example, in the same include-file. This is necessary for the correct shader validation.

.. index:: compiling shaders; WebGL Extensions

WebGL Extensions
----------------

Compilation may depend on WebGL extensions being used if they somehow influence the shading language. At the moment the following extensions are supported by the compiler:

    * OES_standard_derivatives


.. index:: compiling shaders; errors

Compilation Errors
------------------

In case of an error the compiler will output the corresponding message in the console.

Table of possible errors:

+-------------------------------------+-------------------------------------------+
| Error message                       | Cause                                     |
+=====================================+===========================================+
| Error! Ambiguous obfuscation in     | Ambiguous obfuscation in the 'FILE_NAME'  |
| include file 'FILE_NAME'.           | include file.                             |
+-------------------------------------+-------------------------------------------+
| Error! Extension NAME is            | The NAME WebGL extension used in the      |
| unsupported in obfuscator. File:    | FILE_NAME file is not supported by the    |
| 'FILE_NAME'.                        | obfuscator.                               |
+-------------------------------------+-------------------------------------------+
| Error! Include 'FILE_NAME' not      | The FILE_NAME include file could not be   |
| found.                              | found.                                    |
+-------------------------------------+-------------------------------------------+
| Error! Undeclared TYPE: 'NAME'.     | Error in FILE_NAME file. Undeclared       |
| File: 'FILE_NAME'.                  | identifier NAME of type TYPE (variable,   |
|                                     | function, structure etc).                 |
+-------------------------------------+-------------------------------------------+
| Error! Undeclared TYPE: 'NAME'.     | Undeclared identifier NAME of type TYPE   |
| Importing data missed. File:        | (variable, function, structure etc).      |
| 'FILE_NAME'.                        | Declaration missing for the identifier    |
|                                     | required in the FILE_NAME include file    |
|                                     | according to the ``#import`` directive.   |
+-------------------------------------+-------------------------------------------+
| Error! Undeclared TYPE: 'NAME'.     | Error in FILE_NAME file. Undeclared       |
| Possibly exporting needed in        | identifier NAME of type TYPE (variable,   |
| include file 'INCLUDE_NAME'. File:  | function, structure etc). Possibly its    |
| 'FILE_NAME'.                        | export into the INCLUDE_NAME include      |
|                                     | file should be allowed.                   |
+-------------------------------------+-------------------------------------------+
| Error! Undeclared TYPE: 'NAME'.     | Undeclared identifier NAME of type TYPE   |
| Possibly importing needed. File:    | (variable, function, structure etc).      |
| 'FILE_NAME'.                        | Possibly it should be specified as        |
|                                     | imported in the FILE_NAME include file.   |
+-------------------------------------+-------------------------------------------+
| Error! Unused export token 'NAME'   | Undeclared identifier NAME is allowed     |
| in include file 'FILE_NAME'.        | for export in the FILE_NAME include file. |
+-------------------------------------+-------------------------------------------+

|

+-------------------------------------+-------------------------------------------+
| Error! Using reserved word in TYPE  | Error in FILE_NAME file. A reserved id    |
| 'NAME'. File: 'FILE_NAME'.          | is used for declaring the identifier      |
|                                     | NAME of type TYPE (variable, function,    |
|                                     | structure etc).                           |
+-------------------------------------+-------------------------------------------+
| Error! 'all' extension cannot have  | The ``#extension`` directive specified    |
| BEHAVIOR_TYPE behavior. File:       | for ``all`` WebGL extensions in the       |
| 'FILE_NAME'.                        | FILE_NAME file does not support the       |
|                                     | behavior BEHAVIOR_TYPE.                   |
+-------------------------------------+-------------------------------------------+
| Syntax Error. ERROR_MESSAGE. File:  | Syntax error in line LINE_NUMBER column   |
| FILE_NAME, line: LINE_NUMBER,       | COL_NUMBER during parsing the FILE_NAME   |
| column: COL_NUMBER.                 | shader. The initial error description is  |
|                                     | quoted in the ERROR_MESSAGE. The code     |
|                                     | listing taken from around the             |
|                                     | corresponding line is attached to the     |
|                                     | message (note the peculiarity of pegjs    |
|                                     | parser which specify the line which is    |
|                                     | a little bit after the actual error.      |
+-------------------------------------+-------------------------------------------+
| Warning! Function 'NAME' is         | An unused function NAME is declared in    |
| declared in [include ]file          | the FILE_NAME file.                       |
| FILE_NAME, but never used.          |                                           |
+-------------------------------------+-------------------------------------------+
| Warning! Include file 'FILE_NAME'   | The FILE_NAME include file is not used    |
| not used in any shader, would be    | in any of the shaders and so it will be   |
| omitted!                            | excluded from the obfuscated version.     |
+-------------------------------------+-------------------------------------------+
| Warning! Unused import token 'NAME' | An unused id NAME is imported in the      |
| in include file 'FILE_NAME'.        | FILE_NAME include file.                   |
+-------------------------------------+-------------------------------------------+
| Warning! Variable 'NAME' is         | An unused variable NAME is declared in    |
| declared in include file            | the FILE_NAME file.                       |
| FILE_NAME, but never used.          |                                           |
+-------------------------------------+-------------------------------------------+


Updating Add-on Translations
============================

If you need to update all existing .po files, run the script *translator.py* in the SDK/scripts directory without arguments:

.. code-block:: bash

    > python3 translator.py

In order to update an existing .po file, run the script with a supported language code as an argument:

.. code-block:: bash

    > python3 translator.py ru_RU

In order to view the list of supported languages, run the script as follows:

.. code-block:: bash

    > python3 translator.py help

In any case, the file *empty.po* will be updated upon running the script.

After updates, the .po files can be edited/translated as usual.

