.. _textures:

.. index:: textures

********
Textures
********

.. contents:: Table of Contents
    :depth: 2
    :backlinks: entry

Textures are hand-made or procedurally generated images that can be applied to the model surfaces to add more detail. As a rule, the image pixels are assigned to the 3D surface points using texture mapping. For this reason they are sometimes referred to as maps.

Usually the textures are placed into :ref:`material <materials>` texture slots. They can be also used for :ref:`particle systems <particles_textures>` parametrization and for creating the :ref:`skydome <skydome_texture>`.

.. index:: textures; types

Texture Types
=============

The ``Type`` drop-down menu (for selecting texture type) is located under the ``Textures`` tab. The engine supports the following texture types:

#. ``Image or Movie``
    
    In this case, the texture is defined by an image or a video file. Following file formats are supported:

        - ``.PNG``
        - ``.JPG``
        
    It can be used for the following purposes:

    - :ref:`diffuse map <diffuse_map>`
    - :ref:`specular map <specular_map>`, this can also be packed into the alpha channel of a diffuse texture
    - :ref:`normal map <normal_map>`
    - height map; this must be packed into the alpha channel of a normal map; it is used for visualization of relief surfaces (:ref:`parallax mapping <parallax_mapping>`).
    - :ref:`stencil map <stencil_map>`
    - :ref:`video texture <video_texture>`
#. ``Environment Map``
    - :ref:`mirror map <mirror_map>`
    - :ref:`skydome texture <skydome_texture>`
    - used for implementation of an :ref:`environment lighting <environment_lighting>` method
#. ``None``
    - applied to the Blender's default scene cube. It is also used for :ref:`rendering a scene to texture <render_to_texture_scene>` and for :ref:`rendering canvas textures <render_to_texture_canvas>`.
#. ``Blend``, gradient
    - is used in :ref:`particle systems <particles_textures>`

.. index:: textures; settings

.. _main_conf:

Generic Settings
================

*Dimensions*
    Bitmap dimensions for image textures (image width and height in pixels) should be a 2\ :sup:`N` number, i.e. 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096 px. Using textures with other dimensions (so-called NPOT) is supported but is not recommended. Dimensions should be at least 4 pixels for the correct texture compression. Normally square images are used (e.g. 512 x 512 px), however rectangular ones can be used too (e.g. 4 x 128 px). Using images bigger than 2048 px is not recommended.

.. _texture_extension:

*Image Mapping > Extension*
    Texture coordinates interpretation mode (Wrap Mode in WebGL). This is available for ``Image or Movie`` texture type. In case of ``Repeat`` value the engine sets the ``REPEAT`` mode for the texture. In this case the integer part of the texture coordinates is ignored and the fractional part is used. In all other cases (for example ``Extend``) the engine sets the ``CLAMP_TO_EDGE`` mode. In this case the texture coordinates are limited by the [0, 1] segment. The default value is ``Repeat``.

.. index:: material capture, matcap

*Mapping > Coordinates*
    Texture coordinates type. Supported types are ``UV`` (use UV map), ``Normal`` (use direction at the camera; available only for diffuse maps; used for the creation of **material capture**, **matcap**) and ``Generated``. The default value is ``Generated``.

*Mapping > Size*
    Scaling the UV map along respective axes. The default values are 1.0.

*Export Options > Do Not Export*
    Do not export the texture.

.. _texture_disable_compression:

*Export Options > Disable Compression*
    Disable texture compression (using ``DDS`` texture format) for this texture. Used in cases when :ref:`texture compression <dds>` deteriorates the image quality. For example it's recommended to disable compression for mask textures used to mix different parts of materials.

*Export Options > Shore Distance Map*
    Used in :ref:`outdoor rendering <outdoor_rendering>`.

*Export Options > Anisotropic Filtering*
    Anisotropic filtering factor for the individual texture. It has priority over the similar parameter for the scene. The default value is ``DEFAULT`` (i.e. use the scene settings).

*Water Foam*
    The foam texture. Used by the water rendering material.

.. note::

    Texture compression is disabled for textures used as normal maps.


.. _diffuse_map:

.. index:: textures; diffuse, diffuse map

Diffuse Map
===========

A diffuse map is used for specifying scattered light distribution (the Lambert model).

Activation
----------

Enable the ``Diffuse > Color`` checkbox on the ``Textures > Influence`` panel.

Additional Settings
-------------------

*Influence > Diffuse > Color*
    Influence of the texture on the diffuse color. The default value is 1.0.

*Influence > Blend*
    The type of the interaction with the material color (``Material > Diffuse > Color``), or with the vertex color if the ``Vertex Color Paint`` checkbox is enabled. The following types are supported: ``Mix`` (mixes with the color), ``Multiply`` (multiplies by the color). The default value is ``Mix``.


.. _specular_map:

.. index:: textures; specular map

Specular Map
============

The specular map is used for specifying the reflected light color distribution (the Phong model).

Activation
----------

Enable the ``Specular > Color`` checkbox on the ``Textures > Influence`` panel.

Additional Settings
-------------------

*Influence > Specular > Color*
    The influence of the texture on the reflected light color. The default value is 1.0.

*Influence > Blend*
    The type of interaction with the reflected light color of the material (``Material > Specular > Color``). ``Mix`` (mixes with the color) is the only supported type. The default value is ``Mix``.

The specular map can be packed to the alpha channel of a diffuse texture for optimization purposes. In such case it is required for the texture to enable the ``Diffuse > Color`` and ``Specular > Color`` checkboxes simultaneously. The color range is limited by gray tints.


.. _normal_map:

.. index:: textures; normal map

Normal Map
==========

A normal map is used for specifying the distribution of surface normals (perpendiculars) with the purpose of the relief detalization. The information about the normals should be stored in the texture space of coordinates. Normal maps baked in the object space of coordinates are not supported.

Activation
----------

Set the ``Image > Color Space`` parameter to ``Non-Color``.

Enable the ``Geometry > Normal`` checkbox on the ``Textures > Influence`` panel.

Additional Settings
-------------------

*Influence > Geometry > Normal*
    Normal map influence on the resulting normals calculation. The default value is 1.0.


.. _parallax_mapping:

.. index:: textures; height map, parallax mapping

Height Map. Parallax Mapping
============================

A height map contains information about the distribution of relative relief heights. The higher the surface level is, the brighter is its color. A height map combined with a normal map is required for the implementation of relief surface effect (parallax mapping). A height map should be present in the alpha channel of a normal map.

.. image:: src_images/textures/textures_height_map.png
   :align: center
   :width: 100%

Activation
----------

For the normal map enable the ``Parallax`` panel in addition to the ``Geometry > Normal`` checkbox.

Additional Settings
-------------------

*Parallax > Parallax Scale*
    Influence factor for the relief surface effect. The default value is 0.03.

*Parallax > Parallax Steps*
    The number of iterations for the relief surface calculations. Bigger value leads to better quality but is more computationally expensive.

*Parallax > Parallax LOD distance*
    Distance at which the parallax effect is observed.

.. image:: src_images/textures/textures_parallax.png
   :align: center
   :width: 100%

|


.. _stencil_map:

.. index:: textures; stencil map

Stencil Map
===========

The special purpose texture (colorful or grayscale) contains information about the distribution of other texture surfaces.

Activation
----------

1. In case of node materials a stencil map should be used in the corresponding node structure.
2. In case of generic materials a stencil map should be located in a texture slot between two mixed diffuse textures. A stencil map requires to set both the ``RGB to Intensity`` and the ``Stencil`` checkboxes on the ``Textures > Influence`` panel.

Additional Settings
-------------------

In the case of generic materials one of the mixed diffuse textures can have the ``Normal`` ("matcap") texture coordinates type.

Limitations
-----------

In case of generic materials the engine only interprets the red channel of a stencil map. Specular maps or normal maps (if any) are not being mixed. The ``Mapping > Size`` setting is extracted from the first texture and is applied to all remaining textures.

Example
-------

The apple model material has the following textures: a normal map, a diffuse texture with a specular map in its alpha channel, a stencil map, a diffuse "matcap" map, an environment map.

.. image:: src_images/textures/textures_stencil_apple.png
   :align: center
   :width: 100%

|

.. image:: src_images/textures/textures_stencil_apple_separate_textures.png
   :align: center
   :width: 100%

|


.. _video_texture:

Video Textures
==============

A video file can be used as a texture if ``Image or Movie`` texture type is selected.

.. note::

    Video textures support playing back just video tracks. Audio tracks should be played back by using a ``SPEAKER`` object.

Supported formats (containers):
-------------------------------

* webm, VP8 codec (Chrome, Firefox)
* m4v, H.264 codec (Chrome, Safari, IE)
* ogv, Theora codec (Chrome, Firefox)

We recommend to use *WebM* as a basic format. It is an open standard supported by the majority of browsers and offers good picture quality.

.. note::

    Files saved in mp4 and ogg formats have different extensions for audio and video data: *.mp4* and *.ogg* extensions are used for sounds, *.m4v* and *.ogv* - for video.

Converting resources between different formats is described in the :ref:`corresponding section <converter>`.

Setting up the Texture
----------------------

The following settings are available for video textures on the ``Texture > Image`` panel:

*Image > Frames*
    Length of the played fragment in frames.

*Image > Offset*
    The number of the frame from which the video playback starts.

*Image > Cyclic*
    Start video playback afresh each time it finishes.

*Image > Allow NLA*
    Play back the texture as part of an NLA track. Additionally, enable NLA in the global scene settings through activating ``Scene > NLA``. Enabled by default.

For NLA-controlled textures the following option is also applicable:

*Image > Start*
    Video playback delay (in frames) when using non-linear animation.

For non-NLA-controlled textures the following option is also applicable:

*Image > Auto Refresh*
    Play back the video immediately after the scene is loaded.

.. image:: src_images/textures/video_tex.png
   :align: center

|

The video playback rate can be increased. To do this set ``Scene > Dimensions > Frame rate`` to a value which is different from the FPS value for the videos. Video playback rate is increased proportionally to the ratio of the scene's FPS and the video's FPS.

.. image:: src_images/textures/fps.png
   :align: center

.. note::

    When video textures are used together with NLA, the video playback can be not corresponding with Blender settings. Namely, there can be observed some lagging withing 5-6 frames due to starting/pausing delay of the <video> HTML element.

Specifics of Mobile Devices
---------------------------

The peculiarities for mobile devices are as follows:

#. Normal operation of video textures on iPhone is not possible because these devices play back videos via the standard iOS video player. For these devices you need to convert your videos to special ``.seq`` format by using our :ref:`converter <converter>`.
#. some devices only support playing back only one video file.
#. stable operation is not guaranteed if the ``Offset`` value is not zero.
#. not all devices support changing the video playback rate.
#. iPad and iPhone do not provide the possibility to control the audio volume for video, and so the audio track should be removed from the video before the file is added to Blender.

.. _environment_map:

.. index:: textures; environment map

Environment Map
===============

An environment map can be used as a :ref:`mirror map <mirror_map>`, as a static :ref:`sky texture (skydome) <skydome_texture>` and also for implementation of an :ref:`environment lighting <environment_lighting>` method.

The engine considers it as a cube texture. Environment map bitmaps should contain 6 projected environment images, packed in 2 rows 3 pieces in each (a Blender format). Bitmap dimensions for each image should follow the 2\ :sup:`N` rule (512, 1024 etc).

It is recommended to use the lossless format (PNG) in order to avoid seams.

.. image:: src_images/textures/environment_map.png
   :align: center
   :width: 100%


Making Environment Maps
-----------------------

Blender has an option for baking a scene into an environment map. To do this:

#. Create a scene for baking.
#. Add an empty object in the supposed point of view (``Add > Empty``).
#. Go to the ``World`` tab then to the ``Textures`` tab and create a new texture with the ``Environment Map`` type.
#. On the ``Environment Map`` panel select the ``Static`` source, then select the empty object in the ``Viewport Object`` field, then set the 2\ :sup:`N` dimension (512, 1024 etc).
#. Render the scene by pressing ``F12`` (a camera is required).
#. Save the environment map into a file.

.. image:: src_images/textures/textures_environment_map_baking_scene.png
   :align: center
   :width: 100%

|

.. image:: src_images/textures/environment_map_baking_ui.png
   :align: center
   :width: 100%

.. index:: textures; mirror map

.. _mirror_map:

Mirror Map
==========

A mirror map is used to visualize the surface reflection. This is an :ref:`environment map <environment_map>`.

Activation
----------

Select the ``Environment Map`` texture type (``Type``). Enable the ``Shading > Mirror`` checkbox on the ``Textures > Influence`` panel.

Additional Settings
-------------------

*Influence > Shading > Mirror*
    The degree to which the mirror map affects the reflection. The default value is 1.0.


.. seealso:: :ref:`Static reflection <reflection_static>`.


.. index:: textures; sky, skydome

.. _skydome_texture:

Skydome
=======

A skydome is used to visualize an infinitely far environment (for example the sky). This is an :ref:`environment map <environment_map>`.

Can be also used to implement one of the :ref:`environment lighting <environment_lighting>` methods.

Activation
----------

Create a world texture of ``Environment Map`` type. Select the ``Export Options > Sky Texture Usage > SKYDOME`` option. Enable ``World > Render Sky`` under the ``World`` tab.

.. note::

    The behavior of the texture is intentionally made as close as possible to the Blender internal render. That's why the texture may not be displayed upon its default settings. In order to make the texture visible, enable the ``Influence > Horizon`` checkbox on its panel and set the ``Horizon`` value to 1.0.

.. note::

    To imitate :ref:`environment lighting <environment_lighting>` you can select the ``Export Options > Sky Texture Usage > ENVIRONMENT_LIGHTING`` option. Also, you should select the corresponding option in the world settings: ``Environment Lighting > Sky Texture``.

    To use the world texture both for skydome and for environment lighting, select ``Export Options > Sky Texture Usage > BOTH``.


.. image:: src_images/textures/skydome.png
   :align: center
   :width: 100%

Additional Settings
-------------------

The engine also supports parameters from the world texture's ``Influence`` panel which are used for sky rendering. Mixing of the world texture with color depends on the ``World > Horizon Color`` and ``World > Zenith Color`` parameters, as well as on the ``Paper Sky``, ``Blend Sky`` and ``Real Sky`` options. All mixing options are supported (``Mix``, ``Add``, ``Multiply`` etc).

.. image:: src_images/textures/skydome.png
   :align: center
   :width: 100%

.. note::
    The ``Influence`` panel parameters only affect the sky rendering. They do not affect :ref:`environment lighting <environment_lighting>` by any means.

|


.. index:: textures; render to, render-to-texture, RTT


Special Texture Types
=====================

In order to use such textures, select ``None`` type under the ``Textures`` tab.

.. image:: src_images/textures/type_none.png
   :align: center

|

On the ``Textures > Export Options`` panel, you can set up properties for these textures:

*Export Options > Source Type*
    Select texture type: ``Scene`` - for rendering a 3D scene into the texture, ``Canvas`` - for using <canvas> HTML element and ``None`` - for indicating of its absence.

*Export Options > Source ID*
    The name of the scene which will be rendered into the texture (for ``Scene``), or ID of the <canvas> HTML element (for ``Canvas``).

*Export Options > Source Size*
    Texture resolution.

*Export Options > Extension*
    :ref:`Texture coordinates interpretation mode <texture_extension>`. Default is ``Repeat``.

*Export Options > Enable Mipmapping*
    Enable mipmapping for the Canvas texture. Enabled by default.

.. image:: src_images/textures/canvas_tex.png
   :align: center

.. _render_to_texture_scene:

Render-To-Texture
-----------------

An image of a 3D scene rendered in real time also can be used as a texture for an object in another scene ("main" scene). This technique is known as `render-to-texture` (RTT) and can be activated by following these steps:

#. Create an additional scene that will be rendered to the texture.
#. For convenience, give this scene a unique name.
#. Create a ``World`` setting for this scene.
#. Add the objects you need to the scene.
#. Add a camera to the scene and set it up.
#. Then, switch to the main scene.
#. Select the target object and create a UV map for it.
#. Create a texture that will act as the rendering target.
#. Set the ``None`` type for this texture.
#. Set the ``UV`` value for the ``Coordinates`` parameter under the ``Mapping`` tab.
#. Select the ``Scene`` type in the ``Export Options > Source Type`` menu.
#. Specify the name of the source scene in the ``Export Options > Source ID`` field.
#. Set the texture size in the ``Export Options > Source Size`` field (in pixels).

.. image:: src_images/textures/textures_render_to_texture.png
   :align: center
   :width: 100%

|

The engine also supports the cyclic rendering of scenes to each other.

  .. note::

    A project should contain at least one scene which is not rendered by any other scenes.


.. _render_to_texture_canvas:

Canvas textures
---------------

A <canvas> HTML element can be used as a texture. It can be modified via API.

Set the ``None`` type for the texture of the target object on the main scene, and select the ``Canvas`` type in the ``Export Options > Source Type`` menu. Set the texture size in the ``Export Options > Source Size`` field (in pixels).

Use the ``textures`` module to handle such textures. See the example below.

.. code-block:: javascript

    var m_tex = require("textures");
    ...
    var obj = m_scenes.get_object_by_name("NAME");
    var ctx = m_tex.get_canvas_ctx(obj, "TEXTURE_NAME");
    ...
    // operations with canvas context
    ...
    m_tex.update_canvas_ctx(obj, "TEXTURE_NAME");


Use ``get_canvas_texture_context()`` to obtain a context - this method requires the "canvas_id" identifier which should be defined in Blender. After `operations with the context <http://www.w3.org/TR/2014/CR-2dcontext-20140821/>`_, the ``update_canvas_ctx()`` function has to be called which will render modifications of the "canvas_id" element.

  .. note::

    If one Canvas type texture is assigned in Blender to several different objects, then after engine loading it still will be one texture and not several different ones. Any changes applied to it will be applied to all objects using this texture, which can be useful for optimization purposes. In case this effect is not needed, you should assign different textures in Blender or use :ref:`deep copy <mesh_copy>` after engine startup.
