.. _release_notes:

*************
Release Notes
*************

.. index:: release notes

v17.06
======

New Features
------------

* Support for essential Blender constraints.

    ``Copy Location``, ``Copy Rotation``, ``Copy Transforms`` and ``Track To``
    are available to use now. Also the following API methods have been
    added: :b4wref:`constraints.append_copy_loc`, :b4wref:`constraints.append_copy_rot`
    and :b4wref:`constraints.append_copy_trans`.

* Experimental Augmented Reality support.

    Check out the AR application to get the look of the feature we're going to improve much in our next releases. The application can be found in the ``apps_dev/AR`` folder and is also available in Project Manager.

* New logic node ``Set Camera Limits``.

    This node allows changing limits of the camera. Each limit can be set separately. Only limits available for current move style of the camera are applied after node execution.

* Improved AA rendering.
    
    Scheme of rendering post-processing effects has been changed. It increases performance and quality of the anti-aliasing.

* New experimental environment lighting algorithm for scenes with ``Cycles`` materials.

    Materials with ``Glossy BSDF`` and ``Diffuse BSDF`` nodes automatically enable environment lighting, which takes into account roughness of the glossy component.

    New algorithm requires WebGL 2.0 or WebGL 1.0 with available extension EXT_shader_texture_lod for correct work.

* Optimized rendering of reflections.

    Cube reflections for scenes with no reflexible objects has been optimized. Now in such scenes the sky is used for reflections directly without redrawing for each individual reflective object.

* Support for camera loading.

    From now on it's possible to load additional cameras to the scene using dynamic loading feature. 

* Physics API improvements.

    Added :b4wref:`physics.set_angular_velocity`. It allows to set object's angular velocity.

Changes
-------

* The "pivot" setting in the "params" parameter for the :b4wref:`camera.target_setup` method has been made optional.

* The Material API was improved to provide more clear messages in the browser console in case of errors. Also two methods have been added: :b4wref:`material.is_node_material` and :b4wref:`material.is_water_material`.

* Sequential video fallback for video textures isn't applied anymore in MS Edge due to the native support for HTMLVideoElement.

Fixes
-----

* Fixed incorrect rendering of materials with normal mapping.

* Fixed VR code snipped.

* Fixed keyboard events when the engine is working inside an iframe.

* MSAA is disabled from now on for Adreno 4xx/5xx GPUs to prevent some rendering bugs.

* Fixed translating/rotating of non-active cameras.

* Fixed getting coordinates for mouse/touch events via the :b4wref:`mouse.get_coords_x` and :b4wref:`mouse.get_coords_y` methods.

* Fixed bug with looped speakers that couldn't be stopped in Firefox after calling the :b4wref:`sfx.stop` and the :b4wref:`sfx.play` methods sequentially.

* Fixed sky redrawing after world node material parameters change.

* Removed auto applying modifiers for objects with the ``Array`` modifier.

* Fixed rendering artifacts for the transparent node materials in Firefox under Linux.

* Fixed applying a node material animation after material inheritance.

* Workers were disabled for physics simulation in IE11 and MS Edge to improve physics stability.

v17.04
======

New Features
------------

* Support for world materials in ``Cycles``.

   Now, sky rendering can be set up via ``Cycles`` material nodes. ``Background`` node is used to control the resulting color of the environment. Spherical environment maps with ``Equirectangular`` and ``Mirror Ball`` projection types are also supported. World materials can be animated using ``Value`` and ``RGB`` nodes both directly or by NLA. ``Use Nodes`` option for world objects is duplicated in the ``World`` properties panel.

* Experimental WebAssembly support for physics engine.

    From now on you can use the optimized version of the Uranium.js physics engine (our JavaScript port of the Bullet engine) compiled with WebAssembly. The new ``physics_use_wasm`` config property is available to enable this feature. The feature is considered experimental and disabled by default.

* Experimental support for VR controllers.

    Added :b4wref:`hmd.enable_controllers`. VR code snippet has been updated.
    The :b4wref:`controls.create_gamepad_orientation_sensor` and
    :b4wref:`controls.create_gamepad_position_sensor` methods have been added.

* Support for Alpha Anti-Aliasing blend mode for materials.

    This is a variant of the Alpha Clipping technique which looks much better on compatible hardware. This mode requires that MSAA is enabled, hence it can work only on WebGL2-capable devices. In other cases, ``Alpha Clip`` blend mode will be used as a fallback.

* Support for loading of GZIP-compressed resources.

    Instead of the standard ".json" and ".bin" files, the application can also load compressed files ".json.gz" and ".bin.gz". The same applies to DDS and PVR textures. This can be turned on in the Web Player by using the "compressed_gzip" :ref:`URL parameter <webplayer_attributes>`. To do this in a custom application, one should pass the "assets_gzip_available" flag in the :b4wref:`app.init` method. Compressed files can be generated by the Project Manager command "convert resources". However, GZIP-compressed resources should be used only if it's not possible to set up such compression on a server. More information can be found in the corresponding documentation section: :ref:`GZIP Compression <gzip>`.

* LOD system improvements.

    From now on LOD level switching can be performed smoothly by using alpha test, which makes the transitions less noticeable. The corresponding option is called ``LOD Smooth Transitions`` and can be tuned in the ``Scene -> Object Clustering & LOD`` panel. Keep in mind that enabling this for all objects can significantly reduce application performance.

    Also, a new option called ``Max LOD Hysteresis Interval`` has been added. Its intent is to eliminate continuous LOD switching when the camera moves near the border between 2 LOD levels. This option replaced the old ``LOD Transition Ratio`` parameter from the ``Object->Levels of Detail`` panel.

    See the documentation for detailed information: :ref:`Levels Of Detail <lods>`.

* RGBA shadows support.

    It allows shadows on some devices that do not support depth texture.

* Bloom effect improvements.

    New bloom algorithm has been implemented. Now it works with all lamp types and is not dependent on the direction of light. Also, adaptive average luminance calculation is available.

* Supported ``Non-Colour Data`` textures in Filmic Blender.

* Fallback for compressed textures.

    When a server returns the 404 error for gzip/dds/pvr textures, the engine now tries to load non-compressed images.

* Loading stages debug flag

    The :b4wref:`app.init` method now has the ``debug_loading`` flag which allows to track and debug loading stages through the console.

* Improvements in ``Normal Editor``.

    ``Factor`` option has been added for some operators for blending the initial and resulting states of normals.

    The option to use ``Face``  operator with multiple polygons has been added.

    New operator ``Scale`` has been added for scaling normal along axes.

    The functionality of some operators has been improved and they have been renamed in correspondence to their new possibilities: ``Tree`` -> ``3D Cursor``, ``Foliage`` -> ``Axis``.

* Added API for rendering normals of dynamic objects.

    The :b4wref:`debug.show_normals`, :b4wref:`debug.hide_normals` methods of the :b4wmod:`debug` module have been added.

Changes
-------

* Removed warnings for the force fields of the ``None`` type.

* The :b4wref:`scenes.get_sky_params` method now returns null for non-procedural sky.

* The ``Use Custom Color`` property in the ``Mist`` panel is now disabled by default.

* The :b4wref:`scenes.append_object` method now works for non-copied objects as well.

* SSAO ``Influence`` upper limit has been increased to 2.0.

* Canvas is no longer resized to 320x240 if one or both of its sizes have zero dimensions.

* Dimensions of the cube sky render target are adjusted dynamically after an environment texture image is changed. 

Fixes
-----

* Improved Russian translation for addon entries in the Help menu.

* Fixed some inaccuracies in the API documentation.

* Fixed ``Do Not Export`` option for objects used as LOD levels. Previously, it didn't work.

* Fixed problem with FPS decreasing in the Viewer app after selecting an object.

* Fixed LOD switching for dynamic objects, when more than one LOD level was rendered at the same time.

* Identical packed images/sounds are unpacked during export into a single file instead of multiple identical files.

* Fixed Normal Map node strength clamping. Values less than 0 now have no influence on the normal.

* Unnecessary fog updates for world animation were removed.

* ``Empty`` objects with dynamic materials no longer crash the engine.

* Fixed texture cloning bug which caused memory leaks.

* Fixed batch sorting by alpha_clip param.

* Fixed Foam + ShoreMap texture crash in water material.

* Fixed space conversion in ``Normal Editor``.

* Fixed ``Project Manager`` server behavior for nonstandard python environment.

* Fixed incorrect rendering of materials that use normal mapping.

* Fixed texture filtering for right eye in VR mode.

* Fixed crashes on IE11 in case of using :b4wref:`container.client_to_element_coords`.

* Fixed :b4wref:`scenes.is_hideable`, :b4wref:`scenes.show_object`, :b4wref:`scenes.hide_object` methods.

* Fixed crash for ``Cycles`` materials with non-connected ``Surface`` outputs.

v17.02
======

New Features
------------

* Project Manager improvements.

    To simplify project configuration a new visual configurator has been implemented. To configure your project just click on the *[config]* link near the project name on the Project Manager's main page. Project configurator works in a non-destructive way and allows you to change only editable params for the current project.

    The clone project functionality was added.

    JavaScript source maps were added. Source maps allow developer tools located in browsers to display unminified code from minified code with optimized "mapping" between them. To generate source maps specify *-b* flag to *project.py* script when building your project.

* User interface improvements.

    To make the task of creating Blend4Web content more efficient we refined the Blender UI.

    `Render` and `Help` menus have been modified for Blend4Web render engine.

    Messages about unsupported editors have been added.

    'Rigid Body' panel has been removed from View3d tools for Blend4Web render engine.

    Blend4Web credits have been added to the splash screen.

* Further support for materials powered by ``Cycles``.

    Support for ``Displacement`` output has been added. This output is used to easily add bump to material.

    ``Transparent BSDF`` node support has been added. This node is from the ``Shader`` category. It is used to add transparency without refraction, passing straight through the surface, as if there were no geometry there.

* Extended material inheritance.

    The :b4wref:`material.inherit_material` method was greatly improved to support node materials. It requires the source and the target objects to have the ``Dynamic Geometry & Materials`` option (which previously was named ``Dynamic Geometry``) enabled on the ``Object`` panel. This option also means that all UV and vertex color layers are exported to be available to use in any material that is applied to the target object. More information about using this functionality can be found in the :ref:`corresponding chapter <material_inherit>` in the documentation.

* "Code Snippets" improvements.

    The "Make project" button has been added. It is now possible to create new projects based on code snippets. It provides the possibility to use ready-made templates for further development.

* Camera improvements.

    Support for ``Horizontal`` and ``Auto`` camera fits has been added.

* Wind Bending setup API.

    Wind Bending parameters can now be set with :b4wref:`objects.set_wind_bending_params`, and they can be extracted with :b4wref:`objects.get_wind_bending_params`. Note that this API works only with dynamic objects. A special menu for Wind Bending was added to the :ref:`Viewer <viewer>` interface.

* Shadow Blur and reflection quality configuration

    New parameters: ``shadow_blur_samples`` and ``reflection_quality`` have been added to the :b4wmod:`config` module. They can be assigned with the :b4wref:`config.set` method.

* Support for Blend4Web addon customizations.

    To simplify Blend4Web addon customizations a new field *b4w_custom_prop* can be added to Object or Scene datablocks. This option can be exported to Blend4Web format and accessed in runtime by :b4wref:`scenes.get_custom_prop scenes.get_custom_prop` or :b4wref:`objects.get_custom_prop objects.get_custom_prop` methods. An example on how to use this feature can be found in `addons/blend4web/custom_prop_example.py` file in the SDK.

* Changes in the process of exporting UV layers.

    The restriction of 2 UV layers per mesh has been removed. Also, if a UV layer is not specified then the active layer is used instead of the first layer in the list as it was previously. Unused UV layers will not be exported unless the object property ``Dynamic Geometry & Materials`` is enabled.

Changes
-------

* Project Manager changes.

    "External" engine type was deprecated and replaced by "Copy" type automatically.

* Empty material slots are now correctly exported and do not stop export process.

* Blender addon now resides in an independent addon category named ``Blend4Web``.

* Incompatible textures and constraints now print warnings in Blender UI.

* Skeletal animation blending now works correctly for two animations. This feature is still experimental and API is subject to change.

* Static physical objects now correctly influence a scene when dynamically loaded or unloaded.

* :b4wmod:`fps` addon received several improvements. The :b4wref:`fps.enable_fps_controls` method now has several setup parameters. Refer to API documents for more details.

* API changes.

    The :b4wref:`container.set_canvas_offsets`, :b4wref:`container.update_canvas_offsets`, :b4wref:`container.force_offsets_updating` methods of the :b4wmod:`container` module have been declared deprecated and will be removed in future releases. Use the :b4wref:`container.client_to_canvas_coords` or the :b4wref:`container.client_to_element_coords` methods.

    The :b4wmod:`screen` module has been added.

    The :b4wref:`input.request_fullscreen_hmd`, :b4wref:`input.enable_split_screen`, :b4wref:`input.disable_split_screen`, :b4wref:`app.request_fullscreen`, :b4wref:`app.exit_fullscreen`, :b4wref:`app.check_fullscreen` methods have been declared deprecated. Use :b4wref:`screen.request_fullscreen_hmd` :b4wref:`screen.request_split_screen` :b4wref:`screen.exit_split_screen`, :b4wref:`screen.request_fullscreen`, :b4wref:`screen.exit_fullscreen`, :b4wref:`screen.check_fullscreen` instead.

    The :b4wref:`hud.draw_mixer_strip`, :b4wref:`hud.plot_array`, :b4wref:`screenshooter.shot` methods have been declared deprecated and moved to the :b4wmod:`screen` module. The :b4wmod:`hud`, :b4wmod:`screenshooter` modules have been declared deprecated.

    The :b4wref:`camera.set_hmd_fov` method has been declared deprecated.

    The `util.ground_project_quat` method has been renamed :b4wref:`util.ground_project_cam_quat`.

    The following deprecated methods have been removed: camera.set_move_style, camera.has_vertical_limits, camera.has_horizontal_limits, camera.move_pivot, camera.set_velocity_params, camera.get_velocity_params, camera.clear_horizontal_limits, camera.clear_vertical_limits, camera.clear_hover_angle_limits, camera.set_look_at, camera.rotate_eye_camera, camera.rotate_target_camera, camera.set_trans_pivot, camera.zoom_object, camera.set_pivot, camera.rotate_hover_camera, camera.get_hover_cam_pivot, camera.get_eye, camera.get_pivot, camera.hover_cam_set_translation, camera.set_hover_pivot, camera.get_hover_angle_limits, camera.get_cam_dist_limits, camera.apply_vertical_limits, camera.apply_hover_angle_limits, camera.apply_distance_limits, camera.clear_distance_limits, camera.get_vertical_limits, camera.apply_horizontal_limits, camera.get_horizontal_limits, controls.register_keyboard_events, controls.register_mouse_events, controls.register_wheel_events, controls.register_touch_events, controls.register_device_orientation, controls.unregister_keyboard_events, controls.unregister_mouse_events, controls.unregister_wheel_events, controls.unregister_touch_events, controls.unregister_device_orientation, app.resize_to_container, app.set_camera_move_style, app.enable_controls, app.disable_controls, hmd.get_hmd_device, hmd.reset, animation.get_first_armature_object, animation.get_bone_translation, constraints.get_parent, util.line_plane_intersect, util.is_mesh, util.is_armature, tsr.create_sep, sfx.is_play, scenes.check_object, scenes.get_object_dg_parent, nla.check_nla_scripts, main.resize, main.global_timeline, main.get_canvas_elem.

    The :b4wref:`input.add_click_listener`, :b4wref:`input.remove_click_listener` methods have been added.

* VR mode changes.

    Switching to VR mode can now be done without reloading the application in VR-capable browsers: WebVR-supporting browsers or mobile browsers.

    Camera autorotation is disabled when switching to VR mode.

    Added support for WebVR 1.1.

* The :b4wref:`physics.is_character` method no longer returns ``true`` if physics is disabled in an application.

* The paragraph :ref:`Non-Standard Canvas Position and Orientation <non_standard_canvas_pos>` was rewritten to reflect recent engine changes.
    
    Also, the new paragraph :ref:`Mobile Web Apps <mobile_web_apps>` was added to describe some aspects related to the orientation and the scaling of a browser's page.

* The :ref:`Material API <material_api>` paragraph has been added to the user manual. It describes how object materials can be adjusted using API methods from the :b4wmod:`material` module.

* The structure of the ``SSAOParams`` object used in the :b4wref:`scenes.set_ssao_params` and the :b4wref:`scenes.get_ssao_params` methods was changed to be more consistent.

* The :b4wref:`debug.object_distance` method has been declared deprecated, from now on the :b4wref:`transform.distance` method should be used instead.

* The :b4wref:`controls.create_ray_sensor` and the :b4wref:`npc_ai.new_event_track` methods no longer accept a non-physical object as a parameter, which led to engine crash.

* Video textures can no longer be changed via the :b4wref:`textures.change_image` method.

Fixes
-----

* Fixed bug when anchor description contains not only text nodes.

* Fixed crash for non-valid materials used by ``Emitter`` particle systems.

* Fixed some errors for same-titled linked objects and groups.

* Removed the duplicated ``Simplify`` panel created by Blend4Web in other Render Engines.

* Fixed texture caching with incompatible texture sources.

* Fixed emitter particle normals.

* Fixed Rendering to texture broken in the previous release.

* Several fixes for the :b4wref:`data.prefetch` method.

* Fixed SRGB color correction in ``Ultra`` mode.

* Fixed FPS reducing in iOS browsers.

* Fixed binary loading in case tmp directory doesn't allow execution. This issue was fixed by using standard Blender tmp path, which can be configured.

* More correct extending of node editor `Add` menu.

* assets.json has been removed from all blend files.

* Fixed the reloading of binary module when pressing F8.

* Fixed HMD configurator.

* Fixed bug when the visibility of scene layers in Blender can be changed after export.

* Fixed wrong behavior of video textures in Firefox.

* Fixed shadows and reflections for dynamic grass.

* Fixed shader compilation crash if the LOW quality profile was chosen.

* Fixed object selection and shadows for objects with a node material, which had the Alpha Clip blend mode.

* Fixed the checking of unsupported texture sizes.

* Fixed the overriding bounding volumes functionality for objects with shape keys.

* Fixed the selection and the outlining of LOD objects.

* Fixed engine crash when an object had the Array Modifier applied in Blender.

* Fixed bugs related to the :b4wref:`scenes.set_ssao_params` method.

* The Google Closure Compiler used for compiling the engine's scripts and applications was updated to the newest version. This helped to find and fix several minor bugs.

* Fixed engine crash when applying a shape key to an object with HAIR or EMITTER particle systems.

* Fixed the "Hidden" property for ``EMPTY`` objects used as anchors.

v16.12
======

New Features
------------

* Project Manager improvements.

    ``New File`` and ``Save As`` buttons were added to the project file editor. Also, to simplify navigation, the editor highlights edited files.

    Project Manager application builder now minifies compiled HTML files to speed-up their loading.

* New ``Cycles`` material nodes.

    ``Emission`` node support has been added. This node is from the ``Shader`` category. It is responsible for the light emitting component of the material. Node inputs include ``Color``, ``Strength``. In Blend4Web, materials which use this node only simulate the look of the surface and are not dynamic light sources.

* Improved rendering of LOD objects.

    From now on LOD objects are batched with respect to their LOD distance parameter and their proportions. Thus, the engine renders LOD objects
    as effectively as possible, trying to keep a reasonable amount of the combined objects at the same time. For tuning this behavior the ``LOD Cluster Size Multiplier`` parameter was added into the `Scene->Objects Clustering` panel.

* New API methods :b4wref:`data.prefetch` and :b4wref:`data.unfetch`.

    The first allows preloading resources of a scene (textures, sounds, files of
    the scene) and caches them. The second allows cleaning up the cache.

* Support for object picking on VR devices.

    The :b4wref:`scenes.pick_center` method has been added. It allows users to get an object in the center of the viewport using the object picking functionality. This method works both for general-purpose and for VR devices.

* Improved add-on interface.

    Now the stand-alone add-on does not show the development server panel.
    Extended warnings, that the development server is not available on the standalone add-on, have been added.

* Texture caching

    Now all image textures are cached and if a new texture with similar properties is requested, it will be taken from the cache. This results in saving memory and significantly speeds up the :b4wref:`textures.change_image` method for multiple objects.

Changes
-------

* Project Manager changes.

    The structure of Project Manager files was upgraded. Now new projects are placed in the ``projects`` directory. All assets are placed in the project folder.

    Please note that :b4wref:`config.get_std_assets_path()` no longer specifies project assets directory within the new file structure. Replace it with the :b4wref:`config.get_assets_path()` method.
 
    The ``upgrade file structure`` button was added to :ref:`upgrade the old projects to the new structure <updating_project_structure>`.

    Now text inside the project manager editor is indented with spaces instead of tabs.

* Lamp objects of the unsupported AREA type are changed to the type SUN during the export from now on. In this case, a related error message  will be printed in the browser console. 

Fixes
-----

* Fixed a bug with video textures on mobile Chrome.

* Fixed a bug with Alpha Sort type of transparency for static objects.

* Fixed a bug with incorrect rendering of materials that use normal mapping.

* Fixed a bug when the LODs of a single object were switched between each other with a very noticeable delay and none of the LODs were rendered at that very moment.

* Fixed a bug with dynamic grass on WebGL 2.0.

* Fixed a bug with Wacom tablet interaction.

* Fixed "Export to different disk is forbidden" message that was showing up when using fast preview.

* Fixed crash during the export of dupli groups without any attached objects

* Alpha values greater than 1.0 are now correctly processed for transparent materials.

* ``PARALLAX`` node no longer crashes node trees if its input texture has any output nodes apart from the ``PARALLAX`` node itself.

* Shader node trees are now pre-cleaned during export to get rid of unused nodes.

* Fixed viewport alignment in VR mode.


v16.11
======

New Features
------------

* Added partial support for materials powered by ``Cycles`` render nodes. List of currently supported ``Cycles`` nodes:

    ``Material Output`` node is similar to ``Output`` from ``Blender Internal`` except it utilizes a shader type input socket. ``Surface`` node input is the only one currently supported. This node defines material as a physically based rendered (PBR) material.

    ``BSDF Diffuse`` node is from the ``Shader`` category. It is responsible for the diffuse component of the material lighting and produces no visible reflections. Node inputs include ``Color``, ``Roughness``, ``Normal``. This node has single shader type output socket.

    ``BSDF Glossy`` node is from the ``Shader`` category. It is responsible for the specular component of the material lighting and reflections of the environment. Node inputs include ``Color``, ``Roughness``, ``Normal``. This node has single shader type output socket. The only currently supported specular distribution is GGX. This node automatically enables real-time cube reflections for the object, which uses the material and is not set as reflective. Reflexible environment and objects should be configured according to standard b4w pipeline. Roughness currently does not affect reflections.

    ``Mix Shader`` node is from the ``Shader`` category. This node is used to mix outputs of nodes from the ``Shader`` category. Node inputs include ``Fac``, which defines mixing ratio, and two ``Shader`` inputs. This node has single shader type output socket.

    ``Fresnel`` node is from the ``Input`` category. This node computes how much light is reflected off a material layer, where the rest will be refracted through the layer. The resulting weight can be used for layering shaders with the ``Mix Shader`` node. It is dependent on the angle between the surface normal and the viewing direction. Node inputs include ``IOR`` (index of refraction) and ``Normal``. This node has single scalar type output socket.

    ``Layer Weight`` node is from the ``Input`` category. This node defines a weight typically used for layering shaders with the Mix Shader node. Node inputs include ``Blend`` and ``Normal``. Node inputs include ``Fresnel`` and ``Facing``.

    Other supported nodes include ``Image Texture``, ``Environment Texture``, ``Object Info``, ``Bump``.

    Other partially supported nodes include ``Texture Coordinate`` (`From Dupli` parameter is not supported), ``UV Map`` (`From Dupli` parameter is not supported), ``Geometry`` (`Pointness` and `Parametric` outputs are not supported).

    Nodes supported in previous b4w releases, which are used in both ``Cycles`` and ``Blender Internal``, will also work fine with new PBR materials. Such nodes include ``Color Ramp``, ``Normal Map``, ``Camera Data``, ``Particle Info``, ``RGB``, ``Value``, nodes from the ``Converter`` category (except ``Blackbody`` and ``Wavelength`` nodes), nodes from the ``Vector`` category, nodes from the ``Color`` category (except ``Light Falloff`` node).

* Project Manager improvements.

    The project file editor was added. Now CSS, JavaScript, HTML and .b4w_project files can be edited in the Project Manager.

* New first-person (fps) add-on was added.

    The add-on helps to create first person applications easier. There are two main methods in it: :b4wref:`fps.enable_fps_controls` and :b4wref:`fps.disable_fps_controls`. The first creates default gamepad and keyboard controls, enables mouse and touch camera movement, enables VR camera rotation if VR mode is enabled. The second disables these controls. There are also other methods in the new add-on: :b4wref:`fps.bind_action`, :b4wref:`fps.set_character_state_changing_cb`, :b4wref:`fps.set_cam_smooth_factor`, :b4wref:`fps.set_cam_sensitivity`, :b4wref:`fps.set_plock_enable_cb`, :b4wref:`fps.set_plock_disable_cb`.

* Improvements with 3D Navigation Mesh.

    Now the :b4wref:`physics.navmesh_find_path` method of the :b4wmod:`physics` module finds 3d path, it allows us to construct paths on vertical surfaces. Previously, one was only able to construct path on horizontal planes.
    The parameters of the :b4wref:`physics.navmesh_find_path` method has been changed.
    Initialization time of navigation mesh has been reduced.
    A* algorithm has been improved.

* Blend4Web addon usability improvements.

    Blend4Web SDK Directory field in addon properties has been removed. Now, path to Blend4Web SDK directory resolved automatically.

Changes
-------

* API changes.

    The parameters of the :b4wref:`screenshooter.shot` method and the :b4wref:`main.canvas_data_url` method have been changed.

    A new function :b4wref:`camera.get_camera_angles_dir` has been added into the :b4wmod:`camera` module. It allows to get a camera's spherical coordinates from the given direction representing the view vector of a camera.

* Simplified Environment Setup.

    Water now uses the default wind when the wind object is absent in a scene. A water object is now always dynamic. Procedural sky uses the default sun direction when a sun object is absent in a scene.

* NPC AI now caches all animation on initialization.

    This slightly increases the loading time but removes real-time delays caused by npc animation.

* The ``Fast Preview`` button is now available in the Cycles render profile.

* The :b4wref:`scenes.get_all_objects`, :b4wref:`scenes.get_object_by_name` and :b4wref:`scenes.check_object_by_name` methods no longer return the engine's internal meta-objects, which are not intended to use in an application.

Fixes
-----

* Project Manager compatibility with the old build type ``update`` was added.

* Fixed bug with specific encoding in the Project Manager.

* Fixed bug with the same module names conflicting in the Project Manager.

* Specular shading bug was fixed.

    The bug, which happened when two or more lamps were used for material with
    the Blinn specular type, was fixed.

* NLA unloading bug was fixed.

    Now all objects belonging to the unloaded scene are removed from NLA.

* Stereo blinking bug was fixed.

    The bug appeared when using motion blur effect.

* Overwriting resources with the same names in temporary directory when using Fast Preview was fixed.

* Fixed Network error while downloading a screenshot.

* Fixed shader crash occurring in some scenes in LOW quality mode.

* Fixed engine crash for scenes without ``MESH`` objects.

* Fixed the :b4wref:`camera_anim.track_to_target` method, which previously performed incorrect zoom animation.

* Fixed a rare bug related to empty particle texture slots, which could lead to export crash.

* Fixed rendering of the procedural lines.

* Fixed ``Play Animation`` logic node bug when animation stopped playing after the first time.

* Fixed crash in navmesh module in web-browsers without support of `indexOf` method for `TypedArray`.

* Fixed silent failure in ``Project Manager`` during resource converting in case of `ffprobe` missing.

v16.10
======

New Features
------------

* Added support for navigation meshes.

    Two methods were added to ``physics`` module: ``navmesh_get_island`` for getting closest navmesh segment and ``navmesh_find_path`` for path finding.

    Two types of paths are available: one path based on centers of triangles, and a more optimal - ``pulled string``. 
  
    See example in the ``Code Snippets`` apps.

* New logic node ``Set Camera Move Style``.

    This node allows changing move styles and velocities of the camera. Target parameters for ``Target`` and ``Hover`` camera types can be set as separate coordinates or as a target object.

* Tangent shading support for edited normals.

    Tangent shading is now supported for edited normals.

* Improved Project Manager usability.

    Now applications, blend files and project assets open in new browser tabs. Having your Project Manager remain in the same window makes work more efficient.

    ``compile project`` command was renamed as ``build project``. This new name is more suited to the nature of this command.

* New environment texture blend types.

    Now all texture blend types are supported for environment lighting.

* ``Sphere`` flag is now supported for ``Point`` and ``Spot`` lights.

    This flag allows specifying a distance at which the light's intensity drops to zero.

* Rotated boundings.

    Now rotated bounding boxes are used for frustum culling calculations. Also,
    rotated bounding ellipsoid is now supported for dynamic objects.

* ``JS Callback`` logic node can now be called synchronously.
  
    Return ``true`` from your callback for freezing nodetree execution in this node and ``false`` when the node has finished its execution.

* New API methods :b4wref:`scenes.get_fog_params` and :b4wref:`scenes.set_fog_params`.

    These methods allow controlling mist in a scene. Fog params contain `fog_intensity`, `fog_depth`, `fog_start` and `fog_height` properties.

* New API method :b4wref:`anchors.update`.

    This method allows to update anchors positions.

* Added support for VBO buffers of different types.
    
    Some attributes were changed to be of the type ``UNSIGNED BYTE`` and ``SHORT`` instead of ``FLOAT`` without loss in quality that reduced  total GPU memory cost. This also affects performance and can increase frame rate in some demos. Along with that the size of exported ``.bin`` files was slightly decreased by changing the export type of vertex colors from ``SHORT`` to ``UNSIGNED BYTE``.

* In ``ULTRA`` mode the correct SRGB-conversion function is now used instead of a simplified one.

    The effect is mostly notable in dark areas where the simplified function doesn't yield precise colors.

* Added special buttons for enabling/disabling the ``World Background`` option in 3D VIEW panels.

    These buttons are disposed in the ``World`` tab and should be used if the ``Render Sky`` option is set. Enabling the ``World Background`` shows world colors in the viewport (the same as in the engine).

Changes
-------

* Refactored projects inside the SDKs.

    Now all projects (including tutorials) inside the SDKs follow the standard Project Manager directory hierarchy.

* Removed scenes list from the Viewer app.

    The same functionality (browsing and viewing project assets) can be carried out using the Project Manager.

* API documentation of the :b4wmod:`input` module has been expanded, examples of using functions have been added.

* The number of :ref:`batches <batching>` was decreased which optimizes scene rendering.

    This optimization mostly affects shadows and hair particles. It enhances frame rate in scenes that use this functionality.

* Now keyboard device is attached to document object by default.

* Added ``None`` as a new Engine Binding Type.

    This means the Project Manager will not change your projects during the build phase.

* Removed the ``Update`` Engine Binding Type.

    Use the ``Copy`` Engine Binding Type and the Project Manager's deployment feature to reproduce the same behavior.

* Added light versions of the SDK builds.

    Now Blend4Web PRO and Blend4Web CE SDKs have lighter versions available, which do not include demo applications and tutorials. These versions are recommended for users with a slow internet connection.

* Depth textures was enabled for the Intel HD Graphics 3000 which allows the use of such effects as shadows, god rays, depth of field and others on this device.

* Now NLA animation takes frame start/end values from *vertex* animation itself.

    This allows having multiple vertex animations controlled by NLA for one object.

* Some mobile devices (including IOS) now do not force low quality nodes in materials.

* API documentation for :b4wref:`scenes.~BloomParams` has been added. Some parameters have been renamed.

* Changed payload of mouse_click, mouse_move, touch_click and touch_move sensors. Now it's a dictionary, containing absolute coordinates (``coords``) for all mentioned above; ``which`` for mouse click; ``gesture`` for touch_move.

* ``default_AND_logic_fun`` and ``default_AND_logic_fun`` logic functions are now available in ``controls`` module.

* Removed deprecated scripts for binary module cross-compilation.

* API methods :b4wref:`objects.set_nodemat_value`, :b4wref:`objects.get_nodemat_value`, :b4wref:`objects.set_nodemat_rgb` and :b4wref:`objects.get_nodemat_rgb` are now deprecated and moved to the :b4wmod:`material` module.

Fixes
-----

* Fixed the :b4wref:`util.quat_to_euler` function.

* Fixed incorrect behavior of the ``Normal Map`` node with non-unit strength parameter.

* Fixed some runtime checks for objects in logic nodes.

* Fixed the inability to change a texture on one object (the :b4wref:`textures.change_image` function) when it is shared between multiple materials.

* ``CookTorr`` specular model now looks similar to the one in Blender.

* ``Alpha Sort`` materials now behave correctly for non-deep copies of objects.

* Fixed the :b4wref:`math.create_pline_from_point_vec` and :b4wref:`math.set_pline_initial_point` methods.

* Walking characters with a behavior based on the :b4wmod:`npc_ai` module now do not fall underground.

* Fixed bug when two or more anchors of type ``Custom Element`` can reference the same element id.

* Fixed reflections for spherical billboards.

* Fixed audio resuming after pausing for the ``Background Sound`` and the ``Positional Sound`` speakers in Firefox.

v16.09
======

New Features
------------

* Web Player improvements.

    An option to set up social network buttons located in the bottom-right corner of a loaded scene. To do this, you need to specify the ``socials`` :ref:`attribute <webplayer_attributes>` before the application starts.

* Coordinate System change.

    Now Blender's coordinate space is used instead of OpenGL's. This new behavior can introduce various incompatibilities in application logic. Developers are advised to review their apps and make changes according to the new coordinate space (Z vector up).

* Optimized geometry rendering.

    Geometry rendering has been optimized by implementing a new algorithm for storing data in GPU memory. Now normal and tangent data has been stored in TBN quaternions.

* Project Manager improvements.

    Added the new ``update_modules`` command to the *project.py* utility. This command allows users to update engine's modules inside developed applications. This feature significantly simplifies updating project files to newer Blend4Web versions.

* Automatic quality detection.

    By specifying the AUTO (:b4wref:`config.P_AUTO`) quality profile in the :b4wmod:`app` module you can load your app in LOW or HIGH quality depending on your hardware specs. Also, a low-level performance benchmark can be executed using the :b4wref:`debug.test_performance` method.

* PVRTC conversion support.

    PVRTC conversion is now supported. This allows developers to use compressed textures on iOS and PowerVR-based Android devices.

* Shadow quality settings added.

    Now it is possible to set different quality profiles for soft shadows: 16x, 8x, 4x.

* ``Shading`` panel was added to the ``Render`` tab. It contains ``World Space Shading`` option and ``Set Recommended Options`` button to auto configure Blender for better Blend4Web experience.

* Added support for Blender 2.78.

    ``World Space Shading`` option paired with the support for environment lighting for the GLSL mode in viewport makes rendered b4w scene maximally match it's viewport preview.

    New shader node ``Normal Map`` is fully supported.

Changes
-------

* The system for assigning shader directives was refactored. This feature reduces engine loading time and simplify debugging.

* Rendering the anchors was speeded up on some devices by using the "translate3d" CSS property.

* Shader validation has been improved, which decreases amount of false negative errors. More error descriptions have been added.

* Major part of shader computations was moved from matrices to TSR to increase performance.

* The ``Render`` tab panels' order was rearranged.

Fixes
-----

* Fixed the bug in the Samsung Internet browser when it hung if there were many anchors in a scene.

* Fixed Web Player "alpha" attribute, which didn't work.

* Fixed compilation/linking shader error message.

* Fixed rotation at angle defined by variable value in the ``Transform Object`` logic node.

* Fixed behavior of the ``Play Animation`` logic node in case of baked and non-baked versions of the action co-exist.

* Fixed quality settings for plane reflections.

* Fixed :b4wref:`transform.get_translation_rel` and :b4wref:`transform.get_rotation_rel` methods.

* Fixed dof_distance setting with :b4wref:`scenes.set_dof_params` method.

* Fixed the bug when an object with both ``Do Not Render`` and ``Enable Outlining`` options enabled led to the engine crash after it was selected.

* Fixed physics for particle system.

v16.08
======

New Features
------------

* Materials ``Tangent Shading`` option is now supported.

    This option can be used to imitate anisotropic material surfaces, such as polished metals, hair, etc.

* Shader node ``Normal Map`` is now supported.

    This node allows converting color data from texture to a normal map. The input data can be in tangent, object or world coordinate space. The ``Strength`` parameter controls the mixing values extracted from the texture with an object's default normals.

    The color space of a texture image should be set to ``Non-Color`` to make Blender's viewport preview match the final Blend4Web scene.

* Engine CPU optimizations.

    Several CPU and GC (Garbage Collector) optimizations have been made in the engine's core systems. ``OES_vertex_array_object`` extension was supported on appropriate hardware. Uniform and shader usage was also optimized reducing the total amount of WebGL calls. This should improve scene load time and rendering responsiveness, especially for slow CPUs.

* Interface improvements in the Viewer app.

    The ``Tools & Debug`` panel has been moved and is now located directly under the ``Scenes`` panel.

    The ``Min capabilities mode`` button has been added to the ``Tools & Debug`` panel. This parameter makes the Viewer app run the loaded scene as if it was running on a low-end system (such as iOS devices). This allows an artist to find out which materials in the scene may not work as intended on a low-end configuration.

* Normal editor improvements.

    Added ``Offset`` mode for normal editing.

    Added ``Average`` operation support for non-split normals.

    Added the possibility to type the angle of normal rotation just like inputting an object's rotation.

* New API method in the :b4wmod:`textures` module.

    The :b4wref:`textures.get_texture_names` method has been added. It allows us to get all object texture names.

* New API methods in the :b4wmod:`lights` module.

    The :b4wref:`lights.get_light_color`, :b4wref:`lights.set_light_color`, :b4wref:`lights.get_light_energy` and :b4wref:`lights.set_light_energy` methods have been added. These are used to work with the color and energy values of a lamp.

* Support for ``Hidden`` object property.
 
    This flag hides objects upon scene loading.

* Support for GLSL ES 3.0 shaders.

    From now the engine automatically chooses which version of the OpenGL Shading Language should be used to compile/link shaders. It depends on the WebGL context: GLSL ES 1.0 version is used for WebGL 1, and GLSL ES 3.0 - for WebGL 2. The engine's shader system and macro preprocessor was also changed to be compatible with both of these variants.

    This feature lifts restrictions on implementing new functionality related to WebGL 2 without compatibility issues.

* Improvements in Shader Analyzer.

    Shader Analyzer (method :b4wref:`debug.analyze_shaders`) now prints low-level assembly code which helps in reviewing and optimizing shaders.

Changes
-------

* Depth-of-field (DOF) bokeh effect algorithm improvements.

    Intensity leakage (or pixel bleeding) artifact, when foreground objects in focus appear to 'leak' onto blurry backgrounds, has been reduced.

    The ``Foreground Blur`` property has been added. When enabled, it reduces the appearance of sharp silhouettes on unfocused foreground objects against focused backgrounds.

    ``Front Start``, ``Front End`` properties for foreground and ``Rear Start``, ``Rear End`` for background allows us to specify distances at which a blur starts and reaches the maximum value.

* World is now reflected by default.

* Shader validation algorithm has been improved.

    If material cannot be rendered on low-end devices, it is replaced by error (pink) material in debug and it is removed in production.

Fixes
-----

* Inversion vertex group length fix.

    The inversion operator of *HAIR* particle system for vertex group length has been fixed.

* Fixed normal rotation for transformed object in `Normal Editor`.

* Fixed rare engine crash occurred during scene loading if logic nodes were used in a scene.

* Fixed material panel in the Viewer app. It was disabled for some materials, which are allowed to edit.

* Fixed engine crash on mobile devices.

* Fixed flickering on mobile browsers.

* Dynamic water object loading crash has been fixed.

* Fixed normalmap influence on reflections for stack materials.

* Disabled gray highlighting when tapping in WebPlayer on iPad.

v16.07
======

New Features
------------

* Optimized Particle system rendering.

    Now WebGL instancing capabilities are used (provided by the ANGLE_instanced_arrays extension or WebGL 2.0) to render ``Object``-type particles. This type of rendering is more memory efficient and, in some cases, also improves rendering performance.

* Reduced input latency on mobile devices.

    Now the engine ignores mouse events that represent actions that already have been handled by internal Blend4Web touch-event handlers on mobile versions of Chrome, Firefox, Safari. It reduces delays in user actions.

* Audio system improvements.

    Automatic audio context creation. The ``Audio`` checkbox has been removed from the addon. If necessary, scene audio context is created automatically.

    Doppler effect implementation. In recent versions of WebAudio spec Doppler effect was removed. It's now supposed that application developers should implement this effect themselves. From this release you can use in-engine implementation. A new option called ``Enable Doppler`` has been added, replacing the deprecated ``Disable Doppler``.

    Reworked audio interface. New settings have been designed to be as close as possible to the native Blender settings. This includes support for such settings as ``Speed``, ``Doppler`` and ``Distance Model``.

    New ``Auto-play`` speaker option. This option enables speaker playback by default.

    Preliminary support for complex audio loops. Using new ``Loop Start`` and ``Loop End`` options as well as :b4wref:`sfx.loop_stop` API method you can create complex audio loops, which include start, loop and stop sections in one audio buffer. For example, you can create basic ADSR (attack, decay, sustain, release) envelopes using this new API.

* Support for multi-touch selection in selection sensor.

   Now selection sensors are able to use multi-touch selection in `Event-Driven Model <https://www.blend4web.com/doc/en/developers.html?highlight=sensor#event-driven-model>`_.

* Node materials animation improvements.

    Now any node animation can be applied to any node material or its nested node groups. Also, there is a new :b4wref:`animation.apply_ext()` method that allows specifying material or a node group that is to be animated.

* A new method has been added into the :b4wmod:`preloader` module: :b4wref:`preloader.create_preloader`.

* Configuration parameters ``max_fps``, ``max_fps_physics``, ``use_min50``, ``anisotropic_filtering``, ``shadows``, ``reflections``, ``refractions``, ``ssao``, ``dof``, ``god_rays``, ``bloom`` and ``motion_blur`` have been added to the :b4wmod:`config` API module.


Changes
-------

* Color picking optimization.

    Now color picking uses very narrow frustum and a small framebuffer size (``1 x 1`` pix).
    Also, amount of :b4wref:`scenes.pick_object` calls has been reduced. This improves
    performance of selection sensor.

* Depth-of-field (DOF) effect improvements.

    DOF effect performance has been increased.

    An experimental DoF effect algorithm has been added. It varies the amount of blur depending on depth and produces bokeh effect on blurred objects. New algorithm can be enabled via ``Bokeh`` property from the camera properties panel in Blender.

* API changes.

    The :b4wref:`preloader.create_simple_preloader` method of the :b4wmod:`preloader` module has been declared deprecated and will be removed in future releases.


Fixes
-----

* Fixed the broken Canvas Resolution Factor slider in the Scene Viewer.

* Fixed ``get_matrix``, ``set_matrix``, ``get_matrix_rel``, ``set_matrix_rel`` methods of the ``transform`` module.

* Fixed definition of the ``resize_to_container`` method of the ``container`` module.

* Fixed performance regression caused by resizing the canvas.

* Fixed cameras linked from other scenes or dupli-groups not present in the scene.

* Fixed incorrect canvas alpha with Bloom post effect.

* Fixed Viewer ``Stop All`` animation button.

* Fixed object picking for stack material.

* Fixed glow effect on Safari.

v16.06
======

New Features
------------

* Fast Preview improvements.

    If necessary, the development server copies all external resources into the tmp directory. This allows previewing scenes which are placed outside the SDK (another directory, flash drive, etc).

* Project Manager improvements.

    Support for material library. A new project option has been added allowing users to copy the material library sources into the project directory.

    Added the new ``--ignore`` command property to the *project.py* utility. This option allows users to ignore files during compilation or deployment.

    Added the new ``check_modules`` command to the *project.py* utility. This command allows users to check missing or no longer required modules.

* :ref:`Experimental support of the GearVR<stereo>` virtual reality headset.

    Support for new WebVR API 1.0 has been added to the engine allowing the use of GearVR devices.

* Support for GIF and BMP textures.

    Non-animated GIF and BMP images can now be used as textures.

* Resource Converter improvements.

    Now many more media extensions are supported. For detailed information see :ref:`the documentation <converter_data_format>`.

* Automatic export path determination in Blender addon.

    When projects, created using Project Manager, are exported for the first time, a path to the assets directory is automatically resolved.

* Support for parallel animations in the Logic Editor.
  
    It is now possible to apply several parallel animations with the Logic Editor. Previously, only one animation per object was allowed in the Logic Editor. Now, an object can have one animation of each type. The maximum number of possible animations is 8.

* Improved Viewer profiling capabilities.
  
    Added a special mode for profiling objects' rendering time in the Viewer application.

* ``Lens Flare`` material property.

    A new material property has been appended to the material render panel.
    Note, that this works only when there is a ``Sun`` light source in a scene.

* Clip Start and Clip End options for light sources.

    The Clip Start and Clip End properties have been supported for the shadow settings of ``Point`` and ``Spot`` lamps.

* HTML meta elements in Web Player app.

    New HTML meta elements have been added into the WebPlayer HTML templates for compatibility with different social networks.

Changes
-------

* Several material nodes are now using Blender's viewport world space.

    * ``Geometry``

        The ``Normal`` output provides data in Blender's world coordinate space.

        The ``View`` output provides data in Blender's view coordinate space.

    * ``Texture``

        The ``Vector`` input  for environment textures receives data in Blender's world coordinate space.

        The ``Normal`` output provides data in Blender's world coordinate space.

    * ``Material``

        The ``Normal`` input receives data in Blender's world coordinate space.

        The ``Normal`` output provides data in Blender's world coordinate space.

    * ``Lamp Data``

        The ``Light Vector`` output provides data in Blender's world coordinate space.

    * ``B4W Vector View``
    
        The node's input receives data in Blender's world coordinate space.

    * ``B4W Reflect``
    
        The first node's input (used for view vectors) receives data in Blender’s view coordinate space.

        The second node's input (used for normals) takes data in Blender’s world coordinate space. 

        The node's output provides data in Blender's world coordinate space.

* Now color picking and anchors are disabled in stereo-mode.

* Now keyboard sensors do not active when using browser shortcuts.

* API changes.

    The :b4wref:`app.resize_to_container` method of the :b4wmod:`app` module
    has been declared deprecated and will be removed in future releases.
    :b4wmod:`container` module's :b4wref:`container.resize_to_container()`
    method should be used in its stead.

* The Bloom ``Key`` option has been renamed ``Intensity``.

* Deprecated functionality.

    The following methods: ``textures.get_canvas_texture_context()``,
    ``textures.update_canvas_texture_context()`` have been removed.

    The following logic nodes: ``Select``, ``Select & Play Timeline``, ``Select & Play Animation`` have been removed.

* Export errors and warnings now include links to the documentation.

* Proper reporting of incorrect addon directory.

    An incorrect addon directory name now generates a corresponding warning message.

* Dealing with cases when water is used without wind.

    If the water shader is used without wind, a warning message appears.

* Debug console error messages for unsupported image, video and audio formats have been added.

Fixes
-----

* Fixed decreased performance in stereo-mode.

* Fixed ``window.screen.orientation.angle`` obfuscation.

* Fixed rendering issue in Firefox browsers with enabled WebGL 2.0 context.

* Fixed right-eye rendering in stereo-mode.

* Fixed rendering for glow materials with the ``Terrain Dynamic Grass`` option enabled.

* Removed redundant angular velocity of particles if the ``Rotation`` option is disabled.

* Fixed rendering particles with non-node, non-Opaque materials.

* Fixed several GPU memory leaks.

* Fixed engine crash when using wrong callback id in the ``JS Callback`` logic node.

* Fixed engine crash in the rare case, when a node material has several ``Texture`` nodes with the same texture.

* Fixed the bug which caused the ``Diffuse Intensity`` input of the ``Material`` and ``Extended Material`` nodes to ignore the incoming link.

v16.05
======

New Features
------------

* Experimental HMD configurator.

    Add-on ``hmd_conf.js`` has been added. It allows users to set up HMD parameters manually. For now, this configurator has been implemented in the Viewer app and can be executed by the button located on the *Stereo View* panel. For more information see API documentation on the :b4wmod:`hmd_conf` module.

* Experimental configurator for gamepads and other game controllers.

    Add-on :b4wmod:`gp_conf` has been added to API. It contains two main functions: :b4wref:`gp_conf.show` and :b4wref:`gp_conf.hide`. For now it supports controllers and steering devices.

    To test this configurator in the Viewer app activate the *Gamepad Settings* check box on the *Input Devices* panel.

* New code snippets.

    New code snippet demos have been added. Their names are Gamepad,
    Webcam and Change Image. The first one can help you to integrate gamepads into
    your project, the second shows you the Camera API in action and the third one
    is the implementation of the new texture functions.

* A new ``Vector Transform`` material node.
  
    This node can be used to convert input data between object, world and camera coordinate spaces.

* A new ``Empty`` logic node.
  
    This node can be used to simplify rerouting complex logic node configurations.

* Dynamic replacement of texture images.

    A new method :b4wref:`textures.change_image` has been added. It's possible now to replace textures and cubemap bitmaps via API.

* Batching based on a new clustering algorithm.

    Batching, that is, the process of combining similar objects for performance reasons, is now based on a new clustering algorithm applied at export. This improves the whole batching process by making it "smarter" and more optimized in comparison with the old regular grid batching.

* Project Manager improvements.

    To maintain naming consistency all command line options in *project.py* utility are now specified with ``-`` symbol instead of underscore, e.g ``--engine_type`` option has become ``--engine-type``.

    Added the new ``--assets-dest`` command property to *project.py* utility. This option allows users to specify a destination directory for storing assets in deployed projects.

* New materials in Material Library

    4 new materials have been added to the Pro SDK Material Library: Gold, Ribbed Glass, Silk and Velvet. 


Changes
-------

* UI and export usability improvements for objects with no option from the ``Export Options`` list selected.

    ``Export Shape Keys`` is selected automatically after adding a shape key.

    ``Export Vertex Animation`` is selected automatically after baking vertex animation.

    ``Apply Scale and Modifiers`` is automatically used during the export process for non-uniform scaled objects, which meet the following requirements:

         Has no vertex animation.

         Has no parent object.

         Has no skinning.

         Object physics is disabled.

    ``Apply Modifiers`` is automatically used during the export process for objects, which have modifiers and meet the following requirements:

        Has no vertex animation.

        Has no skinning.

* Z sorting in ``Alpha Sort`` materials is now performed based on the sizes of objects.
  
    This can lead to more frequent sorting updates which impairs performance, but fixes sorting issues on small objects.

* New frustum culling algorithm.

    Now we calculate frustum culling using specific mesh materials instead of objects.

* Gamepad sensor changes.

    New button and axis identifiers have been added to the :b4wmod:`input` module. Also, gamepad sensors have been renamed as :b4wref:`controls.create_gamepad_btn_sensor` and :b4wref:`controls.create_gamepad_axis_sensor`.

* ``Entry Point`` logic nodes with the ``Run From Script`` option selected can now be called from API multiple times.

* API changes.

    The :b4wref:`preloader.create_rotation_preloader` method  of the :b4wmod:`preloader` module has been declared deprecated and will be removed in further releases.

    The :b4wref:`preloader.create_advanced_preloader` method of the :b4wmod:`preloader` module has been declared deprecated and will be removed in further releases.

    The :b4wref:`input.set_config` method has been added to the :b4wmod:`input` module.

    The :b4wref:`input.register_device` method of the :b4wmod:`input` module has been declared deprecated and will be removed in further releases.

    The `gyro_use` flag of the :b4wmod:`config` module has been removed (not needed anymore).

    Now functions of the :b4wmod:`storage` module have an optional last parameter.

    The :b4wref:`util.is_ie11` method has been added to the :b4wmod:`util` module.

* Now the state of a keyboard button is stored in the payload of the keyboard sensor.

    For more information see API documentation on the :b4wref:`controls.create_keyboard_sensor` method.

* The link to the troubleshooting page in the WebPlayer "Browser could not initialize WebGL" message has been changed to a more appropriate one.

    Now it refers one to the "Problems and Solutions" page in the documentation.

* The documentation has been considerably expanded with detailed descriptions for Anchor and Viewport Alignment features.

Fixes
-----

* Fixed issue with incorrect automatic updates in addon.

* Fixed anchors behavior with logic nodes.

* Fixed ``JS Callback`` logic node obfuscation.

* Fixed issue with incorrect sensor removal in ``controls.remove_sensor_manifolds`` method.

* Fixed issue with incorrect age and compression ratio in distribution zip files.

* Fixed multi-sampling issue in Firefox browsers.

    Disabled partially supported multi-sampling in Firefox WebGL 2.0 implementation.

* Fixed error when canvas resolution wouldn't change when Anti-Aliasing quality settings were changed.

* Fixed error when the diffuse intensity value would be applied to shadeless materials.

* Fixed engine crash in the case when ``B4W_GLOW_OUTPUT`` and ``B4W_REFRACTION`` nodes were used in the same material.

* Fixed the duplication of the ``Custom Properties`` panel in Blender's interface for the ``Font``, ``Curve``, ``Lattice``, ``Armature`` and ``MetaBall`` data types.

* Fixed some errors in the compiled version of the engine.

* Fixed issues with ``input`` and ``controls`` modules.

* Fixed issue when node materials using the ``ColorRamp`` node were incorrectly batched.

* Fixed incorrect HTTP server shutdown.

v16.04
======

New Features
------------

* Support for gamepads and controllers.
  
  It's possible now to use gamepads and controllers as input devices. New functions have been added to work with these devices. The first one is :b4wref:`controls.create_gamepad_btn_sensor`. It handles gamepad buttons. The second one is :b4wref:`controls.create_gamepad_axes_sensor`. It handles gamepad axes.

* Node Logic Editor improvements.

    Logic node `JS Callback` has been added. It allows to call custom JavaScript callback defined in your B4W application. Input and output parameters are supported for callbacks.

    An option ``Run From Script`` has been added to ``Entry Point`` node.

    Module :b4wmod:`logic_nodes` has been added to API. It contains methods to control Node Logic Editor.

    Method :b4wref:`logic_nodes.append_custom_callback` has been added. It allows to register custom JavaScript callbacks to be used in `JS Callback` logic node.

    Method :b4wref:`logic_nodes.remove_custom_callback` has been added. It allows to remove registered custom JavaScript callback.

    Method :b4wref:`logic_nodes.run_entrypoint` has been added. It allows to activate ``Entry Point`` node from API.

* A new function has been added into the :b4wmod:`controls` module: :b4wref:`controls.create_hmd_position_sensor`.
    
    This function allows to create a special sensor, which can track the position of an HMD device.

* The options ``Tilt Angle`` and ``Tilt Random`` are now supported for the ``Emitter`` particle systems.

* Reflection for transparent objects.
  
    Before this release only opaque objects could be reflected. Now, transparent objects are also supported.

* Updated math modules.

    Math modules :b4wmod:`vec3`, :b4wmod:`vec4`, :b4wmod:`quat`, :b4wmod:`mat3`, :b4wmod:`mat4` are now based on glMatrix v2.3.1. This new version introduces :b4wref:`vec3.hermite`, :b4wref:`vec3.bezier`, :b4wref:`quat.sqlerp`, :b4wref:`mat4.fromRotationTranslationScale` and :b4wref:`mat4.fromRotationTranslationScaleOrigin` methods.

* A new flag ``Bake only deform bones`` has been added to the Skeletal Animation Baker.

    Previously, it was impossible to bake bones without the ``deform`` flag. This feature can be helpful in cases when some object is parented to the non-deforming bone.

* New ``GL Debug`` switch in the Viewer app.

    Viewer application now has the ``GL Debug`` switch which allows to disable GL error checking. This increases the performance and can be useful while profiling a scene.

* Enable WebGL 2.0 for Firefox browser.

    It's now possible to use experimental WebGL 2.0 context in Firefox browser.

* New ``prevent_caching`` engine configuration option.

    This option enables/disables assets caching.

* New physics function has been added.

    :b4wref:`physics.apply_force_world` function applies a constant force to the
    object in the world space.


Changes
-------

* Viewer's ``HUD Info`` now has detailed info on each column.

* Node Logic Editor changes.

    * An option to select between ``Number`` and ``String`` operand types has been added to the ``Conditional Jump`` node.

* The activation of the VR mode from now automatically changes the camera type to ``EYE`` for better user experience.


Fixes
-----

* Fixed anchors behavior.

* Fixed a cubemap issue for some old NVIDIA GPUs in Firefox.

* Fixed the bug for particle systems with the "Length" vertex group specified when the emitter mesh has the "Apply Modifiers" option checked.

* Fixed the behavior of the B4W_GLOW_OUTPUT node for transparent materials.

* Fixed grass map for a single flat grass terrain object.

* Refraction vectors for stack and node materials now use correct view normal.

* Fixed God Rays Blender interface tab.

* Viewer Sky parameters updates have been fixed.

* Fixed incorrect stereo (anaglyph and HMD) rendering in specific cases.

* The ``Page Param`` node bug, which always wrote result to the variable ``R1``, has been fixed.

* Updating variable's scope in Node Logic Editor has been fixed.

* Fixed crash with dynamically loaded scenes while using ``Move Camera`` logic node.

v16.03
======

New Features
------------

* Node Logic Editor improvements.

    Now you can use global variables for sharing information between threads. This significantly expands the capabilities and allows to create more complex interactive applications.

    Logic node `JSON` has been added. It allows to parse and encode complex JSON objects.

    Logic node `Get Timeline` has been added. It allows to get current frame from NLA or global timeline.

    Logic nodes `Play Animation` and `Stop Animation` have received environment animation mode.

* New option ``Update Material Animation`` for updating animated node shaders in viewport.

    This option is useful for those who often use animated shader nodes. Just turn it on to see material animation in Blender viewport.

* Separate Project Manager server from Blender addon.

    Starting from this release it's possible to run the Project Manager server as a standalone application using *project_server.py* script. 
    This eliminates the requirement to start Blender to be able to run the Project Manager.

* Add title/description to all Blend4Web demos.

    This simplifies searching our demos in Google and other search engines.

* New modules have been added.

    The first new mathematical module that was added is called :b4wmod:`math`. For more
    information, please take a look at `the API doc <https://www.blend4web.com/api_doc/index.html>`_.
    
    Also, an :b4wmod:`input` module has been added. This module provides an interface for input devices: 
    mouse --- :b4wref:`input.DEVICE_MOUSE`, 
    keyboard --- :b4wref:`input.DEVICE_KEYBOARD`,
    touchscreen device --- :b4wref:`input.DEVICE_TOUCH`, 
    gyroscope device --- :b4wref:`input.DEVICE_GYRO`, 
    head-mounted device --- :b4wref:`input.DEVICE_HMD`.
    For more information see API documentation on the :b4wmod:`input` module.

* Changed policy for backward compatibility with previous Blender releases.

    Starting from this release we will strive to keep the addon compatibility with previous Blender versions.

* HTML links have been supported in an anchor description.

* Objects from secondary scenes(rendered to textures) can now be controlled with logic nodes.

* The ``Dynamic Grass`` option was added to the render interface.
    
    There are 3 options available: *ON* to enable dynamic grass constantly, *OFF* to disable dynamic grass completely and *AUTO* to automatically detect objects with dynamic grass.

Changes
-------

* API changes.

    The :b4wref:`controls.enable_controls` and :b4wref:`controls.disable_controls` of :b4wmod:`app` add-on have been declared deprecated.

    Several methods of :b4wmod:`controls` module have been declared deprecated: :b4wref:`controls.register_keyboard_events`, :b4wref:`controls.register_mouse_events`, :b4wref:`controls.register_wheel_events`, :b4wref:`controls.register_touch_events`, :b4wref:`controls.register_device_orientation`, :b4wref:`controls.unregister_keyboard_events`, :b4wref:`controls.unregister_mouse_events`, :b4wref:`controls.unregister_wheel_events`, :b4wref:`controls.unregister_touch_events`, :b4wref:`controls.unregister_device_orientation`.

    The :b4wref:`controls.create_touch_click_sensor` and :b4wref:`controls.create_hmd_quat_sensor` methods have been added to the :b4wmod:`controls` module.

    The :b4wref:`controls.get_hmd_device` and :b4wref:`controls.reset_device` methods of :b4wmod:`hmd` add-on have been declared deprecated.

    Several methods have been added to :b4wmod:`util` module: :b4wref:`util.deg_to_rad`, :b4wref:`util.rad_to_deg`, :b4wref:`util.quat_to_ordered_angles`.

    The :b4wref:`scenes.get_world_by_name` method has been added to the :b4wmod:`scenes` module.

* API for camera has been changed.

    The :b4wref:`camera.calc_ray()` method was changed. Now it works with parametric
    lines.

* Static physics behavior has been changed.

    Objects, which have material with the *Material -> Special: Collision*
    property enabled, can be fully unloaded. Also, these objects can be moved, rotated, etc,
    as long as they are dynamic.

* Rendering optimizations.

    Now we use bounding ellipsoids instead of spheres to frustum cull static objects.
    
* Node Logic Editor changes.

    Node `Send Request` has been simplified. JSON parsing and encoding routine has moved to new `JSON` node.

* Material updates, e.g. animated or affected by dynamic lights were optimized.

* Generated water mesh has been enabled on devices without OES_depth_texture support

Fixes
-----

* Fixed webplayer menu behavior.

* Fixed rare development server crash when the response headers contained a specific date (29Feb).

* Fixed ``Refractions`` which was set to "ON" in the absence of refractive objects.

* Fixed water material position for dynamic objects.

* Fixed crash for generated water mesh without waves.

* Fixed incorrect output for the TEXTURE node with no texture selected.

v16.02
======

New Features
------------

* Extended support of Emitter type particle systems.

    The support for the node materials that can be used to set particle shading parameters with sequences of basic blocks (including the *Particle Info* node). This function is available for the particle systems with the ``Billboard`` rendering type.

    The shader for particles with the ``Halo`` type rendering has been rewritten. The support for the ``Rings``, ``Lines`` and ``Star Tips`` parameters has been added. Maximum particle size limit (caused by the hardware limitations on some platforms) has been removed.
      
    Maximum number of gradient control points limit in the ``Ramp`` procedural texture (used for coloring particles) has been removed.

* Extended node material support.

    Two new nodes, *Vector Curves* and *RGB Curves*, have been added.

    The *ColorRamp* node support has been added. For now, this node supports ``Linear`` and ``Constant`` type interpolation.

    The *Particle Info* node support has been added. For now, it is fully supported by the ``Emitter`` type particle systems with the ``Billboard`` rendering type.

* Project Manager improvements.

    * An option to export multiple projects into one archive.
      
        This function makes updating the SDK and migrating projects from one workstation to another significantly easier.

    * New project deploying options.

        Project deployment is required for uploading finished project to the server, sending them by mail and so on. Starting with the current release, project deployment can be performed directly from the Project Manager's graphical interface. During deployment, projects are packed into a zip archive.

        Also, starting with the current release, deployment is available for any type of project (including External type).

    * Improvements in the Web Player HTML and Web Player JSON type projects.
        
        Now, during the creation of these projects, you can set the Web Player application parameters such as FPS counter, automatic camera rotation, turning off social network buttons and so on.

        Also, projects of these types can now be created with a ``bundle`` option which means that all application resources will be located in the same directory.

    * Graphical interface improvements.
        
        An option to add and show application icons has been added to make navigation easier and to give users a quick preview of an application in development.

        An option to view project info. By clicking the ``[info]`` link located at the right side of the project name, a list of detailed information regarding the project can be accessed.

        For convenience, the type of a project is now indicated by the prefix at the right side of the link: ``player:`` for Web Player HTML or Web Player JSON type projects, ``dev:`` for projects under development and ``build:`` for compiled (obfuscated) version of an application.

        The elements of the Project Manager interface now have pop-up tips.

* The possibility to animate environment settings.

    The possibility to animate environment parameters located in the ``Sky`` (``Horizon Color``, ``Zenith Color``), ``Environment Lighting`` (``Energy``), and ``Mist`` (``Minimum``, ``Start``, ``Depth``, ``Height``, ``Fog Color``) tabs has been added. These functions are also available for the NLA animation.

    The ``Animation`` tab has been added to Blender's ``World`` panel. It has ``Apply Default Animation`` and ``Behavior`` parameters.

    For all exported environments, ``WORLD`` type meta-object are added to the scenes. These objects can be used to control the animation of the environment settings. You can access these objects the same way you can access any standard object in the scene.

* Camera improvements.
  
    An option to set the limits for vertical movement of camera's pivot point has been added. This function is also available via the API by using the :b4wref:`camera.target_set_pivot_limits()` and :b4wref:`camera.target_get_pivot_limits()` methods.

    The new :b4wref:`camera.static_setup()`, :b4wref:`camera.eye_setup()`, :b4wref:`camera.target_setup()`, :b4wref:`camera.hover_setup()` and :b4wref:`camera.hover_setup_rel()` methods have been added for changing and complete setup of the camera behavior. At the same time, the :b4wref:`camera.set_move_style()` has been declared deprecated.

    The :b4wref:`camera.target_switch_panning()` method has been added for controlling camera panning, and the :b4wref:`camera.get_view_vector()` method has been added for retrieving the camera's line of sight vector.

    The examples of use the camera API are now described in the :ref:`corresponding chapter of the documentation <camera_api_notes>`. This chapter can also be accessed from the :b4wmod:`camera.js API module documentation camera` page.

* Node Logic Editor improvements.

    The ``Content-Type`` option has been added to the ``Send Request`` node. It can be used to reassign the title field of an HTTP request.

* A new sensor has been added to the controls module.

    Gyro Quat (:b4wref:`controls.create_gyro_quat_sensor` method) is the sensor for working with gyroscopes on mobile devices. In can be used to handle device rotation quaternion.

* Experimental UC Browser support has been added.

* User Manual has been reworked and expanded significantly.

Changes
-------

* The ``Generate Shadows`` light source parameter has been renamed to ``Shadow`` and now also enables shadow rendering in the Blender Viewport.

* Design of the SDK main page has been changed.
  
    Project list is now located in the Project Manager. Links to run frequently used applications, *Viewer* and *Code Snippets*, have been added.

* The :b4wref:`mouse.get_coords_x()` and  :b4wref:`mouse.get_coords_y()` can now receive the ``target_touches`` parameter.

    In case of multitouch, this parameter can be used to use only the touches that are inside of the current target element (the `targetTouches <https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/targetTouches>`_ parameter).

* :b4wmod:`camera` API module changes.

    The :b4wref:`camera.has_vertical_limits()` and :b4wref:`camera.has_horizontal_limits()` methods have been declared deprecated. The :b4wref:`camera.has_vertical_rot_limits()` and :b4wref:`camera.has_horizontal_rot_limits()` are recommended to use instead of them.

* Changes in the naming rules for the files of the projects under development.

    Now, the HTML files of the projects under development (located in the *apps_dev* directory) do not include the *_dev* suffix in their names. To distinguish these projects from the compiled ones, prefixes has been added to the *Project Manager*.

* When you open the SDK main page, presence of the local development server is checked. If it starts from the local file system, an appropriate warning is shown.

Fixes
-----

* Incorrect behavior of the ``canvas_resolution_factor`` engine parameter on Apple iOS devices has been fixed.

* Engine error that occurred in case of absence of the selected object in the ``Show Object`` and ``Hide Object`` logic nodes has been fixed.

* The incorrect coordinate rounding along the Y- and Z-axis while using variables as parameters in the ``Transform Object`` logic node has been fixed.

* Node logic blocking in case some nodes are not linked with the ``Entry Point`` node has been fixed.

* The issue with the rendering of dynamic objects the RTT-scenes has been fixed.

* Fullscreen switching issue in the Safari browser has been fixed.

* The issue with the Add-on interface (caused by ``Emitter`` type particle systems without a material assigned to the object) has been fixed.

* The ``Factor`` output of the ``B4W_GLOW_OUTPUT`` node in the materials with the ``Alpha Clip`` type transparency now works correctly.

* Dupli groups with ``None`` duplication type are not exported and not rendered.

* The :b4wref:`physics.append_ray_test()` method now works correctly if its first parameter is an empty object.

* Several water settings has been optimized and fixed.

* Physical objects that have parent object will now correctly update their position in the case the physics is disabled in the scene.

* The behavior of the *Camera Data* and *B4W Vector View* nodes for reflected objects has been fixed.

* NLA animation of the *RGB* node in materials has been fixed.

* Now, ``HAIR`` type particle system will not be rendered if the emitter object has the ``Do Not Render`` parameter enabled.

* The work of the :b4wref:`camera_anim.auto_rotate()` method for ``EYE`` type cameras has been fixed.

* The export of ``Hair`` type particles from non-active scenes in Blender has been fixed.

* Runtime libraries for Windows have been added to fix the resource conversion error.

* Shader generation error that occurred in case there were more than 10 textures in the material has been fixed.

Known Issues
------------

    Starting with this release, the list of all known problems and possible solutions is located in the :ref:`dedicated chapter <known_problems>`.

v16.01
======

New Features
------------

* Line rendering.

    Procedurally generated line rendering is now supported. Special type of object, activated by the *Line Renderer* option in blender, is provided for it, as well as several API functions: :b4wref:`geometry.draw_line`, :b4wref:`material.get_line_params` and :b4wref:`material.set_line_params`.

* New logic editor nodes.

    * The ``Transform Object`` node can be used to move an object in world, parent or local coordinate space.

    * The ``String Operation`` node can be used to perform operations with string constants and variables, like the ``Math Operation`` node.

* Simplified SDK installation.

    Now, to :ref:`install SDK <setup>`, you just need to specify the path to SDK in the *File->Scripts* section of the *User Preferences* panel.

* WebPlayer application improvements.

    An option to turn off social network buttons located in the bottom-right corner of a loaded scene. To do this, you need to specify the ``no_social`` :ref:`attribute <webplayer_attributes>` before the application starts.

    Escape characters in the Web Player's address bar are now processed correctly.

* Rendering quality improvements for Head-Mounted Displays (HMD).

    Means to correct distortion and disable chromatic aberration while using Head-Mounted Displays have been added. Use :b4wref:`scenes.set_hmd_params()` function to set up these parameters.

* Two new sensors have been added to the :b4wmod:`controls` module.

    *Touch Rotate* (:b4wref:`controls.create_touch_rotate_sensor()` method) sensor can be used to process rotation using two fingers on touch devices.

    *Callback* (:b4wref:`controls.create_callback_sensor()` method) is a sensor whose value is defined by a callback function called every frame.

* Resource converter utility improvements.

    The `--verbose` and `--jobs` parameters have been added to the :ref:`resource converter utility <converter>` *converter.py*, which can be used to output detailed information and to set maximum number of the parallel processes during conversion, respectively.

* Several API methods have been added.

    :b4wref:`objects.is_line()` checks whether the object has ``LINE`` type.

    :b4wref:`data.is_idle()` checks whether the scene loader has finished all planned tasks.

    :b4wref:`camera.hover_switch_horiz_rotation()` can be used to enable and disable horizontal rotation of ``HOVER`` type cameras.

* Node tree refresh algorithm has been optimized.

Changes
-------

* Using cubic reflections has been simplified.

    Cubic reflection is now rendered from the object's geometric center and not from its Blender origin point. Also, flat reflection is no longer rendered when rendering cubic reflection, which caused artifacts before.

* Changes in API.

    The following methods have been added to the :b4wmod:`camera` module: :b4wref:`camera.get_vertical_axis()`, :b4wref:`camera.set_vertical_axis()`. "EYE" type camera rotation to a "phi" angle is now performed along the vector returned by the :b4wref:`camera.get_vertical_axis()` function.

    The :b4wref:`camera.correct_up()` method now accepts the ``strict`` flag as a parameter. This parameter can be used to align camera codirectionally with the ``y_axis`` vector and not simply parallel to it.

    :b4wref:`camera.eye_get_vertical_limits`, :b4wref:`camera.eye_get_horizontal_limits`, :b4wref:`camera.target_get_vertical_limits` and :b4wref:`camera.target_get_horizontal_limits` methods can now return limits set in both world and local coordinate spaces. This can be defined by the ``local`` parameter.

* Logic node changes.

    The nodes have been separated into categories.

    * An option to select between ``Number`` and ``String`` variable types has been added to the ``Variable Store`` node.

    * An option to use string variables to store the entire body of the server request and response has been added to the ``Send Request`` node.

* Deprecated *Mass Reexporter* tool has been removed.

    The *Mass Reexporter* tool panel has been removed, as automatic scene reexport function is already present in the *Project Manager* (``re-export scenes`` operation).

* Deprecated functionality.

    The following methods: ``mouse.enable_mouse_hover_glow()``, ``mouse.disable_mouse_hover_glow()``, ``anim.get_actions()``, ``anim.get_current_action()``, ``anim.set_current_frame_float()``, ``anim.get_current_frame_float()``, ``anim.get_frame_range()``, ``anim.cyclic()``, ``anim.is_cyclic()``, ``anim.update_object_animation()``, ``controls.remove_sensor_manifolds()``, ``main.redraw()``, ``scenes.set_glow_intensity()``, ``scenes.get_glow_intensity()``, ``scenes.apply_glow_anim()``, ``scenes.apply_glow_anim_def()``, ``scenes.clear_glow_anim()``, ``scenes.set_glow_color()``, ``scenes.get_glow_color()``, ``sfx.speaker_play()``, ``sfx.speaker_stop()``, ``sfx.speaker_playback_rate()``, ``sfx.get_speakers()``, ``trans.set_rotation_quat()``, ``trans.set_rotation_quat_v()``, ``trans.get_rotation_quat()`` have been removed.

    The :b4wref:`app.set_camera_move_style()` method and :b4wref:`transform.SPACE_WORLD` and :b4wref:`transform.SPACE_LOCAL` constants have been declared deprecated.

    The :b4wref:`camera.has_vertical_limits()` and :b4wref:`camera.has_horizontal_limits()` methods have also been declared deprecated. The new methods :b4wref:`camera.has_vertical_rot_limits()`, :b4wref:`camera.has_horizontal_rot_limits()`, :b4wref:`camera.has_vertical_trans_limits()` and :b4wref:`camera.has_horizontal_trans_limits()` have been added to replace them.

Fixes
-----

* Positioning and flickering of the particle systems with world coordinates have been fixed.

* Front Facing for cubic reflections has been fixed.

* Stereo mode rendering errors have been fixed.

* Incorrect positioning in the child object animation has been fixed.

* Scene loading freeze in the Safari browser while using .ogg audio files with ``Background Music`` type speakers has been fixed.

* The ``Move Camera`` node bug, which disabled ``Duration`` parameter after .blend file reopening, has been fixed.

* System crash while exporting particle system with complex mesh emitter has been fixed.

* The ``Switch Select`` node error that led to incorrect switches has been fixed.

* Several camera limit rendering issues in the Blender viewport have been fixed.

* The issue with exporting materials attached directly to the object and not to the mesh has been fixed.

* The ``RenderCallback`` function set by the :b4wref:`main.set_render_callback()` method has been fixed.

    The ``RenderCallback`` function are now called right before rendering the current frame, so the scene and objects are up-to-date.

* Issues with rendering shadows from multiple light sources of different types (such as ``POINT`` and ``SUN``) have been fixed.

* ``Environment`` texture rendering while using the texture as the world map and in a stock material at the same time has been corrected.

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with *Alpha Clip* type of transparency.

* Some devices with Mail GPU require manual WebGL activation in browser settings.

* For the local development server to work on Apple macOS and Blender 2.76, you may need to install `Python 3.4 <https://www.python.org/downloads/release/python-343/>`_. This is due to a bug in Blender https://developer.blender.org/T46623. This bug has been fixed in Blender 2.76b, so updating it is advised.

* Skeletal animation can work incorrectly while using Nouveau drivers.

v15.12
======

New Features
------------

* Support for shadows from multiple sources.

    Support for shadows from multiple sources has been added. This feature can be used to greatly improve the realism of scenes lit by multiple light sources. Its functions and limitations are described in the :ref:`documentation <shadows>`.

* :ref:`Experimental support of the HMD (Head-mounted display). <stereo>`
    
    Experimental support for the head-mounted displays with the WebVR API has been added. For now, using this technology requires a web browser with WebVR support and an Oculus Rift device. More details in the documentation. 

* Aligning objects with the camera in the viewport.

    The new Viewport Alignment option can be used to attach objects to the camera in the viewport. This feature can be used to create UI elements attached to the center, edge or corner of the screen. Unlike parent-child alignment, the position of an aligned object will automatically change when screen resolution or aspect ratio is changed.

    Functionality of the :b4wref:`constraints.append_stiff_viewport()` method used for Stiff Viewport constraint has also been expanded.

* An option to show camera limits in Blender viewport.

    To make the task of setting camera limits up simpler, the ``Display limits in viewport`` option has been added to the ``Data`` panel of the camera object. When enabled, it will show the limits right in the Blender viewport. Default settings of the limits has also been changed.

* Anaglyph rendering improvements.

    New anaglyph rendering algorithm has been implemented. It has better color rendering. Also, plane of convergence of the left and right image for a TARGET type camera will now be calculated automatically based on a point around which the camera is rotated.

* New logic editor nodes.

    * ``Move To``: Can be used to move an object to another object.

    * ``Console Print``: Can be used to print various information (including variables values) to the web browser console.

* A Stereo View button has been added to the Web Player.

    Can be used to switch to the HMD mode (if the web browser supports this technology) or to anaglyph mode.

* New methods for working with objects.

    The new methods :b4wref:`objects.get_selectable_objects` and :b4wref:`objects.get_outlining_objects` have been added to make working with objects simpler.

* Dynamic objects can now be deleted.

    Before, only objects copied by the user could have been deleted.

* The option to choose an annotation of an object based on the canvas coordinates has been added.

    The :b4wref:`scenes.pick_object` function now returns the object's annotation, if the object is present in the sent coordinates.

* A new method to initialize media resources for mobile devices has been added.

    Before, forced canvas block was used as a workaround of the mobile browsers restriction of loading media resources (video and audio), and a user had to click a popup icon to start the application. Now, you can manually initialize media resources by using :b4wref:`data.activate_media` method. This function can be useful if the application already have elements that require user input, such as Start button, sound mute button and so on.

* New sensor manifold type - ``CT_POSITIVE``

    The new ``CT_POSITIVE`` sensor manifold type activates event handler if the logic function result isn't zero.

Changes
-------

* The ``Fast Preview`` button has been duplicated in the UI low panel.

    This button can be used to preview the scene without switching to the ``Development Server`` scene settings panel.

* Canvas texture API has been changed.

    Now working with a canvas texture is simpler. New methods :b4wref:`textures.get_canvas_ctx` and :b4wref:`textures.update_canvas_ctx` have been added. The :b4wref:`textures.get_canvas_texture_context` and :b4wref:`textures.update_canvas_texture_context` methods have been declared deprecated and are not recommended to use. The *Source ID* interface field for the canvas texture has also been removed.

* Wrong behavior of the shadows from Alpha Clip materials has been fixed.

    Incorrect behavior of the shadows casted by the objects with Alpha Clip materials without transparency value has been fixed.

Fixes
-----

* Incorrect physics of a copied object has been fixed.

    Incorrect physics behavior of a copied object (which occurred if the object was moved before being added to the scene) has been fixed.

* Incorrect fog behavior if a water plane was added to the scene has been fixed.

* Misplacing of the Blender interface panels in basic scene for a new project has been fixed.

* Cubemap rendering issue on the NVIDIA GeForce 200 series GPU has been fixed.

* Engine workflow on iPhone (4, 4S and 5), iPad (2nd, 3rd and 4th generations) and iPad Mini (1st and 2nd generations) has been improved. 

* Incorrect rendering of the shadows casted by billboard objects has been fixed.

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with *Alpha Clip* type of transparency.

* Incorrect Depth texture behavior on Windows OS.

    Depth textures are unstable on Google Chrome 32 bit on Windows. This problem is fixed in the beta version of the browser.

* Some devices with Mail GPU require manual WebGL activation in browser settings.

* For the local development server to work on Apple macOS and Blender 2.76, you may need to install `Python 3.4 <https://www.python.org/downloads/release/python-343/>`_. This is due to a bug in Blender https://developer.blender.org/T46623. This bug has been fixed in Blender 2.76b, so updating it is advised.


v15.11
======

New Features
------------

* Initial support of WebGL 2.0 technology.
    
    New API features are automatically provided with compatible browser and hardware

* New Logic Editor Features:

    * Camera animation.

        The option to smoothly change camera's position has been added to the ``Move Camera`` node.

    * New: behavior animation.

        The ``Play Animation`` node can now add `Behavior` animation to an object.

    * New ``Stop Animation`` node

        Can be used to stop object's animation

    * New ``Stop Sound`` node

        Can be used to stop a speaker's sound playback

    * New ``Stop Timeline`` node

        Can be used to stop NLA animation

* MSAA support
  
    This antialiasing algorithm is used in systems compatible with WebGL 2.0. For now, it allows the highest image quality on the ULTRA settings by using 16x MSAA algorithm. 

* Viewer interface improvements.

    A ``Home`` button has been added. When pushed, it will open the basic scene specified in the application's URL parameters, or, if there isn't any, a placeholder scene with Blend4Web cubic logo will be opened.

    The ``Reset`` button has been moved to the right side of the application's upper panel and will now reset not only internal but also URL parameters (such as loaded basic scene) of the Viewer.

    The ``Auto View Mode`` button used for automatic walkthrough of all scenes has been moved to the ``Tools & Debug`` panel.

* High precision rendering performance measure mechanic.

    Using the WebGL extension EXT_disjoint_timer_query allows high precision timers to be created, which can be used to measure the performance of GPU operations. With the activation of the debug mode in the Viewer (''HUD Info`` option in the ``Tools & Debug`` panel), the time (in milliseconds) the GPU needs to render part of the scene (subscene) is shown in the last column of the debug information.

* Web player improvements.

    Now, the cursor changes appearance while the camera is moving.

* There are numerous additions and improvements in the documentation.

Changes
-------

* The ``Copy Cursor Location`` button has been renamed to ``Look At Cursor``, and its behavior has also been changed.

    Now, by pressing this button, you can rotate the camera to the pointed direction.

* Changes API.

    For compatibility with third-party applications,:b4wref:`transform.set_matrix`, :b4wref:`transform.get_matrix`, :b4wref:`transform.set_matrix_rel` and :b4wref:`transform.get_matrix_rel` methods has been added, but for optimization purposes, using :b4wref:`transform.set_tsr`, :b4wref:`transform.get_tsr`, :b4wref:`transform.set_tsr_rel` and :b4wref:`transform.get_tsr_rel` methods is recommended.

    Now the :b4wref:`scenes.hide_object` and :b4wref:`scenes.show_object` functions will, by default, change the visibility of an object and all its children. To change only the current object's visibility, ``ignore_children`` parameter with ``true`` value should be sent.

    The following method has been declared deprecated and will be removed in further releases: :b4wref:`tsr.create_sep()` (:b4wmod:`tsr` module). :b4wmod:`tsr` module's :b4wref:`tsr.set_sep()` method should be used instead of it.

    :b4wmod:`camera` module API has been changed considerably. Deprecated methods `is_camera()`, `rotate_pivot()`, `rotate_hover_cam()`, `get_hover_cam_angle()`, `set_hover_cam_angle()`, `translate_hover_cam_v()`, `set_eye_params()`, `rotate()`, `get_angles()` have been removed. The following methods have also been declared deprecated: :b4wref:`camera.set_look_at`, :b4wref:`camera.rotate_eye_camera`, :b4wref:`camera.rotate_target_camera`, :b4wref:`camera.set_trans_pivot`, :b4wref:`camera.zoom_object`, :b4wref:`camera.set_pivot`, :b4wref:`camera.rotate_hover_camera`, :b4wref:`camera.get_hover_cam_pivot`, :b4wref:`camera.get_eye`, :b4wref:`camera.get_pivot`, :b4wref:`camera.hover_cam_set_translation`, :b4wref:`camera.set_hover_pivot`, :b4wref:`camera.get_hover_angle_limits`, :b4wref:`camera.get_cam_dist_limits`, :b4wref:`camera.apply_vertical_limits`, :b4wref:`camera.clear_hover_angle_limits`, :b4wref:`camera.apply_hover_angle_limits`, :b4wref:`camera.apply_distance_limits`, :b4wref:`camera.clear_distance_limits`, :b4wref:`camera.get_vertical_limits`, :b4wref:`camera.apply_horizontal_limits`, :b4wref:`camera.get_horizontal_limits`, :b4wref:`camera.clear_vertical_limits`, :b4wref:`camera.clear_horizontal_limits`. In their place, we recommend using methods starting with camera type prefix: ``target_...``, ``eye_...``, ``static_...``, ``hover_...``. Methods :b4wref:`camera.set_velocity_params` and :b4wref:`camera.get_velocity_params` have also been declared deprecated, and instead of them, using :b4wref:`camera.set_velocities` and  b4wref:`camera.get_velocities`, respectively, is recommended

    For working with the distance between the current TARGET or HOVER camera and the pivot point, :b4wref:`camera.target_get_distance`, :b4wref:`camera.target_set_distance` and :b4wref:`camera.hover_get_distance` methods have been added 

* In the Viewer, ``Play All`` and ``Stop All`` buttons have been added for playing and stopping all animations, respectively.

* Logic editor changes:

    * ``Select`` node and ``Select & Play Animation`` and ``Select & Play Timeline`` nodes based on it, have been declared deprecated. As a replacement, using the combination of ``Switch Select``, ``Play Animation`` and ``Play Timeline`` nodes is recommended.

    * SDK examples, which were using aforementioned deprecated nodes, have been updated.

    * For the logic nodes behavior transparency, ``Cyclic NLA`` option has been switched off.

* Behavior of the HOVER camera in the absence of limits has been changed.

    * HOVER camera will now be hanging over pivot point at a fixed distance and fixed angle.

* Glow effect changes.

    Light sources will now influence :ref:`glow effect<glow>`, if ``Material`` or ``Extended Material`` nodes are present.

Fixes
-----

* Project Manager errors were fixed.

    Links to the developer's applications included in the project are now showing in the list.

    Formatting in the compiled applications' HTML files has been fixed.

* Skinning on the mobile platforms has been improved.

* Addon's translation files connection error has been fixed.

    An error that could have happened on some devices because of system's inability to process addon's translation files, has been fixed.

* Particle objects shadow casting improvements.

    Fix behavior of the shadows casted by "Hair" particles (used as billboards) while changing the size of the main canvas.

* Engine workflow on the Mali 400 series GPU has been fixed.

* Flat reflections and fog for ``double_sided_lighting`` materials have been fixed.

* Local Storage limited quota on the Safari browser in the incognito mode no longer causes error.

* Functionality of the `Render Glow Over Transparent Objects`` option in the Blender's :ref:`glow settings <glow>` has been restored.

* Several video texture playback issues have been fixed.

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with *Alpha Clip* type of transparency.

* Incorrect Depth texture behavior on Windows OS.

    Depth textures are unstable on Google Chrome 32 bit on Windows. This problem is fixed in the beta version of the browser.


* Some devices with Mail GPU require manual WebGL activation in browser settings.

* You may require to install `Python 3.4 <https://www.python.org/downloads/release/python-343/>`_ on the systems with Apple macOS and Blender 2.76. This issue is connected with Blender bug https://developer.blender.org/T46623.


v15.10
======

New Features
------------

* New Project Manager features.

    It is now possible to export/import projects. This simplifies updating projects to newer versions of the SDK and also allows users to run and debug projects on various platforms. You can also share your projects with other developers in an efficient way.

    You can now create ``WebPlayer JSON`` and ``WebPlayer HTML`` projects. Such options allow you to create projects specifically for WebPlayer app which do not require writing any additional code. 

    To simplify navigation between your projects, two features have been added. The first one is the possibility to sort projects by name, and the second one is the possibility to show/hide SDK's stock projects.

    It is now possible to remove projects from the SDK.

    Improved Windows support. We now provide a Windows version of Java with the SDK, so you are no longer required to install any additional dependencies in order to build projects.

* Anti-aliasing improvements.

    A new option ``AA Quality`` has been added to the ``Render > Anti-Aliasing`` panel in Blender. This option allows you to select quality level of :ref:`anti-aliasing <antialiasing>`. Also, the anti-aliasing algorithm is now based on FXAA 3.11, which increases both quality and performance especially for HIGH and ULTRA quality profiles.

* Node Logic Editor improvements.

    * ``Move Camera`` node.

        Allows you to specify the camera's location and target.

    * ``Play Sound`` node.

        Allows you to play back sound from a selected speaker.

    * ``Switch Select`` node.

        This node works the same way as Select but allows you to select multiple objects in more flexible and convenient way.

    * Support for random numbers generation has been added to the ``Math Operation`` node.  

    * Support for ``POST`` requests in the ``Send Request`` node.

* ``Repeat`` mapping type for non-power-of-two textures is now supported.

    ``Repeat`` mapping type is now supported for non-power-of-two textures (i.e. textures whose dimensions are not 256, 512, 1024, etc). Also the mipmapping technique (trilinear filtering) is also supported for such textures.

* Automatic rescaling of textures is now performed if their dimensions exceed platform limits.

    In the cases when texture dimensions exceed platform limits, textures will be automatically downscaled. The only exception is compressed textures.

* New button ``Fast Preview`` to perform fast scene previews.

    The button is located on the ``Render > Development Server`` panel.

* Support for *Intensity* and *Color* animation of lamp objects.

    It is now possible to animate intensity and color of lamp objects, both when using conventional and NLA animation.

Changes
-------

* Project Manager interface has been improved.

    Improved UI, added ``Development Server > Project Manager`` button to run the Project Manager in the default browser.

* Speakers functioning has been improved.

   The :b4wref:`sfx.is_play()` method now correctly notifies about finishing sound playback, with a minimal delay.

* Some new export warnings have been added.

    Upon exporting some objects, their type will be changed to ``EMPTY`` in case of empty geometry or in the case when the sound file for the ``SPEAKER`` object does not exist. Messages on such facts are now displayed in the browser console.

* Displaying the object selector for logic nodes has been improved.

* Gamma correction behavior in node materials has been changed.
    
    :ref:`Gamma correction in node materials <gamma_node_materials>` is now performed differently because of changes in Blender 2.76.

* Changes API.

    The :b4wref:`main.resize` method is now deprecated and will be deleted from the :b4wmod:`main` module. The :b4wref:`container.resize` method from the :b4wmod:`container` module should be used instead.

Fixes
-----

* Project Manager errors were fixed.

* Stability on mobile devices has been improved for scenes with too many lamps.

* Stability on Unix systems has been increased.

    Stability on Unix-systems using AMD GPUs and open source drivers has been increased.

* An error related to annotations being added to a scene has been fixed.

    Fixed an error which occurred when annotations without the *Object -> Meta Tags* property were added to the scene.

* Fixed an error with incorrect audio playback during browser tabs switch.

* Several video texture errors have been fixed.

* Fixed an error occurred when an empty node group was used inside a node material.

* Fixed an error with a particle system which use an object with LOD as a particle.

* The Delay node error when using a variable as a parameter has been fixed in the logic editor.

* Fixed an error in the logic editor which occurred upon deleting an ``Entry Point`` node.

* Fixed an error in the logic editor with duplicated variables in the dropdown list.

* Fixed an error in scenes which use both the ``Play Animation`` logic node and the switched off ``NLA`` flag.

* The behavior of the ``Math->Power`` and ``Gamma`` shader nodes has been fixed and is now consistent with Blender.

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with *Alpha Clip* type of transparency.

* Incorrect Depth texture behavior on Windows OS.

    Depth textures are unstable on Google Chrome 32 bit on Windows. This problem is fixed in the beta version of the browser.

* Some devices with Mail GPU require manual WebGL activation in browser settings.

* You may require to install `Python 3.4 <https://www.python.org/downloads/release/python-343/>`_ on the systems with Apple macOS and Blender 2.76. This issue is connected with Blender bug https://developer.blender.org/T46623.

v15.09
======

New Features
------------

* Project Management.

    A new project management system allows one to:

        * show the list and info about existing projects

        * execute apps, load scenes in the Viewer app, load scene files in Blender.

        * create and configure new applications, optionally using prefabricated app/scene starter files to simplify creating new applications

        * build applications, create versions suitable for deployment on a server

        * convert application resources (textures, sounds and video) to alternative formats

        * automatically reexport all application scenes including json and html files

    There are two methods to manage projects: by using *project.py* utility which has a simple self-documented command line interface, or using a GUI web application, which is run on the developer server. This server does not require any additional configuration and as before is executed by the ``Open SDK`` button in Blender.

    The project management system works on all operating systems, however, some operations may require additional dependencies. To find out more about the configuration of this system check out the following :ref:`topic <project_management>` in documentation.

* Controlling armature bones.

    Enhanced features to control armature objects.
    
    Added a new :b4wmod:`armature` module which includes methods to get or assign bone positions both in armature coordinate space (:b4wref:`armature.get_bone_tsr()`, :b4wref:`armature.set_bone_tsr()`) and in bone-relative coordinate space (:b4wref:`armature.get_bone_tsr_rel()`, :b4wref:`armature.set_bone_tsr_rel()`). By using these methods, it's possible to program armature behavior. For example, animate interactive characters or create sophisticated armature-based objects with multiple moving parts.

    Support for ``COPY_TRANSFORMS`` constraints on bones. This allows bones to follow movements of any objects located on the scene, e.g create physically simulated "Ragdoll" objects.

* New logic editor nodes.

    * Play Animation: play animation of an object.

    * Send Request: send HTTP GET request to a server and parse its response.

    * Inherit Material: copy material properties from one object to another.

    * Set Shader Node Param: change outputs of Value and RGB shader nodes.

    * Delay: delay program execution for a given amount of time.

    * Apply Shape Key: change shape key value for an object.

    * Outline: control object outlining effect.
      
* New ``Allow NLA`` settings for video textures, which enables/disables NLA-animation for a given texture.

* New features in the *material* module.

    New APIs added :b4wref:`material.set_specular_color_factor` and :b4wref:`material.get_specular_color_factor`.

* New features on the SDK index web page.

    Index page of the SDK now contains a *Tools* section, which in turn includes *Project Manager* and *WebGL Report* tools.

* Web player improvements.
    
    A new optional ``alpha`` setting has been added, which is used to set rendering canvas transparency. The :ref:`Outline on Select <outline>` feature is now supported.

* New app compilation type ``update`` has been added to *project.py* utility.

    This type of app compilation allows one to update the engine inside a project directory. The app itself is not compiled with this option. The feature is useful for basic applications and tutorials.

* New features in the *app* module.

    A new param ``disable_zoom`` has been added to the :b4wref:`app.enable_camera_controls()` method. This parameter disables zoom movements of the camera.

    A new method :b4wref:`app.queue_animate()` has been added to the :b4wmod:`app` module.

* New features in the *scenes* module.

    A new method :b4wref:`scenes.has_picking_subs()` has been added to the :b4wmod:`scenes` module.

* New features in the *debug* module.

    A new method :b4wref:`debug.fake_load()` has been added to the :b4wmod:`debug` module.

Changes
-------

* Add-ons (such as :b4wmod:`app`, :b4wmod:`mouse` and others) are now a part of the compiled engine version:

    * b4w.min.js - advanced optimization (b4w.full.min.js previously)
    * b4w.simple.min.js - simple optimization
    * b4w.whitespace.min.js - optimization of whitespaces used in the code
    
    |

    The correct version is chosen according to the :ref:`application compilation <project_management>` settings.

* Node Logic Editor improvements.

    * `Play` -> `Play Timeline`; `Select & Jump` -> `Select`, `Register Store` -> `Variable Store` nodes were renamed.

    * Now it is possible to create user-defined variables apart from register-variables.

* The rarely used ``combine`` engine building method was removed.

* Documentation for the :ref:`resource converter <converter>` was revised.

* Documentation for the :ref:`addon translator <translator>` was revised

* The export of UV-layers and vertex colors was changed.

    Now the behavior of UV-layers and vertex colors resembles that in Blender even more.

* Support for NLA-animation and video-textures was extended. They act similar to those in Blender.

* A message about the lack of animation channels was added to the :ref:`export errors <export_errors_other>`.

* A non-critical export error on the selection of unsupported ``Render Type`` in particle systems was added.

* The ``Specular Color Factor`` property is now being inherited during material inheritance (:b4wref:`material.inherit_material` API method).

* Changes API.

    The following methods are marked as deprecated and will be removed in future releases: :b4wref:`camera.is_camera`, :b4wref:`util.is_mesh`, :b4wref:`util.is_armature`.

    The following methods of the :b4wmod:`objects` module should be used instead: :b4wref:`objects.is_camera`, :b4wref:`objects.is_mesh`, :b4wref:`objects.is_armature`

    Also, there are the following new methods: :b4wref:`objects.is_speaker`, :b4wref:`objects.is_lamp` and :b4wref:`objects.is_empty`.

    The :b4wref:`scenes.get_object_by_dupli_name_list` method now returns ``null``, if the ``name_list`` parameter is given incorrectly. The :b4wref:`scenes.get_object_name_hierarchy` method for receiving the full list of names with respect to object duplication was added. The value returned by this method is a valid input for the ``get_object_by_dupli_name_list`` function.

    The ``wireframe_mode`` parameter in the :b4wref:`debug.set_debug_params` method now has a value of one of the following constants: :b4wref:`debug.WM_NONE`, :b4wref:`debug.WM_OPAQUE_WIREFRAME`, :b4wref:`debug.WM_TRANSPARENT_WIREFRAME`, :b4wref:`debug.WM_FRONT_BACK_VIEW`, :b4wref:`debug.WM_DEBUG_SPHERES`.

* NLA Animation Behavior for dynamically loaded scenes changes.
  
    If there are objects with NLA-animation in such scenes, they are now influenced by the NLA settings of the main scene. Previously, such animation was not supported.

* The refactoring of the objects' internal structure was continued.

* Export error was added.

    Now when an object with a type other than "Mesh" is used as a "Hair" particle, a non-critical :ref:`export error <export_errors_warnings>` will occur.

* Licensing information was added to the distribution sources.

* Now texture slots with Environment Maps containing video textures are not exported.
    
    A :ref:`non-critical export error <export_errors_warnings>`, stating that a video cannot be used as an Environment Map, was added.

Fixes
-----

* ``Render Above All`` option now works correctly with node materials.

* Fixed :b4wref:`scenes.remove_object()` function.

* "Hair" particles have become more stable.

    Fixed the bug that appeared while using an object with the"Hair" particle modifier.

* Improved Windows Phone support.

* Fixed the bug that appeared while copying physical objects.
  
* Fixed the bug with ``Orco`` vector output when an object has zero scale in one or several axes.

* Fixed the bug in particle emitters: it appeared when an object with physics settings was chosen as a particle.
  
* Fixed the bug in NLA animation: it could not start from a frame other than 0 before.

* Fixed ``Lamp Data`` behavior: previously the information about light sources was not always refreshed during scene loading.

* Fixed the bug in calculations of  ``Normal`` vector output in node ``Geometry`` on the back side of a polygon.

* Fixed the bug of ``Orco`` vector output in node ``Geometry`` that appeared if object was translated relatively to its origin in Blender.

* Fixed calculation of the last frame of NLA animation for video textures.

* Fixed the engine bug related to different setting combinations of objects' selection and outlining.

* ``Wind bending`` effect has become more stable.

* Fixed bugs in ``Alpha Clip`` materials rendering.

* Fixed specular texture reproduction during material inheritance.

* Fixed the bug with light sources in apps with multiple scenes.

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with *Alpha Clip* type of transparency.

* Some devices with Mail GPU require manual WebGL activation in browser settings.

v15.08
======

New Features
------------

* Node-based logic editor.

    This new logic editor allows to add interactivity to your apps more easily by using a tree of connected nodes. The NLA Script tool which was previously used for this purpose has been removed, the old scripts are automatically converted to the newer format during blend file loading.

* Support for various shading models inside ``MATERIAL`` and ``MATERIAL_EXT`` nodes.
  
    Now the diffuse and specular shading models are selected based on materials inside such nodes. This is different from the previous behavior when the shading was the same for all nodes and was assigned by node material itself. This feature allows mixing different basic materials (non-textured) inside node-based ones.

* Improvements in transformation API.

    New :b4wmod:`transform` methods to perform relative objects transformations: :b4wref:`transform.set_translation_rel()`, :b4wref:`transform.set_translation_rel_v()`, :b4wref:`transform.get_translation_rel()`, :b4wref:`transform.set_rotation_rel()`, :b4wref:`transform.set_rotation_rel_v()`, :b4wref:`transform.get_rotation_rel()`, :b4wref:`transform.set_scale_rel()`, :b4wref:`transform.get_scale_rel()`, :b4wref:`transform.set_tsr_rel()`, :b4wref:`transform.get_tsr_rel()`.

    Methods without ``_rel`` suffix now always perform transformations in world coordinate space, even if they are children of other objects.

    Also new methods to perform local rotations :b4wref:`transform.rotate_x_local()`, :b4wref:`transform.rotate_y_local()`, :b4wref:`transform.rotate_z_local()` have been added to :b4wmod:`transform` module.

* Improved support for OS Windows.

    Support for OS Windows in :ref:`resource converter <converter>`. Now Windows users can create cross-browser applications which use media resources in different formats. Also the :ref:`application builder <app_building>` app can also be run in Windows.

* Support for the Microsoft Edge browser.


* Support for physics simulation in the main (non-worker) browser process.

    This feature is useful for eliminating delays in physics calculations in some mobile browsers. Earlier, all simulations took place in separate Worker threads. The feature is controlled by ``physics_use_worker`` parameter of the engine's initialization.

* Support for bounding box recalculation.

    A new method :b4wref:`objects.update_boundings()` has been added to the :b4wmod:`objects` module. This method performs recalculations of the object's boundings such as box, sphere, ellipsoid, cylinder, cone and capsule.

* Documentation improvements.

    A new theme has been selected for the user manual. This theme improves documentation readability on displays with different screen resolutions.

    Greatly improved and extended documentation for :ref:`application developers <developers>`.

* New APIs in *camera_anim* module.

    New methods :b4wref:`camera_anim.stop_cam_moving()` and :b4wref:`camera_anim.stop_cam_rotating()` in the b4wmod:`camera_anim` module.

* Binary compatibility checks.

    Now the version checks between .bin and .json files and the current engine version are performed while scenes load.

Changes
-------

* Changes in node material editor.
 
    Custom shader nodes have been moved from the ``Group`` menu to the ``Blend4Web`` menu. Also, an error with duplicated menu entries has been fixed.

* Refactoring of object structure.
    
    Complete refactoring of an object structure has been initiated. Object structures now have strong typing and include less redundant data. This improves overall engine performance.

* Changes API.

    The following methods are now deprecated and will be removed in future engine releases: :b4wref:`scenes.get_object_dg_parent()` (:b4wmod:`scenes` module), :b4wref:`constraints.get_parent()` (:b4wmod:`constraints` module). Instead, it is recommended to use :b4wref:`objects.get_parent()` and :b4wref:`objects.get_dg_parent()` from the :b4wmod:`objects` module.

* Improved interaction between the development server and multiple Blender instances.

Fixes
-----

* Fixed a compilation error in the *project.py* utility when a project is compiled to some external directory.

* Fixed a web server error which could arise due corrupted Windows registry.

* Fixed an export freeze for some corrupted .blend files.

* Fixed incorrect non-uniform scale warnings upon exporting Metaball objects.

* Fixed an error with ``Auto View`` mode in the ``Viewer`` app if were an empty scene category.

* Fixed rendering of dynamically loaded materials if they have the same name.

* Fixed an export error for scenes using ``Copy Transforms`` constraints.

* Fixed an error with rendering depth textures in the Microsoft Edge browser.

* Fixed a bug with touch events in the Microsoft Edge browser.


Known Issues
------------

* In the logic editor, some of looped links are highlighted in red. This issue has only cosmetic effect and can be safely ignored.

v15.07
======

New Features
------------

* Support for ``Alpha Clip`` transparency for node materials.

    It is now possible to specify a transparency mask for ``Alpha Clip`` materials using node logic.

* Support for soft particles.

    The new property ``Soft Particles`` has been added to the ``Render`` panel of the ``Emitter`` particle system. When activated, this property renders smooth edges near opaque objects located on the scene. This effect is available only for materials with ``Alpha Sort``, ``Alpha Blend`` or ``Add`` type of transparency.

* New preprocessor for shader instructions.
  
    This new preprocessor has more straightforward architecture and works faster, which, in turn, greatly reduces overall scene loading time, especially in  cases with many different shaders.

* Improved *Viewer* app performance.

    Performance problems caused by event handling in jQuery Mobile library have been fixed.

* Zero level property for *HOVER* cameras.

    This property represents a Z coordinate of the reference plane in which the camera's pivot point is located.

* New sensor manifold type: ``CT_CHANGE``.

    Along with ``CT_CONTINOUS``, ``CT_TRIGGER``, ``CT_SHOT`` and ``CT_LEVEL`` manifold types the new ``CT_CHANGE`` type can now be used. This type allows to execute a manifold's callback right after any of the sensors' values in the manifold has been changed.

* New APIs in *camera_anim* module.

    New API methods such as :b4wref:`camera_anim.move_camera_to_point()`, :b4wref:`camera_anim.rotate_camera()`, :b4wref:`camera_anim.is_moving()` and :b4wref:`camera_anim.is_rotating()` have been added to module :b4wmod:`camera_anim`.

* A new option to assign materials to objects.

    Until now it has not been possible to assign materials on objects using ``Object`` property. Now, this feature is supported.

* Support for external requests to the local development server.

    This feature is enabled by the *Enable external requests* property in addon preferences.

* New method :b4wref:`time.clear_animation()` in the :b4wmod:`time` module.

* New camera APIs.
  
    APIs of :b4wmod:`camera` module has been extended by :b4wref:`camera.get_vertical_limits()` and :b4wref:`camera.has_vertical_limits()` methods which are used to get or check the camera's vertical rotation and translation limits.

*  Documentation improvements.

    New user manual design optimized for devices of all kind.
  
    The differences between coordinate systems used in Blender and Blend4Web are now specified in documentation.

*  Support for addon i18n.
  
    This feature allows translation of addon interface to different languages. The translation into Russian is almost complete.


Changes
-------

* Various usability improvements in the addon interface.

* New ``force_container_ratio`` option in the :b4wref:`app.init()` method.

* Simplified usage of water caustics.

   Water caustics effect is now activated by the ``Caustics`` option located on the material's ``Water`` panel.

* New way of evaluating mouse movement sensors.

    Now all elements inside the Canvas Container element (e.g Anchors) do not lock mouse events, thus allowing us to prevent glitches during camera movement.

* Option to change quality of reflections.

   Now it is possible to choose one of three predefined reflection quality modes: ``LOW``, ``MEDIUM`` or ``HIGH``.

* New properties ``--project`` and ``--app`` in the *project.py* utility.

* New animation APIs.

    New methods to simplify frame setting: :b4wref:`animation.set_first_frame()`/:b4wref:`animation.set_last_frame()`.

* New behavior of plane reflections.

   It is now possible to omit specifying the reflection normal by leaving the ``Reflection Plane`` option empty. In this case, local Z axis will be used instead.

* New SSAO behavior.

   Now there is no need to have shadow casters in the scene to use the SSAO effect.

* New texture anisotropic filtering settings.

   There is a new ``Default`` value for anisotropic filtering option assigned to textures. By selecting this value you can use the anisotropic filtering specified on the scene. If you need to disable anisotropic filtering on all textures, again, use the setting from the scene.

* New specular alpha shading behavior to match Blender's.

* The physics mask/group, assigned for collision materials, has been extended from 8 to 16 bits.

* New asynchronous shader loader for developer version of Blend4Web.

* Elimination of *shaders* module.

    The methods of this module is now available from the :b4wmod:`debug` module.

* New script for batch processing exported json/html files.

    The scripts *reexporter.py* and *resaver.py* have been combined into *process_blend.py*, which has options for processing exported json/html files.

* Minor refactoring and improvements in API documentation.
  

Fixes
-----

* Fixed a bug with incorrect Canvas element size appeared on the engine's startup.

* Fixed a lighting bug on objects with the negative ``Scale`` option.

    This condition is properly handled and reported to the user (in the browser console).

* Fixed a bug with object's vertex animation.
  
* Fixed a bug with animation played in reverse.

* Fixed an error with incorrect state of *Collision* and *Ray* sensors which appeared after deleting physics objects.

* *Environment* textures with dimensions exceeding the supported ones are now processed correctly.

    Now, such textures are not being turned off but rendered in reduced scale instead. Dimensions are reduced synthetically for NVIDIA GeForce 8000 GPUs on Windows Chrome.

* Fixed an issue with incorrectly reported error which appeared while loading scenes with missing camera/world.

* Fixed a Blender startup error with the world missing from the scene.

* Fixed a bug in the ``Webplayer`` app when the sound button was missing in some scenes.

* Fixed a bug in the scenes when *motion blur* is the only effect to appear.

* Fixed the :b4wref:`material.get_material_extended_params()` method in the :b4wmod:`material` module.

* Fixed Firefox Mobile crashes when using shadows. Improved overall stability for this browser.

* Improved reexporter stability.


Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* There is a `bug <https://code.google.com/p/chromium/issues/detail?id=485482>`_ with video textures on Chrome 43 for Android. 

    Please update your Chrome browser to Beta or wait until the next Chrome update.

* Fixed issues with the ``Background Music`` speakers in the scenes exported to html.

    Currently, there is a bug in Google Chrome (`Issue 511251 <https://code.google.com/p/chromium/issues/detail?id=511251&thanks=511251&ts=1437144961>`_), related to an error with audio file origin. Currently, this issue is partially resolved by our workaround with forced *crossOrigin* attribute on audio sources.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with *Alpha Clip* type of transparency.

v15.06
======

New Features
------------

* New add-on user interface.

    Add-on interface has been redesigned. It is now activated by the new rendering profile, *Blend4Web*, which only contains panels and options explicitly supported by the engine. To simplify navigation, the old multi-line Blend4Web panels have been re-grouped into the smaller ones, based on functionality.

    Also, there is a new feature to automatically assign graphic effects required for a scene. In particular, shadows, refraction, *Glow* and *Outline* effects acquired the new *AUTO* property which automatically activates them if some objects or materials located on the scene require such effects.

* New normal editor.

    The normal editor has been substantially upgraded. Now it is fully compatible with the native Blender datablock used to store normals. This new editor has more efficient UI and also allows to edit split normals.

* Support for new material nodes.

    ``Orco`` and ``Local`` outputs of `Geometry` node are now supported. There are also some preliminary steps to support `RGB Curves`, `Vector Curves`, `ColorRamp` and Cycles nodes.

* New shading models.

    `Minnaert`/`Toon` diffuse shaders and `Blinn` specular shader have been implemented. Thus, starting from this release the engine supports all shading models of Blender.

* Support for Blender 2.75

* Multiple physics improvements.

    Code for collision detection has been rewritten. Now it is possible to determine colliding objects, and also the coordinates and the normal at the collision point.

    Improved ray casting API. In particular, one can specify an option to perform an automatic cleanup of the ray test object and also another option to cast a ray through multiple objects. As in the case of collision detection, this new API allows to determine the target object and the position/normal of the hit point. There is also a new possibility to cast rays from point to point in global space, without requirement to specify a source object.

    Extended possibilities of `Collision` and `Ray` sensors.

    Support for deleting physics objects and automatic recalculation of collision/ray tests after physics objects have been added/removed.

* A new tool for reexporting multiple scenes.

    A new `Mass Reexporter` tool has been added to addon. This tool allows to automatically reexport all scenes from the specified list of directories.

* Possibility to check for updates.

    You can now enable a ``Check for Updates on Startup`` option in addon settings to perform automatic checks for the new versions of Blend4Web.

* API to control *Motion Blur* postprocessing effect.

    New methods to control Motion Blur effect ``get_mb_params()`` and ``set_mb_params()`` has been added to ``scenes.js`` module.

* Support for Timeline markers.

    To extract frame numbers from timeline markers a new method ``marker_frame()`` has been implemented in ``scenes.js`` module.

* New NLA APIs.

    A new set of methods: ``set_range()``, ``reset_range()``, ``set_cyclic()`` and ``clear_callback()`` has been added to ``nla.js`` module. Also, it's now possible to specify callback in ``play()`` method.

* New API to change Canvas resolution.

    To change Canvas resolution it's sufficient to execute method ``set()`` from ``config.js`` module with the following parameters: ``canvas_resolution_factor`` and ``value``, where ``value`` is the new resolution of Canvas. This feature is particularly useful for creating high-definition screenshots.

* Support for ``Vertex Groups -> Length`` option in *Hair* particle system.

* New API documentation.

    To document types used by Blend4Web applications we developed a new formal type system. For example, in our old API docs 3D vectors had ``Float32Array`` type. Now they have formal ``Vec3`` type. This solution allows us to formulate more clear and intelligible descriptions for API and, more importantly, helps our users to develop more readable and reliable applications.

* New colors API.

    To work with colors in efficient way two new modules: `rgb <https://www.blend4web.com/api_doc/module-rgb.html>`_ and `rgba <https://www.blend4web.com/api_doc/module-rgba.html>`_ have been created. They include APIs to create new color vectors and convert  them between different profiles.

* Automatic determination of path to SDK.

    Addon option ``Blend4Web SDK Directory`` is filled up automatically, if the addon is located in default ``blender_scripts`` directory inside SDK.

* API for correct calculation of Canvas 2D coordinates.

    For proper manipulations with mouse cursor and touchscreen devices the engine requires correct 2D Canvas coordinates.

    Details about calculation and use cases of such coordinates are described in the separate :ref:`topic <non_standard_canvas_pos>`.

    To support this feature the following methods have been added to engine's APIs: ``client_to_canvas_coords()``, ``set_canvas_offsets()``, ``update_canvas_offsets()`` and ``force_offsets_updating()``. Also, there is a new configuration option: ``track_container_position``.

* API to change smooth factors of the camera's movement.

    To change smooth factors of the camera's movement the following APIs have been implemented: ``set_plock_smooth_factor()`` and ``get_plock_smooth_factor()`` in ``mouse.js`` module (for Pointer Lock mode)  and also ``set_camera_smooth_factor()`` and ``get_camera_smooth_factor()`` in ``app.js`` addon (for general use cases).

* New favicon picture has been added to Webplayer.

Changes
-------

* New API spec for collision detection and ray casting.

    Methods ``append_collision_test()`` and ``append_ray_test()``, as well as ``create_collision_sensor()`` and ``create_ray_sensor()`` now have new spec, which is incompatible with the previous versions of Blend4Web engine. All developers should consider upgrading their applications to match this new behavior.

* Rendering to texture changes.

    It's now possible to render scene into texture cyclically, e.g. when two scenes render one into another. The main constraint here is the requirement to have at least one scene, into which is nothing is being rendered.

* The option ``Apply Default Animation`` is now disabled if an object already have an NLA animation attached.

    In cases when the object already have an NLA animation attached, the option ``Apply Default Animation`` is disabled to eliminate possible animation conflicts.

* Changed *Hemi* lamp behavior.

    If the object is being illuminated by the *Hemi* lamp, the *Lambert* shading model will always be applied to its materials. This is done to match the Blender's behavior.

* Support for exported-to-HTML video textures in Firefox browser.

    Since Firefox 38 an error with video textures exported to base64 was fixed, so it's now possible to use them in such browsers.

* Changed assignment of UV layers to match Blender's behavior.

    Missing from node materials UV layers are determined automatically as it's done in Blender.

* Improved stability of exported to HTML video textures.
  
* Optimizations of CSM shadows.

* Depth shader optimizations.

* Billboard objects optimizations.

* Configuration option ``resolution_factor`` was renamed to ``render_resolution_factor``.

* Improved support for particle emitters which have several materials.

    Distribution of the particles to emitters as well as :ref:`vertex colors inheritance <particles_inheritance>` is being done taking into account each material i.e mesh part.

* Changed ``Wind Bending`` inheritance on particle systems.
    
    If *Wind Bending Inheritance* property is set to ``Instance`` then ``Wind bending`` property for emitter object is not switched off anymore.

* Updated messages about addon/engine version incompatibilities.
    
    For more info see :ref:`version errors <version_errors>`.

* Remove sensor locks API.
    
    Unused sensor locks API was removed from ``controls.js`` module.

* Fixed behavior of node materials with missing *Output* node.
  
Fixes
-----

* Fixes in ``screenshooter.js`` addon.

    Fixed an error with impossibility to take a screenshot.

* Fixed a bug in ``set_frame()`` method from ``nla.js`` module.

    Fixed ``set_frame()`` inaccuracy.

* Improved exported stability.

* Fixed a bug with addon removal/update on Windows.

    Refined binary loader in addon.

* Fixed a bug with shading from *SPOT*/*POINT* lamps.

* Fixed incorrect behavior of coordinate calculations in methods ``get_coords_x()`` and ``get_coords_y()`` from ``mouse.js`` addon.
    
* Fixed calculations of alpha channel in *Outline* effect.

* Fixed *Wind Bending* effect error.

* Fixed an error when particle's *Scale* was not taken into account on particle systems.

* Fixed synchronization error on animated *EMITTER* particle systems.

* Fixed a bug with shadows on billboard objects.

* Fixed incorrect exporting of *Override Mesh Boundings* settings.

* Fixed a bug with billboard rendering on iPad.

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* There is a `bug <https://code.google.com/p/chromium/issues/detail?id=485482>`_ with video textures on Chrome 43 for Android. 

    Please update your Chrome browser to Beta or wait until the next Chrome update.


v15.05
======

New Features
------------

* *Glow effect*.
    
    Supported :ref:`an effect <glow>` which occurs when the light scatters in the atmosphere and inside of the human eye and looks like a halo around glowing objects.

* *The local development server runs automatically.*

    A new option has been added to the addon settings. This option turns on automatic start of :ref:`local development server <local_development_server>` upon opening Blender. With the help of this functional web applications in development can be run without any preparations.

* *Cube reflections.*

    Apart from plane reflections, there are now cube reflections available. There is a new ``Reflection Type`` option available when ``Reflective`` flag is set on the object. Setting it to ``Cube`` turns this feature on.

* *More NLA options supported.*

    Added support of Blender's NLA tools: ``Scale``, ``Muted``, ``Reversed`` and ``Repeat``. The support of these tools broadens capabilities of interactive scene developers.

    Furthermore, to control NLA through API a new ``nla.js`` module was added. This module contains methods like ``play()``, ``stop()``, ``get_frame()``, ``set_frame()`` that can play/stop NLA and get/set the current frame. New methods have been involved in implementing control panel interface in the Viewer app.

* *Increased rendering possibilities for sky textures.*

    ``Influence`` parameters for sky texture rendering are now supported. Those parameters are: ``Blend``, ``Horizon``, ``Zenith Up``, ``Zenith Down``,``Blend``, ``Negative``, ``RGB to Intensity``, ``DVar``.

* *In node materials, the engine now correctly processes connections between inputs and outputs of different types.*

    It is now possible to connect outputs of one type with inputs of another type (:ref:`Non-critical error <export_errors_warnings>`). Now Blender's native behavior is supported by the engine.

* *For Hair particles the options on the Rotation panel are now supported.*

    Now the engine fully supports the state of particles set in Blender. In particular not only location and scale are supported now, but rotation as well.

* *Some demos for postprocessing effects demonstration were added.*

    Examples were prepared for the following effects: Bloom, Depth of Field, God Rays, Motion Blur and SSAO.

* *Added a new module container.js.*

    DOM tree elements can be added with a specific depth relative to the  depth of the ``canvas`` element with the help of ``container.js``'s ``insert_to_container()`` method. This method replaces CSS property ``z-index`` because location depth of elements is now determined by their position in the container element.

* *Improvements in the physical engine.*

    ``Margin`` property of physical elements and materials is now supported. This option allows for improved stability of object collision simulation. Bullet engine was updated to version 2.83.

* *API for changing camera controls mode.*
    
    Added methods of :ref:`changing movement style of the camera <camera_move_style_change>`. The control mode switch example can be found in :ref:`Code Snippets <code_snippets>` app in the "Camera Move Styles" section. Also has been added ``set_hover_pivot()`` method. This method allows to shift the control point of ``HOVER`` camera.

Changes
-------

* *Reorganized SDK's scene list.*

    All the scenes in the Viewer app has been sorted by groups: *App* contains finished apps, *Demos* contains demo-scenes and examples, *Tutorial Exports* contains tutorials source files.

* *Added syntax highlight in Code Snippets app.*

    Code Snippets app now has a new design. Also it was optimized for low-resolution screens.

* *API controls of video and canvas textures have been changed.*

    A new parameter ``data_id`` has been added to these textures' control methods. This parameter contains an ID of dynamically loaded scene.

* *Handling of animated bone excess has been changed.*

    The skeletal animation now just turns off when exceeding the maximum number of bones. It resulted in shader compilation error and unstable application behavior before. 

* *Some particle system properties has been renamed and now they are turned off by default.*

    In particular, Hair particle system's properties ``Randomize Location And Size`` and ``Randomize Initial Rotation`` are turned off by default now.

* *Doppler effect for speakers is now turned off in some browsers.*

    Doppler effect support in Web Audio has been pronounced as deprecated and will be removed in Chrome starting from version 45. Other browsers still support this functionality.

* *Changed objects' behavior when both skeletal and vertex animation are applied.*

    If an object has both armature modifier and vertex animation applied on it, the armature modifier won't be exported.

* *Rendering of particle system procedural animation (Wind Bending effect) has been optimized.*
  
* *The main .json and .bin scene files loading error handling has been improved.*

* *Windows 32 version of Blend4Web addon is now compiled natively.*

    This feature improves compatibility of the add-on with such systems.

Fixes
-----

* *The error that led to the wrong height of the description element in module "anchors.js" has been fixed.*

* *Support for Epiphany and other WebKit-based browsers.*

    Achieved by fixing the code which works differently in the different JavaScript engines.

* *Gestures on Internet Explorer 11 were disabled for Microsoft Windows touch devices.*

    Previously, gestures usage (Windows Touch Gestures) was leading to unnecessary HTML-elements scaling and movement on such configurations. It is expected that correct gestures' behavior will be supported in further browser releases.

* *Vertex animation with animated armature bake error was fixed.*
  
* *The error with rendering billboard objects on the iPad has been fixed.*

* *Node material's NLA animation applied to several objects was fixed.*

* *Fixed a bug related to the Motion Blur effect.*

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.


v15.04
======

New Features
------------

* *Deformations by using Shape Keys (Morphing).*

    Added support for object's :ref:`Morph targets <mesh_morphing>` (known as `Shape Keys <http://wiki.blender.org/index.php/Doc:2.6/Manual/Animation/Techs/Shape/Shape_Keys>`_ in Blender). To apply such keys, use the ``set_shape_key_value`` method of the ``geometry.js`` module. Simple example of how to use such functionality is given in the :ref:`Code Snippets <code_snippets>` app.

* *Support for Horizon Color and Zenith Color background settings.*

    It's now possible to tweak scene background by using the ``Horizon Color`` and ``Zenith Color`` properties as well as the ``Paper Sky``, ``Blend Sky`` and ``Real Sky`` options directly from Blender.

* *Support for the Gamma node.*

    We have implemented the Gamma node back in Blender v2.74. Now this node is finally supported by Blend4Web.

* *Various improvements in the Anchors tool.*

    It's now possible to limit the pixel size of an annotation. Added support for dynamic loading/unloading of Anchors. Implemented the possibility to hide and show Anchors by using the `show()`/`hide()` API functions and/or by the NLA Script tool.

* *Shader optimizations.*

    Shader compiler improvements. Added the following features: local variables optimizations, brackets removal. Improved the performance of node materials.

* *Physics engine optimizations.*

    To save the load time, the physics modules are now loaded only when explicitly required. Overall size of the modules has been decreased by 20%.

* *Extended tools for physics debugging.*

    The new `physics_stat()` method has been added to the `debug <https://www.blend4web.com/api_doc/module-debug.html>`_ module. This method returns physics statistics such as the number of physics objects (separated by type), amount of geometry and other info. It is now also possible to display the number of physics iterations per second aka Physics FPS (activated in the `config` module).

* *The new API method to attach objects to the camera independently from the camera's aspect ratio or the field of view.*

    Implemented in the `append_stiff_viewport()` method of the `constraints <https://www.blend4web.com/api_doc/module-constraints.html>`_ module.

* *The new module to perform transformations: "tsr.js".*

    This new module makes it possible to apply a variety of transformations to objects by using versatile TSR vectors. Each TSR vector combines translation, scale and rotation (hence the name). These vectors may be used instead of matrices as a more convenient and effective way to apply transformations.

* *The possibility to exclude any directories from being converted by the resource converter.*

    To exclude some directory from being converted by the :ref:`resource converter <converter>`, it is enough to place a file named ``.b4w_no_conv`` to this directory.

Changes
-------

* *The API documentation has changed its appearance. Links for quick access to methods and properties were added.*

* *Skeletal animation now takes into account the relative translation of an armature and a skinned object.*

    Native Blender's behavior is now supported. There is now no need to position an armature and an animated object in the same place and with the same rotation and scale.

* *Independent translation, rotation and scale animations are now supported.*

    The animation system no more forces keyframes to be present in every channel, which makes it possible to save original values in unused channels or change them with API.

* *World background support.*

    Background and sky can be enabled with the ``Sky Settings > Render Sky`` option under the ``World`` tab. It is turned off by default.

* *The Uranium physics engine now consists of two modules.*

    There are now two physics modules instead of one: *uranium.js* - the engine's code and *uranium.js.mem* - the file for memory initialization. Both modules must be placed in the same directory.

* *The glow effect together with its related components was renamed to Outline.*

    The new name better describes the principle of this effect: highlighting objects' edges.

* *Limiting the camera translation using the "append_semi_stiff_cam" method of the "constraints.js" module is now possible only for the "EYE" type.*

* *Local Development Server in Blender changes.*

    Now, instead of the standard Python SimpleHTTPServer, the Tornado web server is used as the :ref:`local development server <local_development_server>`. The new server has greater performance and it also offers more options to disable browser cache.

* *Keyboard controls for sliders in the Viewer application were added.*

    You can now control sliders with ``<`` and ``>``  keys.

* *Changes in the "update_object_animation" method of the "animation.js" module.*
  
    The optional "force_update" parameter was added. It forces animated objects to be updated even when their animation is not being played back.

* *API changes in the mouse.js module.*
    
    The *enable_mouse_hover_outline* and *disable_mouse_hover_outline* methods were added.

    The following methods were declared deprecated and will be removed in the next releases: *enable_mouse_hover_glow* and *disable_mouse_hover_glow*.

* *API changes in the scenes.js module.*
    
    The *outlining_is_enabled*, *set_outline_intensity*, *get_outline_intensity*, *apply_outline_anim*, *apply_outline_anim_def*, *clear_outline_anim*, *set_outline_color* and *get_outline_color* methods were added.

    The following methods were declared deprecated and will be removed in the next releases: *set_glow_intensity*, *get_glow_intensity*, *apply_glow_anim*, *apply_glow_anim_def*, *clear_glow_anim*, *set_glow_color* and *get_glow_color*.

* *Some settings were changed in the Object > Blend4Web panel.*

    The *Enable Outline* option was added to enable using the :ref:`outline effect <outline>` on the given object. Also, the *Outline on Select* option was added to activate glow animation when the object is selected (previously this behavior was defined by the *Selectable* flag).

* *New settings were added to the Scene > Blend4Web panel.*
    
    The *Enable Object Outlining* option was added to control the overall possibility of outlining. Similarly, the new *Enable Object Selectable* option controls the overall possibility of objects' selection.

* *Now the following object properties: Apply Scale, Apply Modifiers, Export Vertex Animation, Export Edited Normals and Export Shape Keys are mutually exclusive.*

* *API changes in modules.*

    The new *is_armature* method was added to the API of the `util.js <https://www.blend4web.com/api_doc/module-util.html>`_ module. It checks if the given object is of the ``ARMATURE`` type.
    
    The new *get_parent* method was added to the API of the `constraints.js <https://www.blend4web.com/api_doc/module-constraints.html>`_  module. It returns the parent object of the given object.

Fixes
-----

* *Fixed a bug in the "anchors.js" module which caused objects' descriptions to disappear.*

* *Fixed a bug in the Animation Baker script that occurred when there were armature objects in hidden layers.*

* *Fixed the camera's behavior while using "append_semi_stiff_cam" method of the "constraints.js" module.*

   Fixed correction of the camera's vertical axis relative to the parent object. Also the original camera orientation is now being taken into account. This can require some adjustments of the camera's rotation limits that are passed to this function.

* *Fixed a bug with reloading of the playlist when it was empty.*

* *Fixed the buggy behavior of physical objects that occurred after deleting at least one of them from the scene.*

* *Fixed a bug that occurred when there were zero-scaled objects instanced through DupliGroups.*

* *Fixed a compilation error of the water shader occurred on Windows and some mobile devices.*

* *Fixed a bug that occurred when there were duplicates of animation keyframes.*

* *Actions from different files sharing one name can be now used for NLA animation.*

* *Fixed duplication of event listeners that occurred when the "pointerlock" function was repeatedly called.*

* *Fixed behavior of the "Alpha sort" transparency type for dynamic objects.*

* *Fixed an add-on compilation error that occurred on Windows without C++ 2010 runtime installed.*

* *Fixed a bug with billboard rendering on iPad.*

v15.03
======

New Features
------------

* *New tool for adding annotations to 3D objects.*

    Now it is possible to assign anchors to empty objects. These anchors can be of three different types: "Annotations" - information from object's meta-tags is used, "Custom Element" - a custom HTML-element from the current web-page can be used as annotation, "Generic" - an invisible anchor with coordinates calculated using ``anchors.js`` module API.

* *Animation and API methods for Value and RGB nodes in node materials.*

    Now it is possible to animate not only ``Value`` nodes but also ``RGB`` nodes. Also, the corresponding API methods for changing such nodes were added in the ``objects.js`` module.

* *New "Code Snippets" application.*

    This :ref:`application <code_snippets>` was created to simplify access to the examples of engine's functionality. It is also possible to look at the examples' scripts. This application can be launched from the index.html file located in the Blend4Web SDK's root directory.

* *New control functions for the Glow effect.*

    New APIs were added in the *scenes* module: *get_glow_intensity()* and *get_glow_color()*.

* *Improvements in the Scene Viewer.*

    Design of the "Home" button was changed. A new button "All objects selectable" was added. It allows to turn off automatic "Selectable" option assignment for all scene objects. Also, it is now possible to see the total number of shaders on the loaded scene.

* *Dynamic copying of scene objects (instancing).*

    Now it is possible to dynamically :ref:`copy and remove <mesh_copy>` scene objects (to create and remove instances).

* *Handling errors related to the B4W_PARALLAX Blend4Web-specific node.*

    In case of incorrect usage of the B4W_PARALLAX node, an :ref:`export error warning <export_errors_warnings>` is generated.

* *New options in the application's builder.*

    There are now new options in the application builder: ``-j`` and ``-c``. They add scripts and styles correspondingly to the exceptions in order to be not compiled.

* *Experimental Blend4Web render engine.*

    It can be turned on in the addon settings using the "Register Blend4Web render engine (Experimental)" flag. This mode is designed to simplify customization of scene properties. Also, it simplifies the interface by removing unsupported panels. At the moment, it is not possible to edit shader node tree in the Blend4Web render mode. 

Changes
-------

* *Origin for counting off the camera limits has been changed.*

    Setting camera movement limits via API now perfectly corresponds to :ref:`values <camera_api_notes>` measured in the engine's coordinate system. Setting horizontal limits for the ``TARGET`` camera in the Blender's world space has been changed. Thus, it may require changeovers for old scenes.

* *Documentation update for the camera settings.*

* *Horizontal and vertical limits of the camera rotation are completely independent from each other.*

* *Some APIs in the camera.js module were changed.*

    `APIs <https://www.blend4web.com/api_doc/module-camera.html>`_ of the ``camera.js`` module have undergone a number of changes. 
    
    New methods were added: *is_target_camera*, *is_eye_camera*, *is_hover_camera*, *rotate_camera*, *rotate_target_camera*, *rotate_eye_camera*, *rotate_hover_camera*, *get_camera_angles*, *hover_cam_set_translation*. 

    The following methods were declared as deprecated and will be removed in the next releases: *rotate_pivot*, *rotate_hover_cam*, *rotate*, *set_eye_params*, *get_angles*, *translate_hover_cam_v*, *set_hover_cam_angle*.

    The *set_ortho_scale* and *get_ortho_scale* methods now print error message when they are applied to the ``Orthographic`` camera. The behavior of the *get_hover_angle_limits* method was also changed. This method now returns angle limits for the ``HOVER`` camera in the [down, up] format instead of [up, down] as it was before.

* *The lighting system was significantly optimized.*

    Many of the lamp props are calculated at the compile time now. Now, there is no 4 lamp restriction is imposed for some mobile devices.

* *The HTML layout method was changed for apps using the app module.*

    Now, upon initializing an application using the ``app.js`` module, the dimensions of the created ``<canvas>`` element are completely determined by the size of the container element. Thus, if a ``<div>`` element is used as a container, the size of ``<canvas>`` will be zero by default since div's default size is zero. You can set correct parameters for the container with CSS and inline-style. Also, you have to use *resize_to_container()* method from the *app* module when the container is changed. The same effect may be achieved if the *autoresize* option is set upon initializing the application (in the *app.init()* function). The low level method for changing the element's dimensions with *main.resize()* function is still supported.

* *Now, the enable_controls() function from the app module should be called without any parameters.*

* *Deprecated API methods were removed.*

    `textures.js <https://www.blend4web.com/api_doc/module-textures.html>`_ module : *stop_video*.

    `scenes.js <https://www.blend4web.com/api_doc/module-scenes.html>`_ module: *add_object*, *get_screen_scenes*, *set_light_pos*, *set_light_direction*, *set_dir_light_color*, *get_lights_names*, *remove_all*, *check_collision*, *check_ray_hit*, *get_appended_objs*, *get_object_by_empty_name*.

    `physics.js <https://www.blend4web.com/api_doc/module-physics.html>`_ module: *set_character_dist_to_water*.

    `material.js <https://www.blend4web.com/api_doc/module-material.html>`_ module: *set_batch_param*, *set_max_bones*, *max_bones*.

    `main.js <https://www.blend4web.com/api_doc/module-main.html>`_ module: *set_shaders_dir*, *set_texture_quality*.

    `data.js <https://www.blend4web.com/api_doc/module-data.html>`_ module: *get_bpy_world*.

    `controls.js <https://www.blend4web.com/api_doc/module-controls.html>`_ module: *sensor_make_positive*, *sensor_make_negative*.

    `camera.js <https://www.blend4web.com/api_doc/module-camera.html>`_ module: *change_eye_target_dist* (deprecated *MS_CONTROLS* was also removed).

* *There are now new conditions to allow changing object's position via API.*

    The functions from the ``transform.js`` module related to changing object position can be now applied to :ref:`dynamic objects <static_dynamic_objects>` only.

* *You can now use TEXTURE nodes without textures.*

    In this case the rendering of the node material completely corresponds to Blender.

* *Updated the procedure of compatibility checks for versions of exported files and the engine itself.*

    The engine will report about the scene's incompatibility by printing :ref:`messages in the browser console <version_errors>`.

* *The  "Do Not Batch" property was renamed to "Force Dynamic Object"*

    This option instructs the engine that the object must be dynamic regardless of other settings. Now its name is more clear.


Fixes
-----

* *Fixed camera autorotate feature of the web player.*

* *Fixed an error related to the fullscreen mode in the Web Player.*

* *Fixed an error related to the determination of the camera's angular coordinates in some positions.*

* *Fixed an error with camera autorotation if the horizontal limits are enabled.*

* *Fixed an error when Blend4Web-specific nodes were being added multiple times to a .blend file.*

* *Fixed a bug with replacing materials by using the "inherit_material" function from the "material.js" module.*

* *Fixed an error occurred while rendering reflections on an object which has been changed through the "material.js" module APIs.*

* *Fixed generation of the debugging wireframe spheres.*

* *Fixed optimization of the TEXTURE nodes in node materials.*

* *Fixed "Clamp" option behavior in the MixRGB (Linear Light) node.*

* *Fixed an export error occurred when an object shares its mesh with another object and one of the following flags is set to true: "Apply Scale", "Apply Modifiers", "Export Vertex Animation" or "Export Edited Normals".*

* *Fixed an error with "Blend4Web > Preserve Global Orientation and Scale" option on some mobile devices.*

* *Fixed fog rendering error in some versions of Chrome/Firefox under Windows.*


Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* *Video textures do not work in Firefox for scenes exported as HTML files.*

v15.02
======

New Features
------------

* *The local development server can be run from Blender.*

    It's possible now to run :ref:`local development server <local_development_server>` when using Blend4Web SDK. This server allows fast access to the Blend4Web SDK content and also make it possible to :ref:`automatically open exported scenes <run_in_viewer>` in the Viewer application.

* *Support for Spot lights shadows.*

    Shadows for Spot lamps were processed in the same way as for Sun lamps. Now the calculations are performed in the same way as it's done in blender i.e the light scattering is taken into account.

* *Added/improved support for "Metaball", "Surface" and "Curve" objects.*

    Support for ``Metaball``, ``Surface`` and ``Curve`` objects was added. Objects of these types are automatically converted into meshes during export. Support for ``Curve`` objects in modifiers was preserved.

* *Social networks buttons are added to the Web Player.*

    These buttons allow placing a link and a description to the 3D scene in one of the four popular social networks.

* *Added support for editing the list of Viewer scenes directly in Blender.*

    It is now possible to :ref:`edit assets.json file <assets_json>` with a list of Viewer scenes inside Blender. This works only when using Blend4Web SDK.

* *Screenshots can now be taken in the Viewer application.*

* *New fallback_video option is added to the Web Player.*

    Now the user can choose a video file to play instead of 3D content on systems without WebGL support. It is possible with the help of the new ``fallback_video=/path/to/video/`` option.

* *Improved rendering to texture functionality.*

    Added support for rendering scenes into several textures at a time. Scenes now can have any nesting level.

* *Billboards now can save orientation and scale in world coordinates.*

    To use the feature you need to set :ref:`Blend4Web > Preserve global orientation and scale <billboarding_preserve>` flag in the object's settings panel.

* *Improvements on the main SDK web page.*

    It is now possible to find out the version of the SDK and check the system for WebGL compatibility on the main web page.

* *Added support for the Clamp flag in MATH and MIX_RGB nodes*
    
    At first this functionality was released in Blender 2.73, and now it's also supported in the engine.

* *Considerable improvements in rendering quality on systems without depth-texture support.*

    Supported rendering features on systems without depth-texture support were extended. There are such effects available now: reflections, bloom, glow, motion blur, anti-aliasing.

* *New documentation is added.*

    Added documentation for the ``vec3``, ``vec4``, ``quat``, ``mat3``, ``mat4`` modules and for the global namespace ``b4w``. Documentation web pages design was improved.

* *Support for several engine instances on the same web page.*

    Several engine instances can now work simultaneously, by specifying the namespace on engine's initialization stage.

* *Possibility to use SDK on Apple macOS.*

    On macOS all SDK functionality including engine and applications building, resource conversation and documentation generation is now available.

* *The new set_trans_pivot() method is added to the camera module.*

    This function allows setting an arbitrary position of the pivot point and the position of the camera of the ``Target`` type.

* *A new ``version`` property is added to the ``project.py`` utility.*

    This property allows adding a version to the scripts and styles of the compiled application.


Changes
-------

* *Now it is possible to add options with the same names via browser address bar.*

    A new optional parameter ``allow_param_array`` is added to ``get_url_params()`` function of ``app`` module. It is set to ``false`` by default. Setting this parameter to ``true`` leads to a merge of identical functions into a massive, other way the last one will be used.

* *Improved ``Background Music`` speaker.*

    Now the user can specify parameters of delay and playback time.

* *Blend-file now includes special Blend4Web nodes by default.*

    Now there's no need to add :ref:`Blend4Web special nodes <custom_node_materials>` into a file. It is available in both SDK and addon versions of Blend4Web.

* *Changed export of empty "Mesh" objects.*

    Now ``Mesh`` objects without polygons are exported as ``Empty``.

* *Changes in the "light.js" module.*

    Added function ``get_light_type``; functions ``get_light_params`` and ``set_light_params`` now get object ``LAMP`` instead of objects name. Also the user now can change ``spot_blend``, ``spot_size`` and ``distance`` properties of the ``SPOT`` light source through those functions.

* *Improved refractions on LOW quality settings.*

    New simplified (without distortion) refraction model is now used when ``LOW`` quality is chosen.

* *Shader nodes optimization.*

* *Now automatic camera rotation can be turned off by touching touch screen.*


Fixes
-----

* *Corrected behavior of the preloader for the Web Player.*

    Some artifacts could be visible on ``B4W`` logo while opening Web Player.

* *Fixed an error in rendering of one-cascaded shadows. The error was related to appearing of a hard non-lighted line on the cascade border.*


* *Fixed an error related to names collision while linking objects in Blender.*

* *Fixed an error with optimization of SDK apps.*

* *Fixed export error of flat shaded meshes on Linux x32.*

* *Fixed incorrect behavior of Target camera in particular cases.*

* *Fixed an error when using a shadow map with size exceeding device limits.*

* *Fixed an error that leads to FPS drop in Firefox 35/36 on Windows when shadows are turned ON.*


Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* *Video textures do not work in Firefox for scenes exported as HTML files.*


v15.01
======

New Features
------------

* *Support for panning on touchscreen devices.*

    Panning is performed by swiping two fingers on the surface of the screen.

* *Support for "Text" objects.*

    These objects are now automatically converted to meshes during export.

* *Extended support for the NLA Script tool.*

    Added new logic slots: ``Show Object`` and ``Hide Object`` used for hiding and showing the objects, ``Page Redirect`` - for redirecting to other webpages , ``Page Param`` - for storing any webpage parameter in given numerical register. Simplified usage of ``Select & Jump`` and ``Select & Play`` slots. Now it's not required to specify ``Selectable`` property on selectable objects.  

* *Support for high definition displays (HIDPI, Retina).*

    The HIDPI mode allows to achieve considerable improvement of picture quality on devices with high resolution. This mode is activated automatically upon application startup if ULTRA quality profile has been selected. If necessary, high resolution can be turned on for other quality profiles.  

* *Support orthographic camera scaling.*

    An API to change the ``Orthographic`` camera scale has been added (``Orthographic scale`` in Blender).

* *"autorotate" option has been added to the webplayer.*

    :ref:`The option <webplayer_attributes>` autorotate is used to turn on the automatic camera rotation as soon as the scene loads.

* *Simplified keyboard control mode has been added to function "enable_camera_controls\.*

    The mode is enabled by passing the optional parameter ``disable_letter_controls`` Thus, the keyboard controls with letter keys (WASD and so on) will be turned off. This feature can be used in cases when you need to use the letter keys for purposes other than moving the camera.

* *Support for gyroscope on mobile devices.*

    To work with gyroscope on mobile devices the two sensors was implemented. The first sensor allows to operate with current device position compared with the previous one (position delta). It's created by using the function ``create_gyro_delta_sensor`` from "controls.js" module. The second sensor returns current device angle and created by ``create_gyro_angles_sensor`` from "controls.js" module. It's worth to mention that all angles are given in radians. Also the special addon "gyroscope.js" was created. This addon implements simple camera movements due to device rotation. You can find an example of using such feature in our Viewer application by selecting the "Gyroscope" menu option.

* *New ``Do not Render`` property has been added to material settings.*

    Enabling the property allows to hide parts of the scene objects which use such material.

* *Support for video-textures on IE 11 and iPhone.*

    The support is achieved by creating a new video-sequence format, ``*.seq``. For more info check the following :ref:`topic in documentation <seq>`.

* *Support for "title" tag in Web Player.*

    The Web Player's title (shown as web browser header) is now extracted from JSON file of the loaded scene. For more info about this feature check the following :ref:`topic in documentation <wp_title>`.

* *Support for meta tags in Blender.*

    It's now possible to append meta tag information to scenes and objects in Blender. Possible tags for scenes are "title" and "description". Possible tags for objects are "title", "description" and "category".

* *Added support for execution of user-defined functions every frame.*

    To help users to create sophisticated application the new function ``append_loop_cb`` has been added to "main.js" module. This function allows to execute given callback every frame. This callback has two parameters: time since the application start and time delta between current and previous frame. Both parameters are in seconds. To cancel the callback execution every frame you should remove it by using the ``remove_loop_cb`` function from the module "main.js".

* *Added support for simple preloader screen animation.*

    To create an application with animated preloader pass an option "preloader_fadeout" with the value "true" to the function ``create_simple_preloader`` from "preloader.js" module.

* *Added support to export converted media files to HTML file.*

    Now then you export HTML files it's possible to store converted files in them. To do so you need to enable "Export Converted Media" option in the :ref:`export options <export_opts>`.

* *Added support for using min50 and dds textures in Web Player.*

    To enable this feature pass "compressed_textures" :ref:`parameter <webplayer_attributes>` to Web Player.


Changes
-------

* *SDK file hierarchy was simplified.*

    The ``external`` directory was removed, all its content was moved to the upper level - in the root directory of the SDK. The file with the list of the scenes used by the Viewer application is now located in ``apps_dev/viewer`` directory.

* *Changed camera autorotation behavior (experimental).*

    If the camera limits are present, the camera smoothly slows down when approaching the limits, then moves in the opposite direction.

* *The usage of ``Special: Collision`` property was changed.*

    Earlier, enabling the option automatically resulted in objects' hiding. Now, to do the same thing, you have to specify ``Do not Render`` property in the material settings.

* *Changed suffix for converted media files.*

    Old ``*.lossconv.*`` suffix was replaced by ``*.altconv.*``.

* *Behavior of "Do not render" object property was changed.*

    Now, when the option is activated, an object's physics is not disabled. The object simply becomes invisible.

* *Improved the SDK structure.*

    Free and Pro SDK now come with the new and more polished examples; old and arid examples were dropped.

Fixes
-----

* *When using "Panoramic" camera type in Blender the camera automatically obtains "Perspective" type when exported.*

* *Fixed bug with "Target" camera dragging in rare cases.*

* *Minor fixes in the "B4W Anim Baker" addon.*

* *Fixed issue with sound for scenes with multiple cameras.*

* *Improved stability of "Timer" sensors in "controls" module.*

* *Fixed issue when browsing exported HTMLs in IE browser.*

* *Video texture optimizations. Now the video texture is not updated for suspended video playback.*

* *Fixed rendering issue in node materials with ``REFRACTION`` node.*


Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* *Video textures do not work in Firefox for scenes exported as HTML files.*

* *Slow and unstable rendering of depth textures in Firefox 35.*
    
    In various scenes the FPS is degraded when shadows are turned on. There is also an incorrect rendering of transparent materials. The issue is reported `here <https://bugzilla.mozilla.org/show_bug.cgi?id=1125445>`_ and is to be fixed in the future browser updates.


v14.12
======

New Features
------------

* *Camera velocity settings are now available.*

    Now :ref:`camera movement velocity <camera_velocity>` can be set up, including translation, rotation and zooming. Velocity for all camera types (``Target``, ``Hover``, ``Eye``) can be tweaked both using Blender UI and through Blend4Web API.

* *Mipmapping is now supported for Canvas textures.*

    We have added mipmapping support for :ref:`Canvas textures <render_to_texture_canvas>`.


* *Full support for the "MAPPING" node.*

    Now all ``Vector type`` options available for the ``MAPPING`` node are supported, including ``Texture``, ``Point``, ``Vector`` and ``Normal``.

* *Glow on mouse over.*

    API in the ``mouse.js`` module were created for the effect of outlining the objects under the mouse pointer. Also, for purposes of controlling this effect, ``enable_mouse_hover_glow()`` and ``disable_mouse_hover_glow()`` methods were added. The objects should have ``Object > Blend4Web > Selectable`` checkbox enabled.

* *A brand new app building system.*

    Now, the users can develop their apps right in the SDK thanks to the new ``project.py`` utility. :ref:`This script <app_building>` makes it possible to build the apps together with the engine, to minify JavaScript and CSS files and to export the final apps to be deployed on a server.

Changes
-------

* *Removed support for deprecated "UV translation velocity" texture settings.*

    We recommend to use node materials instead.

* *Removed deprecated "Levels of Detail" user interface.*

    This functionality can be used through Blender's standard "Levels of Detail" tool.

* *The pointerlock.js add-on was renamed into mouse.js.*

* *A mouseup event is now fired when the mouse pointer is leaving the app viewport.*

    So the problem with broken camera controls is no longer observed.

* *Error message about "Clear parent inverse" is no more shown.* 

    Before, when using parenting, it was required to reset translation, rotation and scale of child objects (``Object > Parent > Clear Parent Inverse``). Now such transformation is natively supported by the engine.

* *"Apply scale" option no longer applies modifiers.*

    As before, :ref:`Apply modifiers <apply_modifiers>` should be used in order to apply modifiers.

* *Use of normal maps in node materials no longer requires a Material or Extended Material node.*
    
    In some cases (e.g. refraction) normal maps can be used in shadeless materials. 

Fixes
-----

* *Fixed audio playback error occurred when using NLA.*

    This happened due to insufficient float number precision.

* *Fixed incorrect rendering of light sources on mobile devices.*

* *Layering shadows is fixed when multiple active light sources are present.*

    Now the shadows are calculated like in Blender, that is areas illuminated by other light sources are not darkened.

* *Node material rendering error has been fixed.*

    The error occurred when a ``MATERIAL`` node (or ``MATERIAL_EXT``) with a linked (from another .blend file) material was used.

* *Animation baker ("B4W Animation Bake" operator) no longer resets an armature pose.*

    Now, when using the :ref:`animation baking tool <animation_bake>`, the armature pose is being left intact.

* *Fixed jerky camera movement upon application startup.*

* *Fixed error with incorrect determination of the camera's horizontal movement limits.*

* *Fixed error occurred when unused textures were exported.*

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* *Video textures do not work in Firefox for scenes exported as HTML files.*


v14.11
======

New Features
------------

* *Video textures support.*

    :ref:`Video textures <video_texture>` are now supported for ``Image or Movie`` textures.

* *Frame rate.*

    Frame rate for animation and video textures can now be changed through the ``Scene > Dimensions > Frame rate`` option.

* *Canvas textures support.*

    A canvas HTML element can be now used as a :ref:`texture <render_to_texture_canvas>`. The workflow is described in the :ref:`manual <render_to_texture_canvas>`.

* *Camera panning.*

    In the mode when the camera is rotating around a single point (``Target``) the users now have the ability to move the pivot point within the view plane (so called camera panning) while the right or middle mouse buttons are pressed. This function is turned on by default and can be turned off in Blender settings at need.

* *New camera control mode - Hover.*

    The ``Hover`` mode is now available when the camera is gliding over the horizontal plane (including zooming in and out). This camera mode makes it possible to realize scenarios for a convenient viewing of scenes which are spread in two dimensions (rooms, game levels).

* *The SDK now contains a root index HTML webpage for simplifying navigation within the distribution.*

* *The resource converter now has the ability to convert videos.*

* *We have added a build system which was absent in previous public SDK distributions.*

* *The export Strict mode is implemented in the add-on.*

    Activating ``Strict mode`` gives the possibility to display all possible errors and warnings connected with incorrect scene settings. The option is useful for final scene debugging for getting the most correct and optimized resource files.

* *Audio playback support for iOS devices.*


Changes
-------

* *The webplayer's "bg" parameter is renamed to "fallback_image".*

    This option also has changed its behavior. If the ``fallback_image`` is defined the error message that WebGL is unavailable is not shown anymore, instead the user sees just the image.

* *If there are no sound sources in the scene the sound mute button is no longer shown in the webplayer.*

* *Generic materials workflow is now more predictable.*

* *The "mouse_down" sensor provides the code of the mouse button pressed. This code can be obtained from the payload sensor's parameter.*

* *Hair particle systems can be now exported significantly faster.*

Fixes
-----

* *Normal maps now work with Generated and Normal texture coordinates.*

    Using UV layers is no more required for normal maps.

* *Fixed the problem with the wrong path to the physics engine in the webplayer.*

    This error arose when uranium.js was moved out of the directory containing the main HTML file of the webplayer.

* *In the add-on we have fixed the problem with packed textures. Export crashed when the "Automatically Pack Into .blend" option was enabled.*

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

v14.10
======

New Features
------------

* *A new Web Player.*

    The new minimalistic Web Player design blends perfectly with any 3D scenes. It has a simplified user interface and build-in help. The Web Player works on all devices including mobile ones.

* *Improved shadows.*

    It's now possible to choose a non-cascaded shadow model, based on a single optimized shadow map. Such model is easier to configure and suits well for relatively small scenes. For more info see the :ref:`docs <shadows>`.

* *Many NLA system improvements.*

    It's now possible to create a complex logic using the ``Conditional Jump``, ``Register Store``, ``Math Operation`` NLA Script logic blocks and register-stored variables.

    It's now possible to use all types of supported animations in the NLA, including sound playback, vertex animation and particle emission. It's now possible to play different animation types simultaneously.

* *Supported objects billboarding.*

    The objects received the new set of :ref:`options <objects_billboarding_properties>`, allowing to configure billboarding.

* *The "XYZ Euler" mode is supported for animating rotations.*

    Object and skeletal animations now support the ``XYZ Euler`` mode for rotations.

* *Support for the GENERATED texture coordinates.*

* *Support for Cross-origin resource sharing (CORS).*

* *Scene export process simplified.*

    The range of material export errors are now not blocking the export. Instead, this material will be highlighted pink at scene loading. Detailed error descriptions can be found in the :ref:`manual <export_errors_warnings>`.

* *Added support for the "Do not export" option for particle systems.*

* *Improved stability on iOS devices.*


Changes
-------

* *Changed SDK path setting for HTML export.*

    It's now needed to set the SDK path setting for HTML export to SDK root directory. Earlier it was required to provide the full path to embed application. Pay attention, the old behavior is not supported anymore.

* *Deprecated the "UV translation velocity" option.*

    The option will be removed since version 14.12.

* *Removed option "Do not export" from the "Object data" panel.*

* *Removed "Blend4Web > Animation > Cyclic" option from the object properties panel*.

    Instead, one should use ``Blend4Web > Animation > Behavior`` option located in the same place. Scenes with default animations may work incorrectly, so they need behavior property to be set to ``Cyclic``.

* *Modified SSAO algorithm realization.*

    The new implementation is much faster and shows better quality. The settings of the algorithm are changed too. For more info see the :ref:`manual section <ssao>`.

Fixes
-----

* *Fixed rendering error for HALO materials.*

* *Fixed a rendering error when an object with the enabled "Force Dynamic Object" property has a parent object.*

* *Fixed error with keyboard shortcuts in Blender.*

    Fixed error with inability to assign keyboard shortcuts in Blender for export menu items:``File->Export->Blend4Web(.json)`` and ``File->Export->Blend4Web(.html)``.

* *Fixed crash when loading textures with size exceeding device limits.*

* *Fixed node material errors resulting in unstable engine behavior*.

* *Fixed error in node materials that contained complex Node Groups.*

* *Fixed errors of shaders compilation on devices with mobile graphics Qualcomm Adreno 305.*

* *Fixed rendering error when using REFRACTION nodes in transparent materials.*

* *Fixed an issue in "B4W Vertex Anim Baker" tool when current frame reset was occurred after using bake.*

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* *Normal maps don't work for Generated texture type.*

    It is necessary to use UV mapping for normal maps.

v14.09
======

New Features
------------

* *ABSOLUTE type support for the MATH node.*

* *Support for LEVELS_OF_QUALITY special node.*

    Allows to control the material's complexity depending on the quality profile which is specified by the user upon engine start.

* *Support for SMOOTHSTEP special node.*

    Simplifies the creation of some effects in node materials.

* *Node groups support.*

    `Node groups <http://wiki.blender.org/index.php/Doc:2.6/Manual/Composite_Nodes/Node_Groups>`_ allow the sharing of node blocks between materials.

* *The ability to output intermediate rendering results for debugging.*

    The rendering result for a certain stage can be now output above the main picture. This can be set up in the ``config.js`` module through the ``debug_subs`` options.

* *The logic for controlling Blender's NLA animation using a visual editor has been implemented.*

    The NLA Script tool has been added to Blender's interface to allow the implementing of simple scenarios using visual blocks, for example playing an animation in response to the user actions.

* *Multiple sensor system improvements.*

    It is now permitted to register *sensor manifolds* globally using a ``controls`` module method with no connection to any object. To do this ``null`` should be passed into the corresponding API. The sensor logic is processed in a more predictable and robust way according to the sequence in which their *manifolds* are created. Callbacks of the user action events are now assigned using the ``register_<input_type>_events()`` functions. To these functions it is now possible to pass the ``prevent_default`` flag which allows to unblock the standard browser behavior for the corresponding events.

* *The Web Player now supports physics.*

    Works only in the Web Player version where JSON files are loaded separately. Physics still not supported in the single HTML files.

* *Skeletal animation mixing is now supported.*

    The ``animation.js`` module now contains API for smooth transitions between skeletal animations: get_skel_mix_factor() - for getting the current mixing factor value and set_skel_mix_factor() - for setting it.

* *The Value node can now be animated in node materials.*

    The functionality is similar to other animation types. Working in NLA is also supported.

* *Diffuse and Specular lamp's properties are now supported.*

* *The possibility to render a transparent object above other objects on the scene.*

    Activated with the ``Render above all`` checkbox for transparent materials (i.e. not ``Opaque``).

* *Scale is applied automatically to the object mesh.*

    Activated by enabling the ``Apply scale`` checkbox in the object settings.

* *High quality profile (including shadows, dynamic reflections and anti-aliasing) has been implemented for iOS.*


Changes
-------

* *Shadow rendering improved.*

    Shadow rendering system is significantly changed: it is now based on the ``Stable Cascaded Shadow Maps`` technique. This technique allows to greatly diminish the flickering of shadow edges when the camera moves. Smoothing is implemented between cascades. Also shadows of the last cascade fade out at distancing. Softened shadows are rendered using the ``Percentage Closer Shadows`` technique. The shadows' user settings are reworked and simplified. Now its possible to tweak the size of shadow maps, blur ratio and the setting for removing self-shadowing artifacts. The new settings are :ref:`documented <shadows>` in detail.

* *In the Web Player graphics quality settings are now saved independently for each scene.*

* *The behavior of the app configuration parameters has been changed: physics_uranium_path, smaa_search_texture_path and smaa_area_texture_path.*

    These parameters are now calculated automatically depending on the running HTML files location, if they haven't been overridden during the app's initialization.

* *Transition is completed to the system of modules which are linked via b4w.require() call.*

    This also means that starting form the current version its impossible to call modules in the engine's release version using the old ``b4w.<module>`` namespaces. For compatibility purposes the ``ns_compat.js`` add-on has been implemented, the linking of which allows to restore the old behavior.

* *The Web Player's control panel can now be hidden.*

* *Skeletal animation is now applied to armature objects only.*

    There is no need to apply skeletal animation to ``MESH`` objects. If they are linked to some animated armature, their skinning will be automatic.

* *Demos and tutorials are updated according to the newly implemented features.*

Fixes
-----

* *The preloader didn't disappear in case of a loading error (texture or sound file).*

* *Lagging during scaling and turning on mobile devices is fixed.*

* *TARGET-type camera shimmering has been removed for small turnings.*

* *EYE-type camera controls was fixed for mobile devices.*

* *The Farm demo controls are improved for Safari browser.*

* *Errors concerning using the unsupported shading models in node materials are now fixed.*

* *"Selectable" option now works for the objects without materials.*

* *There is no longer need to enable "Force Dynamic Object"* for the objects that are animated using NLA.

* *The particle system error when the object being instanced is parented to another object, has been fixed.*

Known Issues
------------

* Problems with updating of the add-on.

    It's strongly advised to restart Blender after installing a newer version of Addon/SDK.

* *Armature animation mixing doesn't work with some browsers.*

    If skeletal animation mixing API brings unexpected errors, it is necessary to override standard Math.sign function as follows:

    .. code-block:: javascript

        var m_util  = require("util");
        Math.sign = m_util.sign;
