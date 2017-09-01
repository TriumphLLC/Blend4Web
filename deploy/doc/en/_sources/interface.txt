.. _blender_interface:

**********************
Blender User Interface
**********************

.. contents:: Table of Contents
    :depth: 2
    :backlinks: entry

Blender is a free open source 3D creation suite that supports an entire 3D pipeline from objects modeling to texturing, rigging and animating to rendering, compositing and even video editing. Blender can also be used to create interactive application, including web-based ones.

Blender is a cross-platform software that runs on Windows, Linux and macOS platforms equally well.

Blender interface consists of several windows. The number and types of windows present on the screen is not strictly defined and can be changed by a user manually or by selecting a preset from the ``Screen Layout`` menu at the top of the screen.

.. _ui_3dview:

3D View
=======

.. image:: src_images/interface/interface_3dview.png
   :align: center
   :width: 100%

The main window of the program, showing a currently loaded 3D scene (through a camera or otherwise). 3D objects that compose any 3D scene are created, edited and animated in this window.

This window is open by default.

.. _ui_timeline:

Timeline
========

.. image:: src_images/interface/interface_timeline.png
   :align: center
   :width: 100%

This window (usually located an the bottom of the screen) shows various data that concern animation. This includes the current frame, the total number of frames (i.e. the length of the animation in the current scene) and keyframes for the selected object. The keyframes themselves are also created in this window.

This window is open by default.

.. _ui_graph_editor:

Graph Editor
============

.. image:: src_images/interface/interface_graph_editor.png
   :align: center
   :width: 100%

A tool for modifying various aspects of object animation using f-curves. Graph Editor can be used in Blend4Web same way it is used in Blender.

.. _ui_dope_sheet:

Dope Sheet
==========

.. image:: src_images/interface/interface_dope_sheet.png
   :align: center
   :width: 100%

A tool for managing keyframes. Dope Sheet can be used in Blend4Web same way it is used in Blender.

.. _ui_nla_editor:

NLA Editor
==========

.. image:: src_images/interface/interface_nla_editor.png
   :align: center
   :width: 100%

A tool for editing non-linear animations. Blend4Web engine supports NLAs; the user manual features a :ref:`dedicated section <nla>` on them.

.. _ui_uv_editor:

UV/Image Editor
===============

.. image:: src_images/interface/interface_uv.png
   :align: center
   :width: 100%

This tool can be used for editing both object UV maps and various 2D assets such as texture images.

UV maps are used in Blend4Web as well.

.. _ui_video_sequence_editor:

Video Sequence Editor
=====================

.. image:: src_images/interface/interface_video_sequence_editor.png
   :align: center
   :width: 100%

An interface for editing video sequences. This is a fully-fledged video editing system that can be used to trim video files, apply effects to them and combine them into one video. It is not used in Blend4Web engine.

.. _ui_movie_clip_editor:

Movie Clip Editor
=================

.. image:: src_images/interface/interface_movie_clip_editor.png
   :align: center
   :width: 100%

A tool for editing movie clips. It is generally used for motion tracking and for masking movies. It is not used in Blend4Web engine.

.. _ui_text_editor:

Text Editor
===========

.. image:: src_images/interface/interface_text_editor.png
   :align: center
   :width: 100%

A simple text editor is included in Blender. It supports word wrapping, syntax highlighting, line numbers, find and replace functions and some other features.

Text editor is not used in Blend4Web for editing project files, as :ref:`Project Manager <project_management>` features its own built-in :ref:`editor <project_edit>` for editing project files. However, text files created in Text Editor (or imported to a ``.blend`` file using it) can be used as description sources for :ref:`Meta Tags <objects_meta_tags>` in Blend4Web.

.. _ui_node_editor:

Node Editor
===========

.. image:: src_images/interface/interface_node_editor.png
   :align: center
   :width: 100%

An interface for creating node-base materials, textures and post-processing effect. :ref:`Material nodes <node_materials>` are supported in Blend4Web engine, while texture and compositing nodes are not. Blend4Web also features another type of nodes for creating :ref:`scene logic <logic_editor>`.

.. _ui_logic_editor:

Logic Editor
============

.. image:: src_images/interface/interface_logic_editor.png
   :align: center
   :width: 100%

A tool for editing logic blocks used in Blender Game Engine.

.. note::

    Blend4Web engine does not use Blender Logic Editor. Instead, it features a similar, but separate tool for editing scene logic: the node-based :ref:`Logic Editor <logic_editor>`.

.. _ui_prop:

Properties
==========

.. image:: src_images/interface/interface_properties.png
   :align: center
   :width: 100%

The second main window of the program. Contains various settings, some of which only concern currently selected object, and other apply to the whole of the scene.

This window is usually located at the right of the 3D View window.

The Properties window consists of several tabs. Each one of these tabs house a specific group of parameters. The tabs are:

.. _ui_prop_render:

Render
------

.. image:: src_images/interface/interface_render.png
   :align: center
   :width: 100%

This tab contains options that concern rendering.

In Blend4Web mode, the Render tab features a slightly different set of options that are described :ref:`here <render_settings>`.

.. _ui_prop_render_layers:

Render Layers
-------------

.. image:: src_images/interface/interface_render_layers.png
   :align: center
   :width: 100%

This tab can be used to separate the rendered image into several “layers” (such as diffuse colors, shadows, normal maps etc.) that can than be used for compositing in Blender or in other software. This tab is not used in Blend4Web engine.

.. _ui_prop_scene:

Scene
-----

.. image:: src_images/interface/interface_scene.png
   :align: center
   :width: 100%

Contains various parameters that concern 3D scene as a whole.

This tab is supported in Blend4Web, but has a different set of options that are described :ref:`here <scene_settings>` in greater detail.

.. _ui_prop_world:

World
-----

.. image:: src_images/interface/interface_world.png
   :align: center
   :width: 100%

Settings that control the environment of the scene can be found in this tab. This includes such parameters as background colors, environment lighting, mist etc.

This tab is also used Blend4Web engine to set the environment. The settings themselves differ a bit from the ones in Blender. The differences are described :ref:`here <world_settings>`.

.. _ui_prop_object:

Object
------

.. image:: src_images/interface/interface_object.png
   :align: center
   :width: 100%

This tab contains various object settings such as name, location, groups and so on. Object parameters are extensively used in Blend4Web engine and are described in a :ref:`dedicated section <objects>` of this manual.

.. _ui_prop_constraints:

Constraints
-----------

.. image:: src_images/interface/interface_constraints.png
   :align: center
   :width: 100%

Constraints can be used to restrict object’s movement in various ways, or to set it along a certain path. Constraints are often utilized by 3D artists to simplify the process of creating complex animations and to make it more convenient. This tab contains tools for adding constraints to a selected object, setting them up or remove them, if necessary.

The Constraints tab can be used in Blend4Web. However, at the moment the engine does not support some of the object constraints available in Blender. See the :ref:`dedicated section <objects_constraints>` to learn how to use object constraints in Blend4Web.

.. _ui_prop_modifiers:

Modifiers
---------

.. image:: src_images/interface/interface_modifiers.png
   :align: center
   :width: 100%

This list contains all modifiers attached to the currently selected object. Modifiers can be added, configured and removed on this tab.

Modifiers are supported in Blend4Web engine, but by default are not applied to objects upon export. You can apply modifiers using :ref:`Apply Modifiers <apply_modifiers>` or Apply Scale and Modifiers options.

.. _ui_prop_data:

Data
----

.. image:: src_images/interface/interface_object_data.png
   :align: center
   :width: 100%

This tab contains information on object’s vertex groups and colors, UV maps, shape keys and other similar stuff. It is supported in Blend4Web and does not feature any additional options.

.. _ui_prop_material:

Material
--------

.. image:: src_images/interface/interface_material.png
   :align: center
   :width: 100%

The material (or multiple materials) of an object can be set here.

Blend4Web engine utilizes materials in mostly the same way Blender does. The differences are described in a :ref:`dedicated chapter <materials>`.

.. _ui_prop_texture:

Texture
-------

.. image:: src_images/interface/interface_texture.png
   :align: center
   :width: 100%

This tab is intended for setting up textures for materials and the environment alike.

The same tab is used to set up textures in Blend4Web. Working with textures is described in a :ref:`dedicated chapter <textures>`.

.. _ui_prop_particles:

Particles
---------

.. image:: src_images/interface/interface_particles.png
   :align: center
   :width: 100%

Here, particle systems are created and set up.

Particles are supported in Blend4Web engine as well and can be used to create :ref:`fluids <particles>` and :ref:`object instances <particles_instancing>`.

.. _ui_prop_physics:

Physics
-------

.. image:: src_images/interface/interface_physics.png
   :align: center
   :width: 100%

Physical settings of a selected object: a physical model associated with an object, its bounding volume and so on. Physic is utilized in Blend4Web engine and has an :ref:`entire chapter <physics>` dedicated to it.

.. _ui_outliner:

Outliner
========

.. image:: src_images/interface/interface_outliner.png
   :align: center
   :width: 100%

Contains so-called scene graph, a tree-like structure that organizes all data present in the .blend file.

By default, this window is located in the top right corner of the Blender window.

.. _ui_settings:

User Preferences
================

This window contains various Blender settings. These settings are separated into several categories each one of which occupies one tab located at the top of the window. The tabs are:

.. _ui_settings_interface:

Interface
---------

.. image:: src_images/interface/interface_up_interface.png
   :align: center
   :width: 100%

This tab contains various setting for adjusting the interface of the program.

.. _ui_settings_editing:

Editing
-------

.. image:: src_images/interface/interface_up_editing.png
   :align: center
   :width: 100%

This tab allows you to set how various object editing tools interact with your input.

.. _ui_settings_input:

Input
-----

.. image:: src_images/interface/interface_up_input.png
   :align: center
   :width: 100%

User-interaction settings. Hot keys are set here, as are the way Blender reacts to mouse and keyboard events.

.. _ui_settings_addons:

Add-ons
-------

.. image:: src_images/interface/interface_up_addons.png
   :align: center
   :width: 100%

Various Blender add-ons are installed, configured and removed here. This includes :ref:`Blend4Web add-on <addon>`.

.. _ui_settings_themes:

Themes
------

.. image:: src_images/interface/interface_up_themes.png
   :align: center
   :width: 100%

This tab allows the user to customize Blender interface and color scheme, both manually or by selecting one of the pre-existing interface themes.

.. _ui_settings_file:

File
----

.. image:: src_images/interface/interface_up_files.png
   :align: center
   :width: 100%

This tab is used to configure default file path for blend files, textures, rendered images and other files. Auto-save preferences are also set up here.

The ``Scripts`` field on this tab is used for installing Blend4Web engine. The process of installation is thoroughly described in the :ref:`dedicated chapter <sdk_install>`.

.. _ui_settings_system:

System
------

.. image:: src_images/interface/interface_up_system.png
   :align: center
   :width: 100%

Various system settings, including resolution, rendering device, viewport settings and interface language.

.. _ui_info:

Info
====

.. image:: src_images/interface/interface_info.png
   :align: center
   :width: 100%

The main menu bar with a list of error messages. This window is open by default and can be found at the top of the screen (right above the ``3D View`` window).

.. note::

    The list of errors is folded by default.

.. tip::

    You can expand it by dragging the border of the ``Info`` window down.

.. _ui_file_browser:

File Browser
============

.. image:: src_images/interface/interface_file_browser.png
   :align: center
   :width: 100%

This is a built-in file manager that can be used for various file-related operations, mostly opening/saving .blend files and importing/exporting scenes and assets.

.. _ui_python_console:

Python Console
==============

.. image:: src_images/interface/interface_python_console.png
   :align: center
   :width: 100%

This is a tool intended for an experienced user. The Python Console offers a quick way to execute commands, complete with auto-complete feature, a command history and full access to the entire Python API.

