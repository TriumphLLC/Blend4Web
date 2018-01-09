.. index:: web player

.. _web_player:

**********
Web Player
**********

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

The web player is a special application for rendering models and scenes in a
demonstration mode.


Desktop version:

.. image:: src_images/web_player/web_player_example.png
   :align: center
   :width: 100%

|

Mobile version:

.. image:: src_images/web_player/web_player_example_mobile.png
   :align: center
   :width: 100%

|

Usage
-----

You can copy the directory containing the web player files, namely
``deploy/apps/webplayer``, from the Blend4Web SDK distribution and deploy it
on your website. You can place the exported scene files on your website
and specify the path to them (absolute or relative) with the ``load`` web
player parameter.

When you export into a single HTML file the web player interface is
integrated automatically into it.


Navigation
----------

The camera (in the ``Target`` and ``Eye`` modes) is controlled by the mouse
with its button pressed or with the keys: ``W``, ``A``, ``S``, ``D``,
``R``, ``F`` (forward, left, back, right, up, down). The ``numpad`` keys are
also supported.

Control Panel
-------------

The web player's control panel is shown below.

.. image:: src_images/web_player/web_player_interface.png
   :align: center
   :width: 100%

1) show / hide control panel;
2) fullscreen mode on / off;
3) stereo rendering on / off;
4) set the scene quality;
5) sound on / off;
6) camera auto rotation mode on / off;
7) run / stop the engine;
8) open the help window;
9) tweet;
10) share via Facebook;
11) share via Google+;
12) share via VK;
13) share via Weibo.

.. _webplayer_attributes:

Attributes
----------

Web player accepts attributes from the browser address line:

.. image:: src_images/web_player/player_params.png
   :align: center
   :width: 100%

|

1) the special attribute ``load`` is used to load the scene, this attribute contains relative path to a JSON file.
2) in case of a WebGL error the optional ``fallback_image`` attribute is used to setup the background image instead of 3D content.
3) in case of a WebGL error the optional ``fallback_video`` attribute is used to setup the background video instead of 3D content.
   Can be used many times to add more video formats.
4) the optional ``show_fps`` attribute is used to display the FPS counter in the player's top right corner.
5) optional parameter ``autorotate`` is used to enable automatic camera rotation just after the scene loads.
6) the ``compressed_textures`` optional parameter is used to enable loading of minified and compressed textures (in DDS format).
7) the ``compressed_textures_pvr`` optional parameter is used to enable loading of textures compressed in PVRTC format. This parameter is used with the ``compressed_textures`` parameter.
8) the ``compressed_gzip`` optional parameter is used to enable loading of GZIP compressed resources such as ".json.gz", ".bin.gz", ".dds.gz" and ".pvr.gz".
9) optional ``alpha`` parameter is used to enable transparency for the rendering area.
10) the optional ``no_social`` attribute is used to disable social networks buttons on the control panel.
11) the optional ``socials`` attribute is used to selectively enable and disable social network buttons on the control panel. This attribute should look like ``socials=<...>``, where ``<...>`` is a set of letters corresponding to the social network buttons you want to enable (``f`` for Facebook, ``v`` for VK, ``t`` for Twitter, ``w`` for Weibo and ``g`` for Google+). The order of letters sets the order in which the buttons will appear on the screen.

.. note::

   If both ``fallback_image`` and ``fallback_video`` parameters are specified, the ``fallback_image`` parameter is used.

.. _wp_title:

Scene Name as Title
-------------------

By default the Web Player has the ``Blend4Web Web Player`` title. Assigning the meta tag ``title`` on the scene in Blender you can change that value to something else.

.. image:: src_images/web_player/title.png
   :align: center
   :width: 100%

Scene Errors
------------

If the player is used incorrectly it displays the corresponding errors.


1) The ``load`` :ref:`attribute <webplayer_attributes>` specifies a wrong path to the JSON file or the file is corrupt. 

.. image:: src_images/web_player/error_wrong_json_path.png
   :align: center
   :width: 100%

|

2) The ``load`` :ref:`attribute <webplayer_attributes>` is not found or is void.

.. image:: src_images/web_player/error_not_load_attr.png
   :align: center
   :width: 100%

|

3) WebGL initialization error. Please, look at :ref:`this page <renderer_not_working>` for the solution.

.. image:: src_images/web_player/error_webgl.png
   :align: center
   :width: 100%

|
