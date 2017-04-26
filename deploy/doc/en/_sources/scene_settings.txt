.. index:: scene

.. _scene_settings:

**************
Scene Settings
**************

.. contents:: Table of Content
    :depth: 3
    :backlinks: entry

All the parameters that define the look and behavior of the whole scene (and not just a single object) are found on the three panels: the ``Render`` panel, the ``Scene`` panel and the ``World`` panel.

.. _render_settings:

Render Panel
============

.. image:: src_images/scene_settings/render.png
   :align: center
   :width: 100%

All scene parameters that concern the image rendering are found on this panel.


.. _render_development_server:

Development Tools
-----------------

Development Server settings. Described thoroughly in :ref:`its own section <local_development_server>`.

.. image:: src_images/scene_settings/render_development_server.png
   :align: center
   :width: 100%

.. _render_shading:

Shading
-------

This panel contains various shading options.

.. image:: src_images/scene_settings/render_shading.png
   :align: center
   :width: 100%

*Set Recommended Options*
    This button is used to achieve maximum consistency between the look of a 3D scene in Blender viewport and in web browser. Pressing this button:

    * enables **World Space Shading**,
    * switches material mode to **GLSL**,
    * switches viewport shading mode to **Material** and
    * sets the main camera fit to **Vertical**.

*World Space Shading*
    This option turns on and off **World Space Shading** (world space interpretation of lighting data will be used for object shading). Disabled by default.

.. _render_shadows:

Shadows
-------

Shadows settings. Described thoroughly in :ref:`its own section<shadows>`.

.. image:: src_images/scene_settings/render_shadows.png
   :align: center
   :width: 100%

.. _render_reflections:

Reflections and Refractions
---------------------------

Reflection and refraction effect settings.

.. image:: src_images/scene_settings/render_reflections_and_refractions.png
   :align: center
   :width: 100%

*Reflection*
    Reflection effect settings. Can be set to ``ON``, ``OFF`` or ``AUTO``. Set to ``ON`` by default.

*Refraction*
    Refraction effect settings. Can be set to ``ON``, ``OFF`` or ``AUTO``. Set to ``AUTO`` by default.

*Quality*
    Quality settings for the reflection effect. Can be set to ``HIGH`` (the highest reflection quality), ``MEDIUM`` (medium quality) or to ``LOW`` (the lowest quality). Set to ``MEDIUM`` by default.

.. _render_object_outlining:

Object Outlining
----------------

Outlining effect settings. Described thoroughly in :ref:`its own section<outline>`.

.. image:: src_images/scene_settings/render_object_outlining.png
   :align: center
   :width: 100%

.. _render_glow_materials:

Glow Materials
--------------

Glow Material effect settings. Described thoroughly in :ref:`its own section <glow>`.

.. image:: src_images/scene_settings/render_glow_materials.png
   :align: center
   :width: 100%

.. note::

    For dynamically loaded objects, ``AUTO`` setting is interpreted as ``OFF``, if no materials with glow are present in the scene. If you are using dynamic loading, you should set this parameter to ``ON``.

.. _render_anti_aliasing:

Anti-Aliasing
-------------

Anti-Aliasing settings. Described thoroughly in :ref:`its own section<antialiasing>`.

.. image:: src_images/scene_settings/render_anti_aliasing.png
   :align: center
   :width: 100%

.. _render_anisotropic_filtering:

Anisotropic Filtering
---------------------

This parameter can be used to enable or disable anisotropic filtering and also to set the number of texture samples used for it. By default, anisotropic filtering is disabled.

.. image:: src_images/scene_settings/render_anisotropic_filtering.png
   :align: center
   :width: 100%

Available values: ``16x``, ``8x``, ``4x``, ``2x`` and ``OFF`` (default value).

.. _render_bloom:

Bloom
-----

Bloom effect settings. Described thoroughly in :ref:`its own section <bloom>`.

.. image:: src_images/scene_settings/render_bloom.png
   :align: center
   :width: 100%

.. _render_motion_blur:

Motion Blur
-----------

Motion blur settings. Described thoroughly :ref:`in its own section <motion_blur>`.

.. image:: src_images/scene_settings/render_motion_blur.png
   :align: center
   :width: 100%

.. _render_ssao:

Ambient Occlusion (SSAO)
------------------------

Screen-space ambient occlusion (SSAO) settings. Described thoroughly in :ref:`its own section <ssao>`.

.. image:: src_images/scene_settings/render_ambient_occlusion.png
   :align: center
   :width: 100%

.. _render_god_rays:

God Rays
--------

God Rays effect settings. Described thoroughly in :ref:`its own section <god_rays>`.

.. image:: src_images/scene_settings/render_god_rays.png
   :align: center
   :width: 100%

.. _render_color_correction:

Color Correction
----------------

Color correction settings. Described thoroughly in :ref:`its own section <color_correction>`.

.. image:: src_images/scene_settings/render_color_correction.png
   :align: center
   :width: 100%

.. _render_timeline:

Timeline
--------

Timeline settings.

.. image:: src_images/scene_settings/render_timeline.png
   :align: center
   :width: 100%

*Start Frame*
    The first frame of the timeline. Set to 1 by default.

*End Frame*
    The last frame of the timeline. Set to 250 by default.

*Frame Rate*
    Number of the frames per second. Set to 24 by default. This parameter only affect the animation playback speed (not the scene itself).

.. _render_dynamic_grass:

Dynamic Grass
-------------

Enables and disables :ref:`dynamic grass <particles_grass>` effect.

.. image:: src_images/scene_settings/render_dynamic_grass.png
   :align: center
   :width: 100%

Possible values: ``ON``, ``OFF`` and ``AUTO``. Set to ``AUTO`` by default.

.. _scene:

Scene Panel
===========

.. image:: src_images/scene_settings/scene.png
   :align: center
   :width: 100%

The settings that concern scene behavior, including audio, physics and animation settings, are found on this panel.

.. _scene_scene:

Scene
-----

Scene settings.

.. image:: src_images/scene_settings/scene_scene.png
   :align: center
   :width: 100%

*Camera*
    A camera that is used to render the scene.

.. _scene_units:

Units
-----

Sets the measurement units used in the scene.

.. image:: src_images/scene_settings/scene_units.png
   :align: center
   :width: 100%

.. _scene_audio:

Audio
-----

Audio settings.

.. image:: src_images/scene_settings/scene_audio.png
   :align: center
   :width: 100%

*Volume*
    The master volume of the sound in the application. This value can vary between 0 and 100. Default value is 1.0.

*Distance Model*
    The distance model used for calculating distance attenuation. Following models are supported by the engine:

    ``None`` - no distance model is used, the sound has constant volume regardless of the distance.

    ``Exponent Clamped`` - a clamped exponential distance model.

    ``Linear Clamped`` - a clamped linear distance model.

    ``Inverse Clamped`` - a clamped inverse distance model.

    The following models are partially supported (work the same way the corresponding *Clamped*-type models):

    ``Exponent``

    ``Linear``

    ``Inverse``

    This parameter is set to ``Inverse Clamped`` by default.

*Speed*
    This parameter sets the speed of sound used for Doppler effect calculation. Its value is measured in meters per second and is set to 343.3 by default.

*Doppler*
    This sets the pitch factor for Doppler effect calculation. Its default value if 1.0.

*Dynamic Compressor*
    Compress audio signal's dynamic range. This feature can be used to make the sound more rich and even. Disabled by default.

*Threshold*
    If the amplitude of the audio signal exceeds the value specified by this parameter, the compressor will reduce its level. Set to -24 dB by default.

*Knee*
    The interval below the threshold where the response curve switches to the decreasing mode. Set to 30 by default.

*Ratio*
    Amount of gain reduction. Set to 12 by default.

*Attack*
    Time (in seconds) that takes the compressor to reduce gain by 10 dB. Set to 0.003 by default.

*Release*
    Time (in seconds) that takes the compressor to increase gain by 10 dB. Set to 0.25 by default.

.. _scene_logic_editor:

Logic Editor
------------

Settings for the use of the logic node trees (created in the :ref:`logic editor <logic_editor>`) in the scene. Disabled by default.

.. image:: src_images/scene_settings/scene_logic_editor.png
   :align: center
   :width: 100%

*Active Node Tree*
    Node tree that is used in the scene's playback.

.. _scene_nla:

NLA
---

Non-Linear Animation playback settings. Disabled by default.

.. image:: src_images/scene_settings/scene_nla.png
   :align: center
   :width: 100%

*Cyclic NLA*
    If this parameter is enabled, NLA animation will be repeated after it is finished.

.. _scene_meta_tags:

Meta Tags
---------

Application's meta tags.

.. image:: src_images/scene_settings/scene_meta_tags.png
   :align: center
   :width: 100%

*Title*
    The title of the application.

*Description*
    The description of the application. Can be a simple text or a link to a text file (if the ``Description Source`` parameter is set to the ``File`` value).

*Description Source*
    The source of the application's description. The description can be loaded from a file or specified directly in the ``Description`` field. This parameter can have one of the two values, ``Text`` and ``File``, and it is set to ``Text`` by default.

.. _scene_physics:

Physics
-------

Physics settings.

.. image:: src_images/scene_settings/scene_physics.png
   :align: center
   :width: 100%

*Enable Physics*
    Allow using physics in the application. Enabled by default.

.. _scene_batching:

Object Clustering & LOD
-----------------------

Settings for object clustering and Levels Of Detail.

.. image:: src_images/scene_settings/scene_object_clustering.png
   :align: center
   :width: 100%

*Cluster Size*
    The size of the cluster used for batching (in meters). Can be used for optimization purposes. If this parameter is set to zero, the engine will try to combine all objects in the scene. Set to zero by default.

*LOD Cluster Size Multiplier*
    This parameter is used to subdivide clusters (based on LOD distance specified individually for each object) into smaller ones to make transitions between different levels of detail less noticeable. The size of that smaller clusters is defined by object LOD distance multiplied by the value of this parameter. Higher values lead to bigger clusters which increases performance but makes transition between LODs more noticeable, while lower values make said transitions less noticeable at the cost of decreased performance. Can be used for optimization purposes. Set to 0.5 by default.

*LOD Smooth Transitions* 
    Defines what objects will use smooth transitions while switching their LOD levels. Has the following options:

    * OFF - smooth transitions are disabled (fastest).
    * NON-OPAQUE - use smooth transitions for objects with ``Add``, ``Alpha Clip``, ``Alpha Blend``, ``Alpha Sort`` and ``Alpha Anti-Aliasing`` :ref:`materials <alpha_blend>`.
    * ALL - smooth transitions will be used for all objects (slowest).

    Choosing the "ALL" value can noticeably decrease application performance, so use it with caution. Default value is "NON-OPAQUE".

*Max LOD Hysteresis Interval*

    The length of the interval (in meters) used for switching LOD levels. The half of this value is added/subtracted from the distance threshold in order to make two different thresholds for switching to the lower and to the higher LOD level. This should reduce LOD "popping" effect. Set to 4.0 by default.

.. _scene_objects_selection:

Object Selection
----------------

Object selection settings. Objects can be selected both with the API function :b4wref:`scenes.pick_object()` and with the :ref:`logic nodes <logic_editor>`.

.. note::
    In the :ref:`scene viewer <viewer>`, selection is enabled by default. You can turn it off in the ``Tools & Debug`` panel.

.. image:: src_images/scene_settings/scene_objects_selection.png
   :align: center
   :width: 100%

*Enable*
    The parameter that defines if the object can or can't be selected. It can have ``ON``, ``OFF`` or ``AUTO`` value. Set to ``AUTO`` by default.

.. _scene_anchors:

Anchors
-------

:ref:`Anchor <objects_anchors>` visibility detection settings.

.. image:: src_images/scene_settings/scene_anchors.png
   :align: center
   :width: 100%

*Detect Anchors Visibility*
    Anchor visibility detection parameter. Can have ``ON``, ``OFF`` or ``AUTO`` value. Set to ``AUTO`` by default.

.. _scene_export_options:

Export Options
--------------

Scene settings export parameters.

.. image:: src_images/scene_settings/scene_export_options.png
   :align: center
   :width: 100%

*Do Not Export*
    If this parameter is enabled, scene settings will be ignored during export.

.. _world_settings:

World Panel
===========

.. image:: src_images/scene_settings/world.png
   :align: center
   :width: 100%

Environment settings such as settings for sky, mist and such are found on this panel.

.. _world_preview:

Preview
-------

Environment preview.

.. image:: src_images/scene_settings/world_preview.png
   :align: center
   :width: 100%

.. _world_world:

World
-----

Sky settings.

.. image:: src_images/scene_settings/world_world.png
   :align: center
   :width: 100%

*Render Sky*
    If this parameter is enabled, the engine will render sky in the scene.

*Paper Sky*
    If this parameter is enabled, sky gradient will always be drawn from the top of the screen to the bottom, regardless of the camera's position and angles.

*Blend Sky*
    Smooth transition between the horizon and zenith colors.

*Real Sky*
    Sky rendering with the horizon affected by the camera angle.

*Horizon Color*
    Sky color at the horizon.

*Zenith Color*
    Sky color in the zenith.

*Reflect World*
    Render the sky while rendering reflections.

*Render Only Reflection*
    Render the sky *only* while rendering reflections.

*World Background*
    Enables and disables ``World Background`` option (located under the ``Display`` tab of the ``3D View`` panel). When this option is activated, background colors are rendered in the viewport window the same way they would be in the engine itself.

.. _world_environment_lighting:

Environment Lighting
--------------------

Environment lighting settings. Described thoroughly in :ref:`their own section <environment_lighting>`.

.. image:: src_images/scene_settings/world_environment_lighting.png
   :align: center
   :width: 100%


.. _world_mist:

Mist
----

Mist settings.

.. image:: src_images/scene_settings/world_mist.png
   :align: center
   :width: 100%

*Minimum*
    Minimum intensity of the mist. Set to zero by default.

*Depth*
    At this distance from the camera the mist effect reaches maximum intensity. Set to 25 by default.

*Start*
    The mist effect starts to appear at this distance from the camera. Set to 5 by default.

*Height*
    This parameter specifies how fast mist intensity decreases as the camera's altitude increases. Set to 0 by default.

*Fall Out*
    This parameter specifies the rule, according to which the density of the mist changes between the borders (specified by the ``Start`` and ``Depth`` parameters). Can have one of the following values: ``Quadratic``, ``Linear``,  ``Inverse Quadratic``. Set to ``Quadratic`` by default.

*Use Custom Colors*
    Can be used to set the color of the mist. Enabled by default. If this parameter is disabled, standard (0.5, 0.5, 0.5) color will be used.

*Fog Color*
    The color of the mist. Can be changed, if the ``Use custom colors`` parameter is enabled. Light gray (0.5, 0.5, 0.5) color is used by default.

.. _world_procedural_sky:

Procedural Sky
--------------

    Procedural sky settings. Described thoroughly in :ref:`their own section<atmosphere>`.

.. image:: src_images/scene_settings/world_procedural_sky.png
   :align: center
   :width: 100%

.. _world_animation:

Animation
---------

Environment animation settings.

.. image:: src_images/scene_settings/world_animation.png
   :align: center
   :width: 100%

*Apply Default Animation*
    If this parameter is enabled, the engine will start playback of the animation assigned to the environment upon loading.

*Behavior*
    Sets the behavior of the default animation. Available options are:
    
    * ``Loop`` - the animation will be played repeatedly.
    * ``Finish Stop`` - the animation will be played once.
    * ``Finish Reset`` - the animation will be played once, and then switched back to the first frame.

    This option is only available if the ``Apply Default Animation`` parameter is enabled.


.. _world_export_options:

Export Options
--------------

Environment parameters export settings.

.. image:: src_images/scene_settings/world_export_options.png
   :align: center
   :width: 100%

*Do Not Export*
    If this parameter is enabled, environment settings will be ignored during the export.
