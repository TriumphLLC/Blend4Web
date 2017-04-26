.. _setup:

***********************
Installing and Updating
***********************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

Installation
============

There are two versions of the Blend4Web framework: Blend4Web SDK and Blend4Web Add-On. In order to decide which one best suits your needs, you will need to decide which kinds of applications you are planning on developing.

If you plan on using all features that Blend4Web engine has to offer, you should install Blend4Web SDK.

If your intention is to develop small-scale projects, or if you are planning on using only a limited number of features of the Blend4Web engine (the normal editor, for example), you might consider installing the :ref:`Blend4Web Add-On <addon>` instead.

Note, the Add-On can only export scenes to :ref:`HTML format <export_scene>` and has limited functionality. For example, it does not include the :ref:`project manager <project_management>`, example scenes, user manual and other additional resources. However, it still has everything you might need to create a simple application.

.. _getting_started_install_blender:

Installing Blender
------------------

Authoring 3D scenes is carried out directly in `Blender <http://en.wikipedia.org/wiki/Blender_(software)>`_ which is open source software and is distributed free of charge.

Before installation, please download and install the compatible Blender version, according to this `table <https://www.blend4web.com/downloads/>`_.

A current stable version of Blender should be used. It can be downloaded from the `official site <http://www.blender.org/download>`_ or from `Blend4Web site <https://www.blend4web.com/ru/downloads/>`_.

.. image:: src_images/setup/blender_first_run.png
   :align: center
   :width: 100%

.. _sdk_install:

Installing Blend4Web SDK
------------------------

Stable versions of the distribution are available as an archive (``blend4web_ce_YY_MM.zip`` -- free SDK, ``blend4web_pro_YY_MM.zip`` -- commercial SDK). Simply unpack this archive somewhere.

#. Run Blender.

#. Open the User Preferences panel :file:`File > User Preferences...`.

#. Open the :file:`File` tab.

#. Set the path to the SDK directory in the :file:`Scripts` field.

#. Click the :file:`Save User Settings` button.

    .. image:: src_images/setup/user_preferences_sdk_path.png
       :align: center
       :width: 100%

#. Restart Blender.

#. Once again, open the User Preferences panel :file:`File > User Preferences...`.

#. Open the :file:`Add-ons` tab.

#. Enable the `Blend4Web` add-on.

#. Once again, click the :file:`Save User Settings` button.

    .. image:: src_images/setup/user_preferences_enable_addon.png
       :align: center
       :width: 100%

*To verify it worked:*

In the :file:`File > Export` menu, the :file:`Blend4Web (.json)` and :file:`Blend4Web (.html)` options should appear.

.. _addon_install:

Installing Blend4Web Add-On
---------------------------

.. image:: src_images/setup/user_preferences_install_from_file.png
   :align: center
   :width: 100%

It can be installed the same way as any other `Blender addon <https://www.blender.org/manual/advanced/scripting/python/addons.html?highlight=install%20addon#installation-of-a-3rd-party-add-on>`_.

#. Run Blender.

#. Open the User Preferences panel :file:`File > User Preferences...`.

#. Open the :file:`Add-ons` tab.

#. Press the ``Install From File...`` button.

#. Select the archive containing Blend4Web add-on and press ``Install From File...`` button.

#. Press the ``Save User Settings`` button.

#. Restart Blender.

#. Once again, open the User Preferences panel :file:`File > User Preferences...`.

#. Open the :file:`Add-ons` tab.

#. Find the Blend4Web Add-on in the list.

#. Check the box on the left side of its title to enable it.

#. Press the ``Save User Settings`` button once again.

Now, everything should work properly.

|

Switching to Blend4Web Mode
---------------------------

To reveal the engine settings, select Blend4Web from the upper panel menu:

.. image:: src_images/setup/first_steps_selecting_engine.png
   :align: center
   :width: 100%


Updating
========

.. _sdk_update:

Updating the SDK
----------------

Before updating, we recommend to backup all projects in development using the :ref:`project export <export_projects>` tools.

To update the SDK, follow these steps:

#. Download the new version of the SDK.

#. Run Blender.

#. Open the ``User Preferences`` window.

#. Open the ``Add-ons`` panel.

#. Disable ``Blend4Web`` Add-on.

    .. note::
        We recommend not to use the ``Remove`` button to disable the Add-on for updating the SDK, as doing so will completely delete the add-on, including its files in the SDK.

#. Unpack the new version of the SDK from the archive.

    .. note::
        There are two methods to do this.

        Firstly, you can completely delete the SDK folder and, after that, extract the new version folder, as if you were installing the SDK for the first time.

        Secondly, you can simply overwrite the outdated SDK files with the new ones. This method is considered less "pure", but in most cases it should not cause any problems.

#. Open the ``File`` panel in the ``User Preferences`` window.

#. Set the path to the SDK folder in the ``Scripts`` field.

#. Press the ``Save User Settings`` button.

#. Restart Blender.

#. Open the ``User Preferences`` window once again.

#. Open the ``Add-ons`` panel.

#. Enable ``Blend4Web`` add-on.

#. Press the ``Save User Settings`` button once again.

#. Check if everything works correctly.

After updating is complete, you can import all saved projects using the :ref:`project import <import_projects>` tools.

.. _addon_update:

Updating the Addon
-------------------

If you are only using the Blend4Web add-on, follow this instruction instead.

Before installing a new version of the add-on, you may firstly remove the existing one. To do this, unfold the information tab of the Blend4Web addon and press the ``Remove`` button. Removing the old version is not required before installing a new one, but doing so makes sure there won't be any conflicts.

.. image:: src_images/setup/user_preferences_remove_addon.png
   :align: center
   :width: 100%

#. Download the archive that contains the new version of the add-on, and save it to any place on your hard drive.

#. Run Blender.

#. Open the ``User Preferences`` window.

#. Switch to the ``Add-ons`` panel.

#. Install the new version of the add-on from the archive you downloaded.

#. Press the ``Save User Settings button``.

#. Restart Blender.

Everything should be working now.

.. _projects_update:

Updating Saved Projects
-----------------------

After you have updated your SDK (or Add-on), you can import projects that you exported before updating back to the Project Manager. To do this, follow the following instructions:

#. Open Project Manager.

#. Import your projects using the ``Import Project(s)`` button.

#. Reexport the projects' ``.blend`` files using the ``re-export scenes`` link.

#. Use the ``check modules`` link for every imported project to make sure there are no missing or unused modules in the program code. If there are, you may try to fix the problems using the ``Update Modules`` button.

#. Then use ``build`` command to make the build versions of the imported projects work again.

#. The developer version of the projects using ``Copy`` or ``Compile`` engine binding type should also be build to properly work with the new version of the SDK (the developer versions of the projects with other binding types should work fine without it).

|

