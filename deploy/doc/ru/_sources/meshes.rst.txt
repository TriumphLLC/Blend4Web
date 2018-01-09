
.. _meshes:

******
Meshes
******

.. contents:: Table of Content
    :depth: 3
    :backlinks: entry

Meshes are a subclass of :ref:`objects <objects>`. Meshes are different from objects of the other types in a sense that they have geometric structure that is visible in the scene. All objects user can see in a scene are either meshes or converted to meshes on export (like the ``CURVE``, ``TEXT``, ``METABALL`` and ``SURFACE`` type objects).

:ref:`Blend4Web addon <addon>` has several tools for mesh editing, including the :ref:`normal editor <normals_editor>`.

This chapter provides an overview of the ``MESH`` type object parameters and settings, as well as the API functions to work with them.

.. _static_dynamic_meshes:

Static and Dynamic Meshes
=========================

All ``MESH`` objects can be divided into static and dynamic.

**Static meshes** are meshes that can be merged together if they have the same material.

**Dynamic meshes** are meshes that cannot be combined with each other.

.. _batching:

Merging of static meshes - so called batching - is performed automatically when the scene is loaded in order to optimize the number of draw calls. The conversion is performed even if there is just one object in the scene. The center of the resulting mesh is located in the origin.

Meshes that have animation, physics or a parent, which is a dynamic object, are considered dynamic.

.. _mesh_settings:

Settings
========

Meshes have all settings of the :ref:`objects <object_settings>` and several additional settings.

.. _override_bounding_volumes:

Override Bounding Volumes
-------------------------

This section is used to override bounding volumes. Such volumes are used to check object’s visibility, to handle collisions and physics interaction. By editing them, you can achieve various effects.

.. image:: src_images/meshes/meshes_override_bounding_volumes.png
   :align: center
   :width: 100%

The ``Override Bounding Volumes`` section can be found on the ``Blend4Web`` panel (beside the :ref:`normals editor <normals_editor>`.).

*Show Boundings*


    .. image:: src_images/meshes/meshes_show_boundings.png
       :align: center
       :width: 100%

    Show the bounding volumes in the Blender viewport. This option works only if the ``Override Mesh Boundings`` parameter is enabled. The volume can be rendered as a rectangular cuboid or as a combination of circles or ellipses. More than one method of rendering can be active at the same time (even all three methods can be enabled simultaneously).

.. note::
    The selected rendering method does not affect the bounding volume shape, only the way it is represented in the viewport.

|

*Override Mesh Boundings*


    .. image:: src_images/meshes/meshes_override_mesh_boundings.png
       :align: center
       :width: 100%

    This button enables the override of the basic mesh boundings. The bounding volume always has the shape of a rectangular cuboid with a center in the object’s pivot point.

*MinX and  MaxX*
    The volume’s X dimensions. By default, *MinX* = -1, *MaxX* = 1

*MinY and  MaxY*
    The volume’s Y dimensions. By default, *MinY* = -1, *MaxY* = 1.

*MinZ and  MaxZ*
    The volume’s Z dimensions. By default, *MinZ* = -1, *MaxZ* = 1

.. _mesh_morphing:

Morphing
========

Morph targets can be added using Blender’s standard ``Mesh > Shape keys`` interface.

.. image:: src_images/meshes/meshes_morphing.png
   :align: center

|

The engine supports all shape key options under the “Relative” type.

To set a shape key value, use the ``apply_shape_key`` method of the ``geometry.js`` module.

.. note::

    The object must have ``Export Shape Keys`` parameter enabled.

.. code-block:: javascript

    // ...
    var obj = m_scenes.get_object_by_name("Object");
    m_geometry.apply_shape_key(obj, "Key 1", 0.5);
    // ...
