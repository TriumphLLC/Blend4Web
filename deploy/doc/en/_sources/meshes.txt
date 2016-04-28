
.. _meshes:

******
Meshes
******

.. contents:: Table of Content
    :depth: 3
    :backlinks: entry

.. _static_dynamic_meshes:

Static and Dynamic Objects
==========================

All ``MESH`` objects can be divided into static and dynamic objects.

**Static objects** are objects, the meshes of which can be merged together if they have the same material.

**Dynamic objects** are objects, the meshes of which cannot be combined with each other.

Merging of static objects - so called batching - is performed automatically when the scene is loaded in order to optimize the number of draw calls. The conversion is performed even if there is just one object in the scene. The center of the resulting mesh is located in the origin.

The objects which have animation, physics or a parent, which is a dynamic object, are considered dynamic.

Object movement via API is possible only for dynamic objects. In order to make the movement of the object without dynamic settings possible, it is necessary to activate ``Force Dynamic Object`` option in its settings.

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

.. _mesh_copy:

Copying Objects (Instancing)
============================

It is often required to copy (to make instances of) objects during application work.

Copying objects has its limitations:
    * only ``MESH`` objects can be copied
    * the object should be :ref:`dynamic <static_dynamic_objects>` (enable ``Rendering Properties > Force Dynamic Object``)
    * the source object should belong to the active scene

Making a Simple Copy
--------------------

In case of simple copying the new object will share the mesh with the original object. Thus, if the original object’s mesh is changed, the copied object’s mesh will be changed too. To make simple copying possible, it’s enough to turn on the ``Blend4Web > Force Dynamic Object`` setting in the source object’s properties.

Making a Deep Copy
------------------

In case of deep copying, the new object will have unique properties, namely it will have its own mesh. Thus, if the original object’s mesh is changed, the copied object’s mesh will not be changed. Also, the canvas textures on the copied objects are different textures and not one and the same like it is the case with the simple copying. To make deep copying possible, it is required to enable the :ref:`Rendering Properties > Dynamic Geometry <dynamic_geom>` checkbox for the source object.
|

Copying objects in runtime can be performed with the ``copy`` method of the ``objects.js`` module. This method requires three arguments: the id of the source object, a unique name for the new object and the boolean value to specify the copy mode (i.e. simple or deep). By default, simple copying will be performed.

The newly created object should be added to the scene. This can be performed with the ``append_object`` method of the ``scenes.js`` module. The new object should be passed to it as an argument.

.. code-block:: javascript

    // ...
    var new_obj = m_objects.copy(obj, "New_name", true);
    m_scenes.append_object(new_obj);
    m_transform.set_translation(new_obj, 2, 0, 2);
    // ...


Removing Objects
----------------
To remove objects, use the ``remove_object`` method of the ``scenes.js`` module. Pass the object to it as an argument. Dynamic mesh- and empty-type objects can be removed this way.

.. code-block:: javascript

    // ...
    m_objects.remove_object(new_obj);
    // ...


.. _mesh_selection:

Object Selection
================

In order to enable selection of a certain object, it is required to enable the ``Selectable`` checkbox on the ``Selection and Outlining`` panel.

.. note::
    Make sure that the status on the ``Scene > Object Outlining`` panel is set to ``ON`` or ``AUTO``.

Object selection is possible programmatically via API, for example, in the ``scenes.js`` module there is the ``pick_object`` function which selects an object based on canvas 2D coordinates,

.. code-block:: javascript

    // ...
    var x = event.clientX;
    var y = event.clientY;

    var obj = m_scenes.pick_object(x, y);
    // ...

or using the :ref:`NLA Script <nla_select_play>`.

If the selectable object has enabled ``Enable Outlining`` and ``Outline on Select`` checkboxes on the ``Object > Selection`` and Outlining panel, then the ``pick_object`` function call will activate :ref:`outline glow animation <outline>`.

.. note::
    If the selected object is transparent (``Blend``, ``Add`` and ``Sort`` transparency types), outline glow will only be visible on the parts that have ``Alpha`` value higher than 0.5.

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
