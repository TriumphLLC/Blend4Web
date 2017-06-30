.. _addon:

.. index:: add-on

******
Add-on
******

.. contents:: Table of Content
    :depth: 3
    :backlinks: entry

.. _local_development_server:

Local Development Server
------------------------

Settings for the local development server can be found in :file:`File > User Preferences...` (hot keys :file:`Ctrl-Alt-U`). Here you can change the port number to be used to run the development server (6687 by default), and also enable its launching upon Blender startup. To do this, enable ``Run on Startup`` option in the add-on settings.

.. image:: src_images/addon/addon_server_setup.png
   :align: center
   :width: 100%

|

After changing local development server settings in it required to restart Blender.

It is possible for the local server to process external requests. To do that enable the option ``Enable External Requests``.

If you chose not to start the server automatically, you can always do it manually: go to the ``Render`` tab and press the ``Start Server`` button on the ``Development Tools`` panel:

.. image:: src_images/addon/addon_development_server_start.png
   :align: center
   :width: 100%

|

.. note::

    If the local development server cannot be launched, the corresponding message will be displayed instead of the ``Start Server`` button.

    If the server is failed to run, an error message will be shown describing the reason:

    .. image:: src_images/setup/error.png
       :align: center

    This error can arise if the server port is already used by some other application.

Press the ``SDK Index`` button to open the index web page of the Blend4Web SDK in the browser. This page is available at http://localhost:6687.

.. image:: src_images/setup/server_open.png
   :align: center
   :width: 100%

|

As a result, the default browser for your operating system will be launched.

The ``Project Manager`` button can be used to open :ref:`project manager <project_management>`.

The ``Fast Preview`` button loads the scene that is currently open in Blender, into the :ref:`viewer <viewer>`.

The server can be stopped by pressing the ``Stop Server`` button. It also stops when Blender is closed.


.. index:: viewer; launch

.. _getting_started_launching_viewer:

Running Viewer and Demos
------------------------

.. image:: src_images/addon/addon_sdk_index.png
   :align: center
   :width: 100%

The index page contains the following links:

* :ref:`Project Manager <project_management>`;

* :ref:`Code Snippets <code_snippets>`, a list of demo applications. A :ref:`WebGL-capable browser <browser_webgl_support>` is required to run these apps;

* WebGL Report page for checking the level of WebGL support provided by the web browser;

* :ref:`User Manual <about>`, available in both HTML and PDF form in three languages;

* API Reference that contains descriptions for every API module and method provided with the Blend4Web engine;

* Tutorials;

* FAQ page where you can find answers to some of the most basic questions regarding using the engine;

* Community Support Forums;

* Support Email (only available in PRO version).

|

.. note::

   If the SDK apps are not displayed correctly, or error messages are shown, follow the instructions in the :ref:`renderer_not_working` section.

.. _export_formats:

Export Formats
--------------

After the scene is finished, you need to convert it into a format supported by the Blend4Web engine.

For now, two formats are supported: JSON and HTML.

JSON
....

Exporting the scene to this format creates a ``.json`` (JavaScript Object Notation) file that contains all exported data structures and links to external resources (images, sounds and such), and also a ``.bin`` file that contains model data arrays in binary format.

If media resources are `packed into the .blend file <https://www.blender.org/manual/data_system/introduction.html#pack-and-unpack-data>`_, they will be unpacked during the export and placed in the project's directory (inside the SDK directory). It should be noted that the names of such files will be automatically changed, which can complicate working with them.

It is recommended to store all the resources in a dedicated folder inside the SDK directory, it can be called ``projects/project_name/assets`` for example.

.. note::
    In accordance with the security measures, the development server can only access the SDK folder. If media data is placed in another folder, the server won't be able to deploy it during the export (even if it is working correctly in Blender itself).

Paths to the external resources should be relative. If this is not the case,  execute the ``File > External Data > Make All Paths Relative`` command, or  else problems with opening the file on other computers may occur.

This is the main format for complex projects that include multiple scenes and require JavaScript programming. Project development is further described in the  :ref:`corresponding section <developers>`.

HTML
....

Exporting the scene to this format pack all scene resources into one file with the HTML extension. This HTML file contains not only the scene itself, but also textures, sounds, Blend4Web engine and standard :ref:`web player <web_player>`. A file like this can be executed on any computer and any mobile device that have a web browser with WebGL support.

You can't use HTML files for further development, but you also don't need any additional actions to run them. This format is useful for developing relatively simple applications of moderate size.

It should be noted, however, that HTML applications do not support following features:

    * :ref:`Physics <physics>`
    * :ref:`DDS textures <converter_data_format>`
    * :ref:`min50 textures <converter>`

.. _export_opts:

Export Options
--------------

*Autosave blend File*
    Autosaving the file from which export occurs. **Enabled by default**. Autosaving is performed right after the export to guarantee conformity between the current blend file and the exported file contents. In addition, the relative path to the exported file is saved for convenience.

.. image:: src_images/addon/addon_save_mode.png
   :align: center
   :width: 100%

|

*Strict Mode*
    This mode prevents export if there are any errors or messages for users' attention. This mode is enabled with the ``Strict Mode`` setting in the export menu:

.. image:: src_images/addon/addon_strict_mode.png
   :align: center
   :width: 100%

|

    If there are any non-critical errors or messages for users' attention, a dialog window will be show like this:

.. image:: src_images/addon/addon_messages.png
   :align: center
   :width: 100%

|

*Export Converted Media*
    This option is available for HTML export. When this option is enabled, the converted media files of different formats are written in the HTML file. Using different media files is essential to create cross-browser and cross-platform applications while using HTML export. These files can be created by the :ref:`converter <converter>`.

.. image:: src_images/addon/addon_media_data.png
   :align: center
   :width: 100%

|

.. _run_in_viewer:

*Run in Viewer*
    Automatically launch the Scene Viewer and add the exported scene to it.

    When using the :ref:`local development server <local_development_server>`, there is a possibility to open the exported ``.json`` scene in the Scene Viewer. To do this, select any path inside the Blend4Web SDK file structure upon export.
    
    A directory inside the SDK should be used for export. If not, this option will not be displayed in the menu. Also, it will not be displayed if the local development server is down.

.. image:: src_images/addon/addon_run_in_viewer.png
   :align: center
   :width: 100%

|


.. _initialization_errors:

.. index:: addon; initialization errors

Initialization Errors
---------------------

Initialization errors can arise upon installation of the add-on or when a scene is opened in Blender. In this case a dialog window with the error description is showed.

.. image:: src_images/addon/addon_init_error_message.png
   :align: center
   :width: 100%

|

+-------------------------------------+-------------------------------------------+
| Error message                       | Cause                                     |
+=====================================+===========================================+
| Blend4Web initialization error!     | The Blend4Web add-on is not compatible    |
| Add-on is not compatible with       | with the PLATFORM platform.               |
| the PLATFORM platform.              |                                           |
+-------------------------------------+-------------------------------------------+
| Warning: Blender version mismatch.  | Warning about possible incompatibility    |
| Blender VER_REQUIRED is recommended | with the current Blender version.         |
| for the Blend4Web add-on.           | It is recommended to use VER_REQUIRED     |
| Current version is VER_CURRENT.     | Blender version. The current version is   |
|                                     | VER_CURRENT.                              |
+-------------------------------------+-------------------------------------------+
| Incorrect add-on directory name.    | Incorrect name of the add-on directory.   |
|                                     | Add-on structure in the archive has been  |
|                                     | damaged, or entirety of the archive has   |
|                                     | been disrupted.                           |
+-------------------------------------+-------------------------------------------+

.. index:: version; errors

.. _version_errors:

Compatibility Errors
--------------------

Compatibility errors may arise when trying to view a scene in a browser, in the following cases: if version of the add-on used to export the scene differs from version of the Blend4Web engine which tries to load the scene, or if .bin file does not correspond to the .json file.







Engine version is too old as compared to version of the add-on with which the scene was exported. The scene will not be loaded. We recommend you to use the latest versions of the engine and the add-on.




+-------------------------------------+-------------------------------------------+
| Error message                       | Cause                                     |
+=====================================+===========================================+
| JSON version is too old relative to | Version of the add-on, with which the     |
| B4W engine: VER_OLD, required:      | scene was exported, is too old: VER_OLD.  |
| VER_NEW. Reexport scene with the    | The engine requires: VER_NEW.             |
| latest B4W add-on to fix it.        | The scene will not be loaded. We          |
|                                     | recommend you to reexport the scene using |
|                                     | the latest version of the add-on. We also |
|                                     | recommend to use the latest version of    |
|                                     | the engine.                               |
+-------------------------------------+-------------------------------------------+
| JSON version is a bit old relative  | Version of the add-on, with which the     |
| to B4W engine: VER_OLD, required:   | scene was exported, is a bit old:         |
| VER_NEW. Some compatibility issues  | VER_OLD. The engine requires: VER_NEW.    |
| can occur. Reexport scene with the  | The scene will be loaded as usual,        |
| latest B4W add-on to fix it.        | however some errors may occur. We         |
|                                     | recommend you to reexport the scene using |
|                                     | the latest version of the add-on. We also |
|                                     | recommend to use the latest version of    |
|                                     | the engine.                               | 
+-------------------------------------+-------------------------------------------+
| B4W engine version is too old       | Engine version is too old as compared to  |
| relative to JSON. Can't load the    | version of the add-on with which the scene|
| scene. Update your engine version   | was exported. The scene will not be       |
| to fix it.                          | loaded. We recommend you to use the       |
|                                     | latest versions of the engine and the     |
|                                     | add-on.                                   |
+-------------------------------------+-------------------------------------------+
| B4W engine version is a bit old     | Engine version is a bit old as compared   |
| relative to JSON. Some              | to version of the add-on with which the   |
| compatibility issues can occur.     | scene was exported. The scene will be     |
| Update your engine version to fix   | loaded as usual, however some errors may  |
| it.                                 | occur. We recommend you to use the latest |
|                                     | versions of the engine and the add-on.    |
+-------------------------------------+-------------------------------------------+
| BIN version does not match to       | Version of the .bin file is too old       |
| JSON version: VER_BIN, required:    | relative to .json file: VER_BIN, .json    |
| VER_JSON. Couldn't load the scene.  | file version is VER_JSON. The scene will  |
| Reexport scene to fix it.           | not be loaded. We recommend you to        |
|                                     | reexport your scene.                      |
+-------------------------------------+-------------------------------------------+
| BIN version does not match to       | Version of the .bin file is a bit old     |
| JSON version: VER_BIN, required:    | relative to .json file: VER_BIN, .json    |
| VER_JSON. Some compatibility issues | file version is VER_JSON. Some            |
| can occur. Reexport scene to fix it.| incompatibility errors can arise. We      |
|                                     | recommend you to reexport your scene.     |
+-------------------------------------+-------------------------------------------+


.. index:: export; errors

.. _export_errors:

Critical Export Errors
----------------------

In case of export errors a ``BLEND4WEB EXPORT ERROR`` dialog box describing of the problem appears:

    ``COMPONENT`` - type of component (object, mesh, material, texture etc) that has caused the export error.

    ``NAME`` - component name.

    ``ERROR`` - short description of the occurred problem.

.. image:: src_images/addon/addon_error_message.png
   :align: center
   :width: 100%

|

+-------------------------------------+-------------------------------------------+
| Error message                       | Cause                                     |
+=====================================+===========================================+
| Export to different disk is         | Export to a directory located on a        |
| forbidden                           | different disk is forbidden               |
+-------------------------------------+-------------------------------------------+
| Incompatible objects with           | Incompatible objects with a shared mesh.  |
| a shared mesh; The OBJECT_NAME      | Export of an object with both a shared    |
| object has both vertex groups and   | mesh and vertex groups is not allowed.    |
| a shared mesh                       | Exceptions: export is possible if an      |
|                                     | object has the                            |
|                                     | ``Apply modifiers``,                      |
|                                     | ``Export vertex animation``,              |
|                                     | ``Export edited normals``,                |
|                                     | ``Apply Scale and Modifiers``             |
|                                     | options turned on (because in these cases |
|                                     | a full copying of meshes occurs).         |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh; Corrupted file:     | Corrupted file: incorrect vertex color    |
| Wrong vertex color values           | value.                                    |
+-------------------------------------+-------------------------------------------+
| Loading of resources from different | Loading of resources from different disk  |
| disk is forbidden                   | is forbidden.                             |
+-------------------------------------+-------------------------------------------+
| The material has a normal map but   | The node material uses ``Normal Mapping``,|
| doesn't have any material nodes     | but has no ``Material`` node.             |
+-------------------------------------+-------------------------------------------+
| The mesh has a UV map but has no    | The mesh has a UV map layer but has no    |
| exported material                   | material for export.                      |
+-------------------------------------+-------------------------------------------+
| The mesh has a vertex color layer   | The mesh has a vertex color layer but has |
| but has no exported material        | no material for export.                   |
+-------------------------------------+-------------------------------------------+
| No such file or directory           | The file or directory does not exist.     |
+-------------------------------------+-------------------------------------------+
| Permission denied                   | No access rights to the current directory.|
+-------------------------------------+-------------------------------------------+
| Wrong edited normals count; It      | The number of edited normals does not     |
| doesn't match with the mesh         | match the number of the mesh vertices.    |
| vertices count                      | Execute ``Clean Up`` or ``Save`` in the   |
|                                     | ``B4W Vertex Normals Editor`` panel.      |
+-------------------------------------+-------------------------------------------+
| Wrong overridden bounding box;      | Wrong dimensions are specified when       |
| Check the mesh's bounding box       | overriding the mesh's ``BoundingBox``:    |
| values                              | minimum value is greater than maximum     |
|                                     | value for at least one of the dimensions. |
+-------------------------------------+-------------------------------------------+

.. _export_errors_warnings:

.. index:: export; warnings about export errors

Non-Critical Export Errors
--------------------------

In contrast to the above-listed critical export errors, these errors do not prohibit the export, but can make scenes displayed incorrectly. These messages can be viewed in the browser console (opens with ``F12``) when a scene is loaded. The message looks like this:

    ``B4W EXPORT ERROR: Error message``

.. image:: src_images/addon/addon_export_error_message.png
   :align: center
   :width: 100%

|

+-------------------------------------+-------------------------------------------+
| Error message                       | Cause                                     |
+=====================================+===========================================+
| Canvas texture ID NAME already      | This ``Canvas`` ID already exists.        |
| exists. Texture NAME.               |                                           |
+-------------------------------------+-------------------------------------------+
| Dupli group error for object        | None of the objects in the GROUP_NAME     |
| OBJECT_NAME. Objects from the       | group which were selected for duplication |
| GROUP_NAME dupli group on the       | on the OBJECT_NAME object can be          |
| OBJECT_NAME object cannot be        | exported. Permission to export at least   |
| exported                            | one object of the group, or to remove the |
|                                     | duplication of the group is required.     |
+-------------------------------------+-------------------------------------------+
| Empty canvas texture ID for texture | ``Canvas`` ID is empty.                   |
| NAME.                               |                                           |
+-------------------------------------+-------------------------------------------+
| Empty material slot in node         | Empty material slot in \"NAME\" node.     |
| \"NAME\". Material: \"NAME\".       |                                           |
+-------------------------------------+-------------------------------------------+
| Environment map in the \"NAME\"     | Environment map can not be presented with |
| world texture slot cannot be        | a video file.                             |
| a movie.                            |                                           |
+-------------------------------------+-------------------------------------------+
| Ignoring LODs after empty LOD for   | All LOD objects that follow the empty     |
| the NAME object.                    | slot were ignored (in the LOD objects     | 
|                                     | list for the NAME object).                |
+-------------------------------------+-------------------------------------------+
| Incomplete mesh NAME; Dynamic grass | The ``Dynamic grass size`` and/or         |
| vertex colors required              | ``Dynamic grass color`` options are used  |
| by material settings                | by the special terrain material but the   |
|                                     | mesh has no vertex colors with such       |
|                                     | names.                                    |
+-------------------------------------+-------------------------------------------+
| Incomplete mesh; Material settings  | The ``Vertex Color Paint`` option is      |
| require vertex colors               | enabled for the mesh material, but the    |
|                                     | mesh has no vertex color layers.          |
+-------------------------------------+-------------------------------------------+
| Incorrect NLA script, falling back  | Incorrect NLA script. Falling back to     |
| to simple sequential NLA.           | simple sequential NLA.                    |
+-------------------------------------+-------------------------------------------+
| Incorrect vertex animation for mesh | The object's vertex animation export      |
| NAME. Object has no vertex          | option is on, but there is no vertex      |
| animation.                          | animation.                                |
+-------------------------------------+-------------------------------------------+
| Incorrect vertex animation for mesh | Vertex animation export is turned on for  |
| NAME. Unbaked "ANIM_NAME" vertex    | the mesh, but the ANIM_NAME animation     |
| animation.                          | doesn't have any frames.                  |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh NAME;                | The mesh has vertices assigned to the     |
| Wrong group indices                 | non-existing vertex group.                |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh NAME;                | Corrupted file: incorrect vertex          |
| Wrong vertex positions              | coordinate value.                         |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh NAME;                | Corrupted file: incorrect normal value.   |
| Wrong normals                       |                                           |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh NAME;                | Corrupted file: incorrect tangent value.  |
| Wrong tangents                      |                                           |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh NAME;                | Corrupted file: incorrect texture         |
| Wrong texture coordinates           | coordinate value.                         |
+-------------------------------------+-------------------------------------------+
| Incorrect mesh NAME;                | Corrupted file: incorrect vertex group    |
| Wrong vertex group weights          | weight value.                             |
+-------------------------------------+-------------------------------------------+

+-------------------------------------+-------------------------------------------+
| Incomplete vehicle. The NAME        | The modelled NAME vehicle is not complete |
| vehicle doesn't have any chassis    | as it should contain a ``Chassis`` or a   |
| or hull                             | ``Hull`` element.                         |
|                                     |                                           |
+-------------------------------------+-------------------------------------------+
| Incomplete vehicle. The NAME        | The modelled NAME vehicle is not          |
| vehicle requires at least one bob   | complete as it should contain at least    |
|                                     | one ``Bob`` element.                      |
+-------------------------------------+-------------------------------------------+
| Incomplete vehicle. The NAME        | The modelled NAME vehicle is not          |
| vehicle requires at least one wheel | complete as it should contain at least    |
|                                     | one ``Wheel`` element.                    |
+-------------------------------------+-------------------------------------------+
| Invalid link found in node          | The \"NAME\" node material contains an    |
| material. Material: \"NAME"\.       | incorrect link between nodes.             |
+-------------------------------------+-------------------------------------------+
| No image in the NAME texture.       | The texture has no image.                 |
| [Material: NAME.]                   |                                           |
+-------------------------------------+-------------------------------------------+
| No texture for the NAME particle    | No texture in the particle settings'      |
| settings texture slot.              | texture slot.                             |
+-------------------------------------+-------------------------------------------+
| No texture in the NAME world        | No texture in the NAME world's texture    |
| texture slot.                       | slot.                                     |
+-------------------------------------+-------------------------------------------+
| No texture in the texture slot.     | There is no texture in the material       |
| Material: NAME.                     | texture slot.                             |
+-------------------------------------+-------------------------------------------+
| Node material invalid: \"NAME\".    | Node material error: the input and output |
| Check sockets compatibility:        | types of the link between the             |
| \"FROM_NODE\" with \"TO_NODE\".     | ``FROM_NODE`` and ``TO_NODE`` nodes       |
|                                     | should match.                             |
+-------------------------------------+-------------------------------------------+
| Object \"NAME\" hasn't renderable   | An object named \"NAME\" is degenerate,   |
| data. Converted to EMPTY.           | e.g. has no polygons. The object's type   |
|                                     | has been changed to EMPTY.                |
+-------------------------------------+-------------------------------------------+
| Object: \"NAME\" > Constraint:      | The object \"NAME\" has a constraint of   |
| \"CONSTRAINT_TYPE\". Check          | type \"CONSTRAINT_TYPE\", which isn't     |
| constraint settings.                | configured properly.                      |
+-------------------------------------+-------------------------------------------+
| Object \"NAME\" has the mesh with   | An object named \"NAME\" has a mesh with  |
| shape keys. The property            | shape keys. This mesh has the             |
| \"Relative\" of mesh has been       | \"Relative\" property enabled which is    |
| enabled.                            | forbidden.                                |
+-------------------------------------+-------------------------------------------+
| Object \"NAME\" has no data or      | An object named \"NAME\" has no mesh or   |
| data is broken. Change object type  | mesh is broken. The object's type         |
| to EMPTY.                           | has been changed to EMPTY.                |
|                                     |                                           |
+-------------------------------------+-------------------------------------------+
| Packed media \"FILE_NAME\" has not  | The packed media file \"FILE_NAME\"       |
| been exported to                    | cannot be converted to                    |
| \"CONVERTED_FILE_PATH\"             | \"CONVERTED_FILE_PATH\". Please unpack    |
|                                     | this file and convert it.                 |
+-------------------------------------+-------------------------------------------+

+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\"; | The NAME vertex color is specified in     |
| The \"NAME\" vertex color specified | the ``from`` field but it's not presented |
| in the ``from`` field is missing in | in the OBJECT_NAME emitter.               |
| the last of the \"OBJECT_NAME\"     |                                           |
| object's vertex colors              |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\"; | The NAME vertex color is specified in the |
| The \"NAME\" vertex color specified | ``to`` field but it is not present in the |
| in the ``to`` field is missing in   | OBJECT_NAME object which is selected as a |
| the list of the \"OBJECT_NAME\"     | particle.                                 |
| object's vertex colors              |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\"; | The NAME vertex color is specified in the |
| The \"NAME\" vertex color specified | ``to`` field but it is not present in     |
| in the "``to`` field is missing in  | the OBJECT_NAME object of the GROUP_NAME  |
| the \"OBJECT_NAME\" object          | group which is selected as a particle.    |
| (\"GROUP_NAME\" dupli group)        |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error for object    | Particle system error for the object      |
| \"NAME\". Invalid dupli object      | NAME. Invalid dupli-object OBJECT_NAME.   |
| \"OBJECT_NAME\".                    |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error. Unsupported  | Particle system error. Unsupported        |
| render type \"TYPE\" for the HAIR   | render type TYPE for the HAIR             |
| particles \"NAME\" on object        | particles PSYS_NAME on object NAME. The   |
| \"OBJECT_NAME\". Particle system    | particle system has removed.              |
| removed.                            |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error. Unsupported  | Particle system error. Unsupported        |
| render type \"TYPE\" for the EMITTER| render type TYPE for the EMITTER          |
| particles \"NAME\" on object        | particles PSYS_NAME on object NAME. The   |
| \"OBJECT_NAME\". Particle system    | particle system has removed.              |
| removed.                            |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\". | Particle system error: no object is       |
| Dupli object isn't specified.       | selected as a particle.                   |
|                                     |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\". | Particle system error: no group is        |
| Dupli group isn't specified.        | selected as a particle.                   |
|                                     |                                           |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\". | An object of unsuitable type is selected  |
| Wrong dupli object type \"TYPE\".   | for the particle. Supported types:        |
|                                     | ``MESH``.                                 |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\". | The NAME object which is selected         |
| Dupli object \"NAME\" has not been  | as a particle can not be exported (the    |
| exported.                           | ``Do not export`` checkbox is set).       |
+-------------------------------------+-------------------------------------------+
| Particle system error for \"NAME\". | The GROUP_NAME dupli group which is       |
| The \"GROUP_NAME\" dupli group      | selected as a particle contains no valid  |
| contains no valid object for export.| object for export. Either such objects    |
|                                     | have the ``Do not export`` checkbox       |
|                                     | enabled or the types of the objects are   |
|                                     | unsuitable. Supported object types:       |
|                                     | ``MESH``.                                 |
+-------------------------------------+-------------------------------------------+
| Sound file is missing in the        | The speaker has no sound attached. The    |
| SPEAKER object \"NAME\". Converted  | object's type has been changed to EMPTY.  |
| to EMPTY.                           |                                           |
+-------------------------------------+-------------------------------------------+
| The lamp object \"NAME\" has        | The lamp object \"NAME\" has unsupported  |
| unsupported AREA type. Changed to   | AREA type. Lamp type has been changed     |
| SUN.                                | to SUN.                                   |
+-------------------------------------+-------------------------------------------+

+-------------------------------------+-------------------------------------------+
| The main scene NAME can not be      | The main scene NAME can not be rendered   |
| rendered by another scene. Material | by another scene. The material NAME has   |
| NAME has been removed.              | been deleted.                             |
+-------------------------------------+-------------------------------------------+
| The NAME action has decimal frames. | The NAME action has decimal frames, which |
| Converted to integer.               | isn't supported. Converted to integer.    |
+-------------------------------------+-------------------------------------------+
| The NAME armature modifier has a    | An armature modifier has a proxy object   |
| proxy object as an armature.        | as an armature.                           |
| Modifier removed.                   |                                           |
+-------------------------------------+-------------------------------------------+
| The NAME armature modifier has no   | The NAME ``Armature`` modifier has no     |
| armature object or it is not        | armature object or it is not exported.    |
| exported. Modifier removed.         | Modifier removed.                         |
+-------------------------------------+-------------------------------------------+
| The NAME curve modifier has no curve| The NAME curve modifier has no object.    |
| object. Modifier removed.           | Modifier removed.                         |
+-------------------------------------+-------------------------------------------+
| The NAME curve modifier has         | The NAME curve modifier has unsupported   |
| unsupported curve object. Modifier  | object. Modifier removed.                 |
| removed.                            |                                           |
+-------------------------------------+-------------------------------------------+
| The NAME object has the NAME        | The NAME object has both vertex animation |
| armature modifier and a vertex      | and an armature modifier which is not     |
| animation. Modifier removed.        | supported. As a result, the modifier has  |
|                                     | been removed.                             |
+-------------------------------------+-------------------------------------------+
| The NAME object has the NAME        | The NAME object has the NAME              |
| armature modifier. It belongs to a  | armature modifier. The armature object in |
| not exported scene. Modifier        | this modifier isn't specified or belongs  |
| removed.                            | to a not exported scene. Modifier         |
|                                     | removed.                                  |
+-------------------------------------+-------------------------------------------+
| The NAME LAMP node has no lamp      | Wrong object specified in the NAME        |
| object. Material: NAME.             | ``LAMP`` node.                            |
+-------------------------------------+-------------------------------------------+
| The NAME node is not supported.     | The engine does not support the node with |
| The NAME material will be rendered  | this name, and so the node material will  |
| without nodes. Material: NAME.      | be turned off. Often this happens when    |
|                                     | Cycles nodes are used.                    |
+-------------------------------------+-------------------------------------------+
| The NAME object has NAME armature   | An object should be in the same group as  |
| modifier which references the wrong | an armature, or both these objects should |
| group. Modifier removed.            | be explicitly present in the scene.       |
+-------------------------------------+-------------------------------------------+
| \"TEXTURE_TYPE\" texture type is not| TEXTURE_TYPE texture type isn't supported |
| supported for world \"NAME\".       | for world WORLD_NAME                      |
+-------------------------------------+-------------------------------------------+
| Using B4W_REFRACTION node NODE_NAME | A node material with incorrect Alpha      |
| with incorrect type of Alpha Blend. | Blend property is used. ``Alpha sort``,   |
| Material: NAME.                     | ``Alpha blend`` and ``Add`` are allowed   |
|                                     | when using a "REFRACTION" node.           |
+-------------------------------------+-------------------------------------------+
| Wind bending: not all               | Wind bending parameters setup: all        |
| vertex colors exist for \"NAME\".   | specified vertex color layers should      |
| Properties were set to default      | exist.                                    |
| values.                             |                                           |
+-------------------------------------+-------------------------------------------+

+-------------------------------------+-------------------------------------------+
| Wind bending: vertex colors weren't | Wind bending parameters setup: it's       |
| properly assigned for \"NAME\".     | required to specify the names of either   |
| Properties were set to default      | all vertex color layers                   |
| values.                             | (``Main stiffness (A)``,                  |
|                                     | ``Leaves stiffness (R)``,                 |
|                                     | ``Leaves phase (G)``,                     |
|                                     | ``Overall stiffness (B)``),               |
|                                     | or of the main one only                   |
|                                     | (``Main stiffness (A)``),                 |
|                                     | or of none of them.                       |
+-------------------------------------+-------------------------------------------+
| Wrong "Height Map" input for the    | Wrong data were passed to the "Height     |
| "NAME" B4W_PARALLAX node. Only link | Map" input of the NAME ``B4W_PARALLAX``   |
| from the TEXTURE node with a        | node. Only the output from a non-empty    |
| non-empty texture is allowed.       | ``TEXTURE`` node is allowed.              |
+-------------------------------------+-------------------------------------------+
| Wrong texture coordinates type      | The following coordinate types are        |
| in texture NAME. [Material: NAME.]  | supported for image textures: ``UV``,     |
|                                     | ``Normal`` and ``Generated``.             |
+-------------------------------------+-------------------------------------------+
| Wrong F-Curve interpolation mode for| The following types are supported for     |
| ACTION_NAME. Only BEZIER, LINEAR or | action interpolation mode: ``BEZIER``,    |
| CONSTANT mode is allowed for F-Curve| ``LINEAR`` and ``CONSTANT``.              |
| interpolation. Switch to BEZIER.    |                                           |
+-------------------------------------+-------------------------------------------+
| Wrong vertex animation vertices     | Vertex animation export is enabled but    |
| count for mesh NAME. It doesn't     | the number of vertices in the baked       |
| match with the mesh vertices count  | ANIM_NAME animation frames does not match |
| for "ANIM_NAME".                    | the mesh vertices number. Possible        |
|                                     | solution is to "re-bake" the animation.   |
+-------------------------------------+-------------------------------------------+

.. _export_errors_other:

Other Messages
--------------

These messages can be viewed in the browser console (opens with ``F12``) when a scene is loaded. The message looks like this:

        ``B4W EXPORT WARNING: Export message which requires the user's attention``

.. image:: src_images/addon/addon_export_warning_message.png
   :align: center
   :width: 100%

|

+-------------------------------------+-------------------------------------------+
| Error Message                       | Cause                                     |
+=====================================+===========================================+
| Material tangent shading is         | The material has the option \"Tangent     |
| enabled, but object's mesh has no   | Shading\" enabled, which always requires  |
| UV map.                             | a UV map.                                 |
+-------------------------------------+-------------------------------------------+
| Missing active camera or wrong      | There is no active camera on the scene    |
| active camera object                | (``Camera`` property on the ``Scene``     |
|                                     | tab).                                     |
+-------------------------------------+-------------------------------------------+
| Missing world or wrong active world | There should be at least one world        |
| object                              | datablock in the scene.                   |
+-------------------------------------+-------------------------------------------+
| NAME particle settings has the NAME | The particle settings datablock NAME      |
| texture rendering a scene. It has   | contains the texture NAME being used for  |
| been replaced by the default        | rendering a scene into. This texture has  |
| texture.                            | been replaced by a default texture.       |
+-------------------------------------+-------------------------------------------+
| The action NAME has no fcurves.     | The action with the name "NAME" has no    |
|                                     | fcurves.                                  |
+-------------------------------------+-------------------------------------------+
| The \"NAME\" camera has unsupported | Panoramic cameras are not supported.      |
| PANORAMIC type. Changed to          | Perspective mode is used instead.         |
| PERSPECTIVE type."                  |                                           |
+-------------------------------------+-------------------------------------------+
| Unsupported texture type or texture | There are no textures on the material     |
| is missing for Lens Flare material  | or unsupported texture type is used       |
| \"NAME\"                            | for material \"NAME\".                    |
+-------------------------------------+-------------------------------------------+
| Use of ENVIRONMENT_MAP as diffuse   | The ENVIRONMENT MAP texture can not be    |
| color is not supported. Use as      | used as diffuse color. Disable the        |
| mirror instead.                     | Diffuse > Color and enable the            |
|                                     | Shading > Mirror option on the            |
|                                     | Textures > Influence panel to use this    |
|                                     | texture as mirror map.                    |
+-------------------------------------+-------------------------------------------+

.. _translator:
    
Add-on Translations
-------------------

There is the possibility to translate the add-on to a language supported by Blender. In order to do this, rename the file "empty.po", which located in the directory SDK/blender_scripts/addons/blend4web/locales, to one of the names in the following table:

|

+---------------------+---------------------+
| File name           | Language            |
+=====================+=====================+   
| ru_RU.po            | Russian             |
+---------------------+---------------------+
| ja_JP.po            | Japanese            |
+---------------------+---------------------+
| en_US.po            | English             |
+---------------------+---------------------+
| nl_NL.po            | Dutch               |
+---------------------+---------------------+
| it_IT.po            | Italian             |
+---------------------+---------------------+
| de_DE.po            | German              |
+---------------------+---------------------+
| fi_FI.po            | Finnish             |
+---------------------+---------------------+
| sv_SE.po            | Swedish             |
+---------------------+---------------------+
| fr_FR.po            | French              |
+---------------------+---------------------+
| es.po               | Spanish             |
+---------------------+---------------------+
| ca_AD.po            | Catalan             |
+---------------------+---------------------+
| cs_CZ.po            | Czech               |
+---------------------+---------------------+
| pt_PT.po            | Portuguese          |
+---------------------+---------------------+
| zh_CN.po            | Simplified Chinese  |
+---------------------+---------------------+
| zh_TW.po            | Traditional Chinese |
+---------------------+---------------------+
| hr_HR.po            | Croatian            |
+---------------------+---------------------+
| sr_RS.po            | Serbian             |
+---------------------+---------------------+
| uk_UA.po            | Ukrainian           |
+---------------------+---------------------+
| pl_PL.po            | Polish              |
+---------------------+---------------------+
| ro_RO.po            | Romanian            |
+---------------------+---------------------+
| ar_EG.po            | Arabic              |
+---------------------+---------------------+
| bg_BG.po            | Bulgarian           |
+---------------------+---------------------+
| el_GR.po            | Greek               |
+---------------------+---------------------+
| ko_KR.po            | Korean              |
+---------------------+---------------------+
| ne_NP.po            | Nepali              |
+---------------------+---------------------+
| fa_IR.po            | Persian             |
+---------------------+---------------------+
| id_ID.po            | Indonesian          |
+---------------------+---------------------+
| sr_RS\@latin.po     | Serbian Latin       |
+---------------------+---------------------+
| ky_KG.po            | Kyrgyz              |
+---------------------+---------------------+
| tr_TR.po            | Turkish             |
+---------------------+---------------------+
| hu_HU.po            | Hungarian           |
+---------------------+---------------------+
| pt_BR.po            | Brazilian Portuguese|
+---------------------+---------------------+
| he_IL.po            | Hebrew              |
+---------------------+---------------------+
| et_EE.po            | Estonian            |
+---------------------+---------------------+
| eo.po               | Esperanto           |
+---------------------+---------------------+
| es_ES.po            | Spanish from Spain  |
+---------------------+---------------------+
| am_ET.po            | Amharic             |
+---------------------+---------------------+
| uz_UZ.po            | Uzbek               |
+---------------------+---------------------+
| uz_UZ\@cyrillic.po  | Uzbek Cyrillic      |
+---------------------+---------------------+
| hi_IN.po            | Hindi               |
+---------------------+---------------------+
| vi_VN.po            | Vietnamese          |
+---------------------+---------------------+

Then open this file and edit/translate it.

When translations are ready, you may contact us to include them as part of the add-on.
