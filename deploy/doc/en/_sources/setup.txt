.. _setup:

***********************
Installing and Updating
***********************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

Installation
============

.. _getting_started_install_blender:

Installing Blender
------------------

Authoring 3D scenes is carried out directly in `Blender <http://en.wikipedia.org/wiki/Blender_(software)>`_ which is open source software and is distributed free of charge.

Before installation, please download and install the compatible Blender version, according to this `table <https://www.blend4web.com/downloads/>`_.

A current stable version of Blender should be used. It can be downloaded from the `official site <http://www.blender.org/download>`_.

.. image:: src_images/setup/blender_first_run.png
   :align: center
   :width: 100%


Unpacking the Archive
---------------------

Stable versions of the distribution are available as an archive (``blend4web_ce_YY_MM.zip`` -- free SDK, ``blend4web_pro_YY_MM.zip`` -- commercial SDK). Simply unpack this archive somewhere.

Installing Blend4Web SDK
------------------------

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

.. note::

    If you are planning to use only the normal editor, you might consider installing the :ref:`Blend4Web addon <addon>` instead of the SDK.

    The addon can only export scenes to :ref:`HTML format <export_scene>` and has limited functionality (for example, it doesn't have the :ref:`project manager <project_management>`, example scenes, user manual and so on), but still it has everything you might need to create a simple application.

    It can be installed the same way as any other `Blender addon <https://www.blender.org/manual/advanced/scripting/python/addons.html?highlight=install%20addon#installation-of-a-3rd-party-add-on>`_.


|


Switching to Blend4Web Mode
---------------------------

To reveal the engine settings, select Blend4Web from the upper panel menu:

.. image:: src_images/setup/first_steps_selecting_engine.png
   :align: center
   :width: 100%


Updating
========

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

Updating the Addon
-------------------

If you are only using the Blend4Web add-on, follow this instruction instead.

Before installing a new version of the add-on, you may firstly remove the existing one. To do this, unfold the information tab of the Blend4Web addon and press the ``Remove`` button. Removing the old version is not required before installing a new one, but doing so makes sure there won't be any coflicts.

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

|

