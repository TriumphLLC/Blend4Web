.. _outdoor_rendering:

***************
Outdoor Effects
***************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

Blend4Web has several environmental effects that can be useful for creating outdoor scenes.

.. _water:

Water
=====

Activation
----------

For the supposed water material activate the ``Water`` panel option under the ``Material`` tab. 

.. image:: src_images/outdoor_rendering/water_material_setup.png
   :align: center
   :width: 100%

Basic Settings
--------------

*Transparency*
    It is recommended to enable the gradient transparency (set the ``Transparency > Type`` parameter to the ``Alpha Blend`` value) and to tweak the ``Alpha`` value. 

*Lighting parameters*
    Lighting parameters for the water material can be set up as described in the :ref:`material_lighting_params` section.

Waves Dynamics
--------------

Ripples on the water are simulated by normal maps with animated UVs (from 0 up to 4 pieces). For normal map the only shared image is used - the textures differs only by the ``Mapping > Size`` parameters. The water mesh must have a UV layer.
   
Surface Wetting
---------------

Is carried out automatically. To turn the effect on activate the ``Wettable`` option on the needed materials ``Rendering Options`` panel.


Reflection and Fresnel Effect
-----------------------------

For the water material both static and dynamic reflection is supported as well as the Fresnel effect. See the :ref:`material_mirror` section.


.. image:: src_images/outdoor_rendering/water_reflection_dynamic.png
   :align: center
   :width: 100%

Shoreline Smoothing
-------------------

The effect affects the water near the shoreline - it becomes more transparent.

*Water > Shore Smoothing*
    Enable smoothing.

*Water > Absorb Factor*
    Light absorption coefficient for the water. The higher it is the more transparent is the water.


Color Gradient
--------------
For color gradient the water material must have a texture with the ``Export Options > Shore Distance Map`` option enabled. This texture can be generated using the script for :ref:`baking shoreline parameters <shore_distance_bake>`.

*Shallow Water > Color*
    Shallow water color.

*Shallow Water > Factor*
    Shallow water color mixing factor.

*Shore Water > Color*
    Water color just at the shore line.

*Shore Water > Factor*
    Factor for mixing water color just near the shoreline.

Refraction
----------

Under the ``Render`` tab in the ``Reflections and Refractions`` panel set the ``Refractions`` option to ``ON`` or ``AUTO``.

.. image:: src_images/outdoor_rendering/water_refraction.png
   :align: center
   :width: 100%

Foam
----

Activation
..........

For creating foam add a diffuse texture into the water material slot. Every RGB channel of this image must contain a BW foam texture in it. Then enable the ``Water Foam`` panel.


.. image:: src_images/outdoor_rendering/water_texture_setup_foam.png
   :align: center
   :width: 100%


Setting up the Textures
.......................

*Influence > Color*
    Texture color influence factor. The default value is 1.0.

*Water Foam > UV Frequency*
    Oscillation frequency of the animated UV coordinates. The default value is (1.0, 1.0).

*Water Foam > UV Magnitude*
    Oscillation amplitude of the animated UV coordinates. The default value is (1.0, 1.0).


Setting up the Material
.......................

*Foam > Factor*
    General influence factor for the foam. The default value is 0.5.


Caustics and Chromatic Aberration
---------------------------------

To create the caustics effect turn on the ``Caustics`` option on the water material. Also, there has to be at least one ``Sun`` on the scene.

.. image:: src_images/outdoor_rendering/water_caustics.png
   :align: center
   :width: 100%

*Scale*
    Cell size for the procedural texture. The default value is 0.25.

*Brightness*
    Caustics influence factor. The default value is 0.5.

Underwater Environment
----------------------

.. image:: src_images/outdoor_rendering/underwater.png
   :align: center
   :width: 100%

Visibility Settings (“fog”)
...........................

*Underwater Fog > Color*
    Fog color. The default value is (0.4, 0.6, 0.7).

*Underwater Fog > Density*
    Exponential factor which affects the density and visibility distance. The default value is 0.06.

The :ref:`god rays <god_rays>` effect settings are also applied.


.. note::
    The ``Rendering Options > Backface Culling`` option must be turned off for the correct water surface rendering.

.. image:: src_images/outdoor_rendering/water_border.png
   :align: center
   :width: 100%

.. _water_volumetric_waves:

Volumetric Waves
----------------

Activation
..........

To enable procedural waves the ``Waves`` option must be turned on.

.. image:: src_images/outdoor_rendering/water_waves.png
   :align: center
   :width: 100%

Setting up
..........

*Wave Height*
    Wave height. The default value is 0.0.

*Wave Length*
    Wave length. The default value is 10.0.

*Noise Dist Scale 0*
    Size of the first component of the open water waves.

*Noise Dist Scale 1*
    Size of the second component of the open water waves.

*Noise Dist Freq 0*
    Frequency of the first component of the open water waves.

*Noise Dist Freq 1*
    Frequency of the second component of the open water waves.

*Min Dir Shore Fac*
    Minimum height decrease coefficient of the shore waves.

*Dir Frequency*
    Frequency of the rolling of the shore waves.

*Noise Dir Scale*
    Noise size for the shore waves.

*Noise Dir Freq*
    Noise frequency for the shore waves.

*Min Dir Noise Fac*
    Noise minimum for the shore waves.
    
*Min Dist Fac*
    Minimum coefficient of mixing for open water waves.

*Horizontal Factor*
    Coefficient that shows how much the shore waves are shifted in the shoreline direction.

Settings for Surface Generation
-------------------------------

*Generate Mesh*
    Enable generated surface.

*Cascades Number*
    Number of cascades in the generated surface.

*Subdivisions*
    Generated mesh subdivisions.

*Detailed Distance*
    Maximum distance from camera to the last cascades edge.


.. index:: shoreline data, shoreline

.. _shore_distance_bake:

Baking Shoreline Data to Texture
................................

On the tools panel (hotkey “T”) under the ``Blend4Web`` tab open the ``Bake Shore Distance Map`` panel. Set the parameters: maximum distance to shore (``Maximum Distance``) and the resulting texture size (``Texture Size``). Select a landscape object (or multiple objects) first, and then - a water object. Click the ``Bake`` button.
 
Depending on the texture size and the number of vertices in the processed meshes the execution time of the script may vary from a fraction of a second up to several minutes. Make sure that the texture named ``ShoreDistance`` is created for the water mesh.

Upon script execution some system properties are saved in the water material. Therefore, the scene must be saved after the script has finished working. 


.. _atmosphere:

Atmosphere
==========

Scattering
----------

Enable ``World > Render Sky``, then activate ``Procedural Sky`` panel under the World tab. Please note, that if a :ref:`static skydome texture <skydome_texture>` is being used at the same time, it will be replaced.

.. note::

    Also, a procedural sky texture can be used to imitate scattered :ref:`environment lighting <environment_lighting>` similar to the :ref:`static skydome texture <skydome_texture>`. To do this, enable the ``Procedural Sky > Use as Environment Lighting`` and ``Environment Lighting > Sky Texture`` options. If the world texture for environment lighting already exists, it will be replaced.


.. image:: src_images/outdoor_rendering/skydome_procedural.png
   :align: center
   :width: 100%

|

Supported settings:

*Procedural Sky > Sky Color*
     Base sky color. The default value is (0.087, 0.255, 0.6) (blue).

*Procedural Sky > Rayleigh Brightness*
     Rayleigh scattering brightness (i.e. scattering on small particles). The default value is 3.3.

*Procedural Sky > Mie Brightness*
     Mie scattering brightness (i.e. scattering on large particles). The default value is 0.1.

*Procedural Sky > Spot Brightness*
     Sun spot brightness. The default value is 20.0.

*Procedural Sky > Scatter Strength*
     Light scattering factor. The default value is 0.2.

*Procedural Sky > Rayleigh Strength*
     Rayleigh scattering factor. The default value is 0.2.

*Procedural Sky > Mie Strength*
     Mie scattering factor. The default value is 0.006.

*Procedural Sky > Rayleigh Collection Power*
     Rayleigh scattering exponent. The default value is 0.35.

*Procedural Sky > Mie Collection Power*
     Mie scattering exponent. The default value is 0.5.

*Procedural Sky > Mie Distribution*
     Mie scattering distribution. The default value is 0.4.



Fog
---

The engine supports standard parameters located on the ``World > Mist`` panel. Besides this, overriding fog color is possible.

*Mist > Use Custom Color*
    Apply the user-defined fog color instead of ``World > Horizon`` color. Enabled by default.

*Mist > Color*
    Fog color. The default value is (0.5, 0.5, 0.5) (gray).

When a dynamic skydome is used the fog color is defined by the sky color.


Time of Day
-----------

Enable the ``Dynamic Intensity`` options for the lamp.

Time of day can be set by applications via API. Particularly time of day can be set using the ``Lighting`` interface of the :ref:`Scene viewer <viewer>`. 

.. image:: src_images/outdoor_rendering/sunset.png
   :align: center
   :width: 100%


Stars
-----

Stars setup is described in the :ref:`material_halo` section.

.. image:: src_images/outdoor_rendering/stars.png
   :align: center
   :width: 100%

.. _wind:

Wind
====

Wind strength and direction affect:
    - :ref:`grass and tree leaves animation <wind_bending>`
    - :ref:`particle system dynamics <particles_force_fields>`
    - :ref:`water waves rolling frequency <water_volumetric_waves>` (at the moment only strength is taken into account)


Activation
----------

Add a force field object of the ``Wind`` type.


Setting up
----------

*Direction*
    Direction can be set by rotating the force field object.

*Force Fields > Strength*
    Wind strength. Located under the ``Physics`` tab. The default value is 1.0.


.. _wind_bending:

Animation of Grass and Tree Leaves
----------------------------------

Authoring resources for grass rendering is described in the :ref:`particles_grass` section.


Activation
..........

Enable the ``Wind Bending`` panel for the grass or tree object.


Setting up
..........

The interface panel becomes visible after turning on the ``Wind Bending`` panel.

.. image:: src_images/outdoor_rendering/wind_bending_setup.png
   :align: center
   :width: 80%

|

*Main Bending > Angle*
    Angle amplitude of the “main” deviation under the influence of wind (in degrees). The default value is 10.0.
    
*Main Bending > Frequency*
    Frequency of the “main” deviation under the influence of wind. The default value is 0.25.

*Main Bending > Main Stiffness (A)*
    Text field for specifying the name of the vertex color layer which contains the information about the stiffness of the “main” deviation. Can be left empty. 

*Detail Bending > Amplitude*
    Angle amplitude of the “detail” deviation caused by the influence of wind (in degrees). The default value is 0.1.

*Detail Bending > Branch Amplitude*
    Angle amplitude of the branch deviation caused by the influence of wind (in degrees). The default value is 0.3.

*Detail Bending > Bending Frequency*
    Detail bending frequency. The default value is 1.0.

*Detail Bending > Leaves Stiffness (R)*
    Text field for specifying the name of the vertex color layer which contains the information about the stiffness of leaves. Can be left empty. 

*Detail Bending > Leaves Phase (G)*
    Text field for specifying the name of the vertex color layer which contains the information about the phase of leaves deviation. Can be left empty. 

*Detail Bending > Overall Stiffness (B)*
    Text field for specifying the name of the vertex color layer which contains the information about the overall stiffness of leaves. Can be left empty.

Vertex color layers should be present in the mesh if their names are specified.

.. image:: src_images/outdoor_rendering/wind_bending_vcolors.png
   :align: center
   :width: 100%

