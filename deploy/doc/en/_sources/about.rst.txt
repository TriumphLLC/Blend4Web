.. _about:

**************
Overview
**************

.. index:: Blend4Web

.. _about_product:

What's Blend4Web
===================

Blend4Web is a web-oriented 3D engine - a software framework for authoring and interactive rendering of three-dimensional graphics and audio in browsers.

The platform is intended for visualizations, presentations, online-shops, games and other rich internet applications.

The Blend4Web framework is integrated tightly with Blender - a 3D modeling and animation tool (hence the name). The content is rendered by means of WebGL and other browser technologies, without the use of plugins.

Technically Blend4Web is a library for web pages, a Blender add-on and some tools for debugging and optimization.

The Blend4Web 3D engine has been developed by Triumph LLC employees since 2010. The engine was first released on March 28 2014.


.. index:: engine

.. _about_engine:

"About Engines"
===============

An engine is a separate part of software code which is used by external applications for implementing the required functionality.

Engine examples are: site engine, blog engine, online shop engine, wiki engine, search engine, game engine etc. The economical reason for the existence of software engines is multiple usage of the same functionality. For example developers may create relatively cheap online shops or games using one or another engine.


.. index:: graphics engine, three-dimensional engine

.. _about_graphics_engine:

Graphics Engine, Game Engine
============================

A graphics engine performs special functions in displaying graphics. It is an intermediary between:

    - high-level application part (game logic, business logic) and 
    - low-level system part (for example, the graphics library :ref:`WebGL <about_webgl>` and underlying :ref:`drivers <about_drivers_video_cards>`).

A graphics engine may be combined with the sound system, the physics engine, the artificial intelligence system, the networking system and the scene and logic editors producing a **three-dimensional engine** - an integrated environment for authoring 3D applications.


.. index:: WebGL

.. _about_webgl:

What's WebGL
===============

WebGL (Web Graphics Library) is one of the modern browser technologies which allows authoring 3D graphics applications. In other words WebGL is "3D in a browser".


.. index:: WebGL; browser support

.. _browser_webgl_support:

WebGL Browsers Support
===========================

At the moment WebGL is supported in to a varying degree by all browsers.


Desktop Browsers
----------------

* `Chrome <http://www.google.com/chrome>`_
* `Yandex Browser <http://browser.yandex.com/>`_ 
* `Firefox <http://www.mozilla.org/firefox>`_
* `Opera <http://www.opera.com/browser>`_
* `Safari <http://www.apple.com/safari/>`_ 8+
* `Internet Explorer <http://windows.microsoft.com/en-us/internet-explorer/download-ie>`_ 11
* `Microsoft Edge <https://www.microsoft.com/en-us/windows/microsoft-edge>`_


Mobile Platforms
----------------

* Android
* BlackBerry
* Firefox OS
* iOS 8
* Sailfish OS
* Tizen
* Ubuntu Touch

For further details see the :ref:`dedicated section <webgl_support>` in the Problems and Solutions chapter.

.. index:: WebGL; advantages

.. _about_webgl_benefits:

Advantages of WebGL
===================

* works in browsers without installing additional software (plugins)
* crossplatform, intended for all desktop and embedded systems
* `open standard <http://en.wikipedia.org/wiki/Open_standard>`_, does not require licensing fees
* supported by the leading participants of the IT market (Google, Apple, Microsoft, Nvidia, Samsung, Adobe and others)
* based on OpenGL which is familiar to developers
* can be integrated with other :ref:`browser technologies <about_browser_tech>`


.. index:: Blender

.. _about_blender:

What's Blender
==============

Blender is a popular piece of software for 3D modeling and animation and is free and open source. Models and scenes which are created in this software can be displayed, for example, by means of a :ref:`three-dimensional engine <about_graphics_engine>` on a web page.


.. index:: 3D Modeling

.. _about_modelling:

3D Modeling
===========

Authoring graphics resources requires trained specialists - 3D artists.

A typical workflow may include the following stages:

* choosing photos and/or creating concepts and sketches (views from the front - from the side - from the above) of the future model or scene
* modeling - a 3D model consisting of polygons is created
* UV mapping - the model is unwrapped for further overlaying of textures (flat images) 
* texturing - textures are overlaid on the 3D model
* materials setup - materials are assigned for different parts of the model and tuned (for example, a wooden door with a metal handle)
* rigging - the controlling elements ("skeletal bones") are attached to the model to animate it
* animation - the model is set in motion to visualize actions for example - of characters
* export - can be performed on any stage to display the 3D model in its final form, for example, on a web page

In addition, realism improving techniques are often used in the process of creating 3D models which require additional stages:

* creating a high-poly model - a detailed version of the model is created
* "baking" of a normal map - details from the high-poly model are transferred to the main model in the form of a special texture (normal map)
* creating a specular map - different reflection color and ratio are assigned to different model parts
* baking environment maps - is performed to visualize the surrounding environment reflection on the model surface
* setting up the camera and the light sources on the scene
* physical simulation parameters setup - particles, cloth

The time required to author 3D models and animation depends on their complexity and required quality and may vary from 1-2 days (for example a game item) to 1-2 weeks (for example a detailed aircraft model) and even to several months (realistic characters with clothing, hair, face sets, with animation and figure parameters setup).


.. index:: browser technologies, browser

.. _about_browser_tech:

Browser Technologies
=====================

Browser is a program for viewing Internet content. At the dawn of Internet technologies the browser's role was to view text pages with the inclusion of static images ("hyper-text"). Modern browsers are full-scale platforms for multimedia web applications.

Among the already implemented and promising browser features which are used in :ref:`Blend4Web <about_product>` the following technologies can be noted:

* three-dimensional graphics, `WebGL <https://www.khronos.org/registry/webgl/specs/latest/>`_
* `Typed Array <https://www.khronos.org/registry/typedarray/specs/latest/>`_
* `Timing control for script-based animations <http://www.w3.org/TR/animation-timing/>`_ (requestAnimationFrame)
* two-dimensional graphics, `HTML Canvas 2D Context <http://www.w3.org/TR/2dcontext/>`_
* sound processing, `Web Audio API <http://www.w3.org/TR/webaudio/>`_
* binary data loading, `XMLHttpRequest Level 2 <https://www.w3.org/TR/XMLHttpRequest2/>`_
* `Fullscreen <http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html>`_
* `Pointer Lock <http://dvcs.w3.org/hg/pointerlock/raw-file/default/index.html>`_
* multithreading, `Web Workers <http://www.w3.org/TR/workers/>`_
* `Device Orientation <http://www.w3.org/TR/orientation-event/>`_

Other promising technologies:

* `Scalable Vector Graphics (SVG) <http://www.w3.org/TR/SVG/>`_
* safe file access, `File API <http://www.w3.org/TR/FileAPI/>`_, `File API: Directories and System <http://www.w3.org/TR/file-system-api/>`_
* real-time communication between browsers, `WebRTC <http://dev.w3.org/2011/webrtc/editor/webrtc.html>`_
* persistent network connection, `The WebSocket API <http://www.w3.org/TR/websockets/>`_
* `Gamepad <http://dvcs.w3.org/hg/gamepad/raw-file/default/gamepad.html>`_


.. index:: interactive graphics

.. _about_interactive_graphics:

Interactive Graphics
====================

Applied to computer graphics the term "interactive" means that the user can interact with a constantly changing image. For example the user can change the view direction in a 3D scene, move the objects, trigger animation and carry out other actions normally associated with computer games.

Graphics interactivity is achieved by utilizing a frequent change of images, so the user action (for example a mouse movement or the pressing of a key) between frames leads to the image changing in the next frame. Images must replace each other so frequently that the human eye could not recognize them individually (at least 30 frames per second).

"Real-time graphics" or "real-time rendering" are also similar in meaning to the term.


.. index:: video card, drivers

.. _about_drivers_video_cards:

Video Cards and Drivers
=======================

Interactive graphics is provided by a special-purpose hardware part of modern computers so called graphics processor which can be implemented as a discrete device (video card) or as a part of the central processing unit.

Main graphics processors vendors for desktop computers are:  - Nvidia (GeForce, Quadro), AMD (Radeon), Intel (HD), for embedded devices - ARM (Mali), PowerVR (SGX), Nvidia (Tegra), Qualcomm (Adreno) (trade marks are specified in brackets).

Program access to graphics processor resources is carried out via an intermediate program called driver. It's important for the correct working of interactive graphics programs to have drivers of the latest version in the system. Drivers can be installed (or upgraded) from corresponding websites of graphics processors vendors. See detailed info in the section :ref:`webgl_not_working`.


