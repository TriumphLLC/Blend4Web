.. _particles_instancing:

.. index:: particle system; instancing

***************************
Particle System. Instancing
***************************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

A particle system can be used to create multiple object copies (so called instancing). This technique simplifies scene authoring and also reduces loading time and memory consumption as compared to the using of single objects.

.. image:: src_images/particles_instancing/particles_instancing_example.png
   :align: center
   :width: 100%

|

Using particle systems for instancing has some limitations though:

* Movement and animation of objects inside a particle system is not allowed.

* Parenting is not possible among the objects inside a particle system, except for dupli-groups.

* Instancing of non-mesh objects is not possible.


Particle System Setup
=====================

.. only:: html

    .. image:: src_images/particles_instancing/particles_settings_panel.png
       :align: center
       :width: 100%

.. only:: latex

    .. image:: src_images/particles_instancing/particles_settings_panel_01.png
       :align: center
       :width: 100%

    .. image:: src_images/particles_instancing/particles_settings_panel_02.png
       :align: center
       :width: 100%

Activation
----------

#. Create a particle system of the ``Hair`` type on the emitter.
#. On the ``Render`` panel select the ``Object`` (or the ``Group``) rendering type.
#. In the ``Dupli Object`` field (or in the ``Dupli Group`` field) select the object (or the object group) for instancing. Both local and linked objects (or groups) are supported.


**Recommended Additional Settings**

#. In order to display correct sizes in the viewport, set the ``Emission > Hair Length`` and ``Render > Size`` parameters to 1.0.

.. image:: src_images/particles_instancing/particles_instancing_setup.png
   :align: center
   :width: 100%

|

Display settings
----------------

*Render > Use Count*

    The option is available for groups of particle objects. When enabled, the interface for setting the relative number of objects in a group becomes visible. The engine does not reproduce the exact positions of objects of certain types.

*Render > Randomize Location and Size*

    The option enables randomization for the location and the size of the objects. If enabled, the engine generates random coordinates and size (limited to the ±25% range) for the particle objects. If disabled, the exact coordinates and sizes of the particle objects are exported and used.

*Render > Randomize Initial Rotation*

    This option randomizes rotation of the objects relative to the axis defined by ``Rotation Type``. If enabled, the engine generates random rotation angles for the particle objects. If disabled, the rotation is taken from the ``Rotation`` panel.

*Render > Rotation Type*

    An Axis of random object rotation (the property is available when ``Render > Randomize Initial Rotation`` is enabled). There are two options:

        - ``Z axis`` - the objects are turned randomly around the vertical Z axis
        - ``Random axis`` - the objects are turned randomly around a random axis

    The default is ``Z axis``

*Render > Rotation Strength*

    Coefficient which defines the range of random rotation angles - counting from the direction towards the camera. Available when the ``Render > Randomize Initial Rotation`` checkbox is enabled. Examples:

        - ``Rotation Strength = 1`` - the angles will lie within the :math:`[-\pi, \pi]` range
        - ``Rotation Strength = 0.5`` - the angles will lie within the :math:`[-0.5 \cdot \pi, 0.5 \cdot \pi]` range
        - ``Rotation Strength = 0.1`` - the angles will lie within the :math:`[-0.1 \cdot \pi, 0.1 \cdot \pi]` range

    The default value is 1.

*Render > Billboard*

    Enables billboarding for particles. Disabled by default.

*Render > Billboard Type*

    Billboarding type. The option is available when the ``Render > Billboard`` option is enabled. Three types are available:

        - ``Basic`` - simple one-sided billboarding: particles will be turned with their front to the observer
        - ``Random`` -``Random`` - random two-sided billboarding: particles will be more often turned with their front or rear to the observer and less often with their side; also there will be a small random turn; this model is designed specially for grass instancing
        - ``Jittered`` - ``Jittered`` - one-sided billboarding with particles wavering along the plane which is turned to the observer; this model is designed specially for instancing of tree leaves

    The default is ``Basic``.

*Render > Jitter Amplitude*

    Coefficient which defines the particle oscillation amplitude. Available when the ``Jittered`` type is selected from the ``Render > Billboard Type`` menu. The bigger this parameter is, the bigger is the oscillation amplitude. The default value is 0.

*Render > Jitter Frequency*

    Particle oscillation frequency in hertz. Available when the ``Jittered`` type is selected from the ``Render > Billboard Type`` menu. The default value is 0.

*Render > Billboard Geometry*

    Billboard rotation type (the option is available when the ``Render > Billboard`` checkbox is set). Two types are available:

        - ``Spherical`` - spherical billboarding i.e. particles are fully oriented to the observer and their rotation is unlimited;
        - ``Cylindrical`` - cylindrical billboarding i.e. particles are rotating only around the vertical Z axis;

    The default is ``Spherical``.


Dynamic grass setup
-------------------

*Dynamic Grass*

    The option enables the dynamic grass rendering mode. Disabled by default.

*Dynamic Grass > Scale Threshold*

    Minimum size for dynamic grass particles. Smaller particles will not be rendered. The option is available if ``Dynamic Grass`` is enabled.

Inheritance settings
--------------------

*Properties Inheritance > Wind Bending*

    Inheriting the ``Wind Bending`` settings by the particles:

        - ``Parent`` - inherited from the emitter
        - ``Instance`` - inherited from the particle object itself

    The default is ``Parent``.

*Properties Inheritance > Shadows*

    Inheriting the shadow settings by particles:

        - ``Parent`` - inherited from the emitter
        - ``Instance`` - inherited from the particle object itself

    The default is ``Parent``.

*Properties Inheritance > Reflection*

    Inheriting the reflection settings by particles:

        - ``Parent`` - inherited from the emitter
        - ``Instance`` - inherited from the particle object itself

    The default is ``Parent``.

*Properties Inheritance > Vertex Color*

    Inheriting the vertex color from the emitter. Contains two fields:

        - ``From`` - the emitter's existing vertex color name
        - ``To`` - the particle's existing vertex color name

    There is no inheritance by default.


.. _particles_grass:

Grass
=====

Instancing of objects can be used for visualizing vast grass. In this case grass is rendered near the camera when it moves through the landscape.

.. image:: src_images/particles_instancing/dynamic_grass.png
   :align: center
   :width: 100%

|

**Activation**

#. On a separate plane object create a particle system for object instancing. Enable the ``Dynamic Grass`` option.
#. Enable the ``Terrain Dynamic Grass`` option for the supposed landscape material.

**Setup**

It is recommended to create a few planes (for example 3) with sizes corresponding to the desired grass cascades (e.g. 100, 150 and 250 meters).

For the landscape's **material**, the following text fields become active when the ``Terrain Dynamic Grass`` option is enabled:

*Dynamic Grass Size (R)*
    Vertex color layer name of the landscape mesh which is intended for modifying the grass size. The size (i.e. height) of the grass is defined by gray tints - the brighter color the is the higher is the grass.

*Dynamic Grass Color (RGB)*
    Name of the landscape mesh's vertex color layer which is intended for grass tinting. The vertex color is multiplied by the grass material color. The ``Influence > Blend`` parameter for the grass material's diffuse texture should have the ``Multiply`` value.

Vertex color layers with such names should exist in the landscape mesh.

It is also recommended to disable rendering of the emitter (the ``Render > Emitter`` option).

.. image:: src_images/particles_instancing/dynamic_grass_setup.png
   :align: center
   :width: 100%


.. _particles_leaves:

Tree Leaves
===========

Instancing suits the rendering of tree leaves well and allows to get a better level of detail.

.. image:: src_images/particles_instancing/tree_leaves.png
   :align: center
   :width: 100%

|

**Activation**

Performed as described in the ``Particle system setup -> Activation`` section (see above). In this case the tree is the emitter and the leaves and the small branches are the particles.

Additionally, the following operations can be performed for the emitter:

    - create a vertex group which includes vertices on which the particles will be placed
    - create a vertex color layer for the wind bending parameters of the tree and the leaves
    - create a vertex color layer to be inherited by the particles (for example it can be used for tinting the particles)

**Setup**

1. *Random rotation settings*

If the ``Initial Random Rotation`` checkbox is enabled, it is recommended to select the vertical axis for random rotation - ``Z axis`` (by using the ``Rotation Type`` menu). The ``Rotation Strength`` value can be set at will.

2. *Billboarding settings*

It is recommended to enable billboarding, to set its type as ``Jittered`` (by using the ``Render > Billboard Type`` menu) and to make it spherical - ``Spherical`` (by using the ``Render > Billboard Geometry`` menu). The ``Render > Jitter Amplitude`` and ``Render > Jitter Frequency`` values can be set at will.

3. *Particle position settings*

It is recommended to select the ``Verts`` value from the ``Emission > Emit From`` menu, and to select the emitter's vertex group (in the ``Vertex Group > Density`` field) which defines the positions of particles. Note, that the ``Render > Randomize Location and Size`` checkbox should be disabled.

4. *Wind effect settings*

It is recommended to enable inheritance settings from the emitter - select the ``Parent`` in the ``Properties Inheritance > Wind Bending`` menu. Then for the emitter on the ``Object`` panel enable the ``Wind Bending`` checkbox and set up the bending parameters. For a tree, it is enough to specify the ``Wind Bending > Main Bending > Angle`` and ``Wind Bending > Main Bending > Frequency`` parameters and also a vertex color name for bending in the ``Wind Bending > Main Bending > Main Stiffness`` field.

.. _particles_inheritance:

5. *Vertex color inheritance settings*

For the emitter's vertex color to be inherited by the particles, it is required to specify both the emitter's vertex color name and the particle's vertex color name in the ``Properties Inheritance > Vertex Color > From`` and ``Properties Inheritance > Vertex Color > To`` fields respectively. As a result, the color of the emitter's vertex that is closest to the particle (specified in the ``From`` field) will be copied and propagated into the particle's ``To`` vertex color layer.

The resulting vertex color layer with the name specified in the ``Properties Inheritance > Vertex Color > To`` field can be used in the particle's node material for its tinting and for any other effects.

6. *Setting up the size of particles via vertex group weights*

In order to create dependency between the size of particles and vertex group weights, select the name of the desired vertex group in the ``Vertex groups > Length`` field.

The influence can be tweaked by setting weights in the selected vertex group.

.. image:: src_images/particles_instancing/particle_settings.png
   :align: center
   :width: 100%
