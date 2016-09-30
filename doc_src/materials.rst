.. _materials:

.. index:: materials

*********
Materials
*********

.. contents:: Table of Content
    :depth: 3
    :backlinks: entry

Materials describe the object surface’s response to light and also contain information about its transparency, reflectivity, physical parameters and so on.

Meshes can have one or more materials. In case of multiple materials they can be assigned to different polygons in the ``Edit Mode``. To do this select the needed polygons, select the needed material from the list and click the ``Assign`` button.

The following material types are supported: ``Surface``, ``Halo``.

.. index:: materials; lighting parameters

.. _material_lighting_params:

Lighting Parameters
===================

.. image:: src_images/materials/panel_shading.png
   :align: center
   :width: 100%

*Diffuse > Color*
    Diffuse light color. The default value is (0.8, 0.8, 0.8). It may interact with the diffuse map color.

*Diffuse > Intensity*
    Diffuse light intensity. The default value is 0.8.

*Diffuse > Shader*
    Diffuse shading algorithm. The default value is ``Lambert``.

*Specular > Color*
    Specular light color. The default value is (1.0, 1.0, 1.0). It may interact with the specular map color.

*Specular > Intensity*
    Specular light intensity. The default value is 0.5.

*Specular > Hardness*
    Exponent in the specular shading calculation formula. The default value is 50. Note that the formula used in the engine differs slightly from the Blender’s one.

*Specular > Shader*
    Specular shading algorithm. The default value is ``CookTorr``.

*Shading > Emit*
    Emission intensity. The default value is 0.0.

*Shading > Ambient*
    Ambient influence factor on material. The default value is 1.0.

*Shading > Shadeless*
    When enabled, a material doesn’t react to light. Disabled by default.

*Shading > Tangent Shading*
    When this parameter is enabled, the engine will use the material's tangent vector (instead of normal vector) for calculating the object's color. This can be used for creating anisotropic shading effects.

    .. figure:: src_images/materials/materials_tangent_shading_comparison.png
       :align: center
       :width: 100%
 
    **On the left:** standard shading model; **on the right:** tangent shading model.

*Shading > Double-Sided Lighting*
    Enables the double-sided lighting mode. This option is useful for non-transparent objects with a single-layered mesh.


.. index:: materials; transparency, transparency

.. _alpha_blend:

Transparency
============

.. image:: src_images/materials/panel_transparency.png
   :align: center
   :width: 100%

.. index:: transparancy; types

Types
-----

Transparency implementation type can be selected in the ``Transparency`` menu on the ``Properties > Material`` panel.

The engine supports the following transparency implementation types (sorted in the ascending order by performance):

*Alpha Sort*
    Transparent with a gradient. The engine sorts the triangles by camera distance in order to render overlapping transparent surfaces correctly. This operation is computationally expensive. It is recommended to use this feature for closed transparent geometry (bottle, car glass etc).

*Alpha Blend*
    Transparent with a gradient. The sorting of triangles is not performed. It is recommended to use this feature for unclosed transparent geometry (water surface, decals).

*Add*
    Transparent with a gradient. The sorting of triangles is not performed. The engine disables writing to the depth buffer which causes transparent surfaces to be rendered in arbitrary order. It is recommended to use this feature for effects (particle systems, glowing beams).

*Alpha Clip*
    Transparent without a gradient. The engine discards pixels if their alpha is less than 0.5. The sorting of triangles is not performed. It is recommended to use this feature with a mask texture to visualize smaller details (tree leaves, grass).

*Opaque*
    Non-transparent. Alpha is ignored. This is the default value.

.. image:: src_images/materials/alpha_types.png
   :align: center
   :width: 100%


.. index:: transparancy; settings

Additional Settings
-------------------

*Transparency > Show Transparency*
    Enabling the transparency checkbox is required for viewing transparent objects in Blender. The engine ignores this option - the ``Alpha Blend`` option is used instead.

*Transparency > Alpha*
    Material transparency level. The engine ignores this parameter (in contrast to Blender) if there is a diffuse texture - the alpha channel values of a texture are used instead.

*Transparency > Z Offset*
    This option explicitly specifies relative positioning order of objects with **different** materials with the purpose of depth sorting. The option can take both negative and positive values. The more distant the object is the lesser parameter value should be to provide correct rendering. The default value is 0.0.


.. index:: materials; reflection, reflection

.. _material_mirror:

Reflection
==========

.. image:: src_images/materials/panel_mirror.png
   :align: center
   :width: 100%

.. index:: reflection; static

.. _reflection_static:

Static Reflection
-----------------

A surface reflects the same image no matter how the environment changes. For activation simply use the :ref:`mirror map <mirror_map>`.

.. seealso:: :ref:`fresnel`

.. index:: reflection; dynamic

Dynamic Reflection
------------------

A surface reflects the selected objects in their current position. The engine supports planar and spherical reflections.

.. note::
    If you are using :ref:`node materials <node_materials>`, dynamic reflection will only work if a ``Material`` or ``Extended Material`` node is present in the node tree.

Activation
..........

#. Check ``Reflections`` setting on the ``Render > Reflections`` and Refractions panel.
#. For *reflective* objects enable the ``Reflective`` option on the ``Object > Reflections`` panel.

   * For planar reflections, set the ``Object > Reflections > Type`` property to ``Plane``. After that, add an empty object to be used as a reflection plane by executing for example ``Add > Empty > Single Arrow``. Rename it for convenience and specify its name in the ``Reflection plane`` field of the reflective object.
   * For cube-mapped reflections, set the ``Object > Reflections > Type`` property to ``Cube``.

#. For the needed materials of the *reflective* objects, set the ``Material > Mirror > Reflectivity`` value.

   * ``Mirror > Reflectivity > Show Reflectivity`` is required for displaying reflections on objects in Blender. The engine ignores this option.

#. For the *reflexible* objects, enable the ``Reflexible`` checkbox on the ``Object > Reflections`` panel.

.. note::

    It is also recommended to enable the ``World > Environment Lighting`` checkbox.


Limitations
...........

Normal maps and shadows are ignored in the reflected image for optimization purposes.


.. seealso:: :ref:`fresnel`


.. index:: reflection; fresnel effect

.. _fresnel:

Fresnel effect for reflection
-----------------------------

The Fresnel effect manifests itself as the dependency of the intensity of passing and reflected light on the incidence angle. If the angle of incidence is close to zero (i.e. light falls almost at right angle to the surface) the passing light portion is large and the reflected light portion is small. On the contrary if the angle of incidence is close to 90 degrees (i.e. light falls almost parallel to the surface) almost all light is reflected.

The engine uses the approximate Schlick’s formula:

    R = R\ :sub:`0` + (1 − R\ :sub:`0`)(1 - cos θ)\ :sup:`N`, where

    R - reflection coefficient,

    R\ :sub:`0` - reflection coefficient in case of viewing at a right angle to the surface (i.e. when θ = 0),

    θ - angle of incidence (which is equal to the angle of reflection under which light enters the camera), it is calculated by the engine in real-time,

    N - exponent.


Settings
........

Fresnel effect can be set up both for static and dynamic reflection.

*Material > Mirror > Fresnel*
    Fresnel power for reflection. This is the N exponent in the Schlick’s formula. In Blender it is limited to values from 0 to 5. If this parameter is equal to zero the Fresnel effect is not observed and the *full* reflection at all angles occurs. If this parameter is greater than zero, the material is less reflective when viewing surfaces at angles which are close to the right angle. The bigger this parameter is the bigger is the angle deviation from the right angle for which the Fresnel effect is observed.

*Material > Mirror > Blend*
    Fresnel factor for reflection. It is reduced to R\ :sub:`0` in the Schlick’s formula by the following expression: R\ :sub:`0` = 1 - ``Blend`` / 5. In Blender it is limited to values from 0 to 5. This parameter defines the Fresnel effect intensity: the bigger the ``Blend`` factor is, the more is the Fresnel effect influence. If it is equal to zero the Fresnel effect is not observed.

.. image:: src_images/materials/reflection_dynamic_and_fresnel.png
   :align: center
   :width: 100%

|


.. index:: materials; rendering properties

.. _rendering_properties:

Rendering Properties
====================

.. image:: src_images/materials/panel_render_options.png
   :align: center
   :width: 100%

*Material > Rendering Options > Do not Render*
    Disable rendering of this object.

*Material > Rendering Options > Backface Culling*
    When enabled, polygons’ back faces are not rendered by the engine. Enabled by default.

*Material > Rendering Options > Wettable*
    Water wetting effect is activated for the material.

    .. seealso:: :ref:`water`

*Material > Rendering Options > Lens Flare*
    Enabling this parameter activates Lens Flare effect for the material.

*Material > Rendering Options > Render Above All*
    Material is rendered on top of all scene objects. Transparency type with a gradient is required (``Add``, Alpha Blend`` or ``Alpha Sort``).

*Material > Rendering Options > Vertex Color Paint*
    Mesh vertex color is used instead of the material diffuse color when the checkbox is enabled.

*Material > Rendering Options > Refractive*
    Make object refractive. Perturbation factor can be set with the option ``Refraction Bump`` on the ``Refraction Settings`` panel. The default value is 0.001.

    .. note::

        In order to use this effect, select ``ON`` or ``AUTO`` on the ``Render > Reflections and Refractions > Refractions`` panel. The object must have ``Alpha Blend`` transparency type.

    .. seealso:: :ref:`alpha_blend`

|

.. index:: materials; viewport properties

Viewport Properties
====================

The ``Viewport`` section can be found on the ``Blend4Web`` panel.

.. image:: src_images/materials/update_material_anim.png
   :align: center
   :width: 100%

*Update Material Animation*

    Update animated shader in Blender Viewport.

|

.. index:: materials; specific parameters

Engine Specific Parameters
==========================


.. image:: src_images/materials/panel_b4w.png
   :align: center
   :width: 100%

|

*Material > Water*
    Special material for :ref:`water rendering <water>`.

*Material > Terrain Dynamic Grass*
    Material is used for :ref:`grass rendering <particles_grass>`.

*Material > Collision*
    A special material for collision geometry.

    .. seealso:: :ref:`physics`

*Material > Export Options > Do Not Export*
    Material is not to be exported.

.. index:: materials; halo

.. _material_halo:

Halo Materials
==============

Halo materials are used in particle systems and in static meshes. Using the halo in static meshes is described below.


Activation
----------

Select the ``Halo`` type under the ``Materials`` tab. It’s also recommended to select the transparency type with a gradient (``Add``, ``Alpha Blend`` or ``Alpha Sort``).

.. image:: src_images/materials/halo.png
   :align: center
   :width: 100%


Additional Settings
-------------------

*Halo > Alpha*
    Material transparency factor. The default value is 1.0 (non-transparent).

*Halo > Color*
    Material color. The default value is (0.8, 0.8, 0.8) (almost white).

*Halo > Size*
    Particle size. The default value is 0.5.

*Halo > Hardness*
    Exponent for computing the gradient. Affects visible dimensions of particles. The default value is 50.

*Halo > Rings*
    Use rings. Relative quantity and color can be set up.

*Halo > Lines*
    Use lines. Relative quantity and color can be set up.

*Halo > Star Tips*
    Use stars. The quantity of edges can be set up.

*Halo > Special: Stars*
    Enables the starry sky rendering mode. The mesh is fixed relative to the camera. For the ``Sun`` lamp it is also required to enable the ``Lamp > Dynamic Intensity`` checkbox. Applications should set up the hours of darkness via API.

*Halo > Blending Height*
    Height range for the fading of stars.

*Halo > Minimum Height*
    Minimum height in the object’s local space at which stars are visible.
