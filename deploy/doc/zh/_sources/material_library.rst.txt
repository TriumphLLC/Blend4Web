.. _material_library:

****************
Material Library
****************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

The material library is a library where a user can find basic and the most commonly used materials to use in his or her projects or create his or her own materials based on these materials.

When creating a new project, you can plug the material library into it, and then plug in materials directly from there.

.. image:: src_images/material_library/material_library_use.png
   :align: center
   :width: 100%

To do this, check the ``Use Material Library`` box when creating the project using the :ref:`Project Manager <project_management>`. Then, an entire material library will be automatically copied to the ``/assets/material_library/`` folder in the new project’s directory.

.. note::

    It is also possible to use Material Library in a pre-existing project. All you have to do is copy files from the ``/blender/material_library/`` folder to the ``/assets/`` folder in your project’s directory. Then you can link the files that contain materials you need to your scene file and use them in the scene.

.. note::

    Materials (or any other objects) can be both *linked* or *appended* to the scene. The difference is described :ref:`here <material_add>`.

.. _library_structure:
	
Library Structure
=================
	
All materials are structured by folder (by categories of materials) and by a separate file (by materials). Every blend file contains one base material and a material for an additional object, that demonstrates the material on an object that can be associated with this material (for example, a gold ingot for a gold material).

.. image:: src_images/material_library/material_library_main.png
   :align: center
   :width: 100%

.. _material_structure:

Material Structure
==================

.. image:: src_images/material_library/material_library_structure.png
   :align: center
   :width: 100%

#. The core of the material
#. The ``Material`` node which receives all valuable information from the core.
#. The normal map that can be plugged into any material core.
#. Texture containing additional masks important for the material on the surface of the object to behave correctly. Most materials use the following masks:

    * Ambient occlusion map
    * Dirt map
    * Worn map
    * Patina map

    These masks are not used in every material, only when they are needed for the shader to appear a specific way.
#. The ``Mapping`` node is used to control the parameters of the UV maps.
#. The ``RGB Curve`` nodes can be used to correct masks before plugging them into the material core.
#. Specific specular map settings are used right after the ``Material`` node to achieve various degrees of specular blur.
#. The baked ambient occlusion map is added to the shader right before the Output node.
#. The ``Output`` node.

Material Core
-------------

This is the main node group containing the node structure that form a shader. Essentially, this is the material itself in its true form, with all complex node interactions packed into one group for convenient use. This node group has certain inputs and outputs, as well as specific input parameters, to set it up.

.. _material_example:

An Example of Using a Material
------------------------------

.. image:: src_images/material_library/material_library_example.png
   :align: center
   :width: 100%

Here, you can see an example of setting plastic material for a special demo object without using the textures that are plugged into the core of the material.

.. image:: src_images/material_library/material_library_example_demo.png
   :align: center
   :width: 100%

#. The base color is created with a simple ``RGB`` Color node and plugged to the material core input.
#. This implementation of the material does not use any normal maps, so geometry data is plugged to the ``Normal`` input.
#. The core of the material has a certain parameter that controls the amount of gloss on the material. In this case, the value of this parameter is set to maximum.
#. The material also uses a baked ambient occlusion map.

Now, let's take a look at a case of using the same material on a different object — a plastic gamepad.

.. image:: src_images/material_library/material_library_example_gamepad.png
   :align: center
   :width: 100%

#. The vertex color from the geometry of the object is used as the base color here.
#. A normal map has been baked for the geometry of the gamepad, and connected to the ``Normal`` input of the material core.
#. The level of gloss is lower.
#. Instead of the masks from the demo model, the masks (ambient occlusion and dirt) baked specifically for the gamepad model are used.

.. note::
    It should be noted that the material core hasn't changed and was not altered to fit different geometry.

.. _material_add:

Adding Material to a Scene
==========================

How to Add a Whole Material
---------------------------

.. image:: src_images/material_library/material_library_append.png
   :align: center
   :width: 100%

Select the ``File > Append/Link`` from the menu, depending on what you want to do. If you want to keep the ability to modify the object after it has been added to the scene, use ``Append``. If you don't, use ``Link``.

.. image:: src_images/material_library/material_library_select_blend_file.png
   :align: center
   :width: 100%

Then select the blend file containing the material you need from the ``/blend4web/blender/material_library/`` directory.

.. image:: src_images/material_library/material_library_select_material.png
   :align: center
   :width: 100%

Select the material itself from the list of materials, and press ``Append from Library`` or ``Link from Library``. Now, the material has been added to your scene and can be used on any object.

How to Add Only a Material Core
-------------------------------

If you want to add only the core of the material and set everything else yourself, then, instead of selecting material, select ``NodeTree`` while linking/appending, then select the node group you need, and press ``Append from Library`` or ``Link from Library``.

.. image:: src_images/material_library/material_library_add_core.png
   :align: center
   :width: 100%

Now this node group can be found in the list of node groups that you can add to your material by clicking **Add=>Group** in the Node Editor interface.

.. image:: src_images/material_library/material_library_add_group.png
   :align: center
   :width: 100%

.. note::
    Every material has its own requirements considering not only masks and textures, but also vertex colors and UV maps.


