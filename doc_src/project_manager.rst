.. _project_management:

***************
Project Manager
***************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

Since version 15.09, the SDK includes a project management feature, which makes it possible to:

    * browse the full list and file structure of the projects;

    * launch apps, run exported scenes in the Viewer, open source blend files in Blender;

    * create and configure new apps, including those based on ready-made templates;

    * build apps and pack them to be conveniently deployed on a remote server;

    * convert app resources (textures, audio and video files) into alternative formats to ensure cross-browser and cross-platform performance;

    * automatically re-export all scenes of an app, including export to JSON and HTML formats;

    * remove projects.

Project Manager
---------------

The *Project Manager* app can be run from the *Tools* section of the SDK’s index page. Upon launching, the app outputs a list of all current projects in the SDK.

The commands for project management are located at the top of the page.

    .. image:: src_images/project_manager/project_manager_actions.png
       :align: center
       :width: 100%

*Back to Index*
    Returns to the Blend4Web SDK index page.

*Create New Project*
    Opens the :ref:`project creation <create_new_project>` wizard.

*Import Project(s)*
    Opens the :ref:`project import <import_projects>` dialogue.

*Export Project(s)*
    Opens the :ref:`project export <export_projects>` page.

*Hide Stock Projects*
   Can be used to hide stock projects. If such projects are already hidden, this command is replaced with the ``Show Stock Projects`` command.

*Help*
    Opens the :ref:`Help file <app_building>`.


Commands for managing a specific project is located at its right.

    .. image:: src_images/project_manager/project_manager_commands.png
       :align: center

1) Compile project (not available for WebPlayer JSON and WebPlayer HTML projects).
2) Re-export blend files from the project.
3) :ref:`Convert media resources. <converter>`
4) Export and download a project archive.
5) Remove the project.

.. note::

    All project paths are retrieved from its .b4w_project file.

Beside the project's name, a link to the :ref:`project information page  <project_info>` is located. The application type is also specified there. An application can have one of the following types:

*Player*
    The application can be played using the Web Player.

*Dev*
    Application for development.

*Build*
    Compiled application.


.. _create_new_project:

Project Creation Wizard
-----------------------

The tool for creating new projects is included in the Project Management app and executed by the ``[Create New Project]`` button on the main page of this app.

    .. image:: src_images/project_manager/project_manager_create_project.png
       :align: center
       :width: 100%

The ``[Back to Projects]`` button can be used to return to the Project Manager's main page, while the ``[Help]`` button can be used to access the :ref:`Help file <create_new_project>`.

1) Project name is used to name project directories such as "apps_dev/project_name", "deploy/assets/project_name", "blender/project_name" and "deploy/apps/project_name".
2) Project title as shown in the browser.
3) Project author’s name.
4) Add application templates. Standard application templates: html file, css file, js file will be added to the project directory "apps_dev/project_name".
5) Add scene templates. Standard json file will be added to the "deploy/assets/project_name" directory; blend file will be added to the "blender/project_name" directory.
6) Copy project manager script. The project.py script will be copied to the project directory.
7) All project files will be located in the same directory. It is preferable to use this option in small projects, such as lessons and examples. Only "update" project type is available for this option.
8) Project’s type. Several options are available:

    * "External" - engine will be taken from the "deploy/apps/common/" directory. Only application files will be compiled;
    * "Copy" - engine is copied into the compiled application directory. Only application files are compiled;
    * "Compile" - engine sources are compiled with application scripts;
    * "Update" - engine inside the project directory will be replaced;
    * "Webplayer JSON" - json-file placed inside the project is run with the help of web-player inside SDK;
    * "Webplayer HTML" - project is packed into single html-file, containing all required resources.

9) Javascript optimization level.

    * "Simple" - variable names are replaced in the code;
    * "Advanced" - code optimization is performed;
    * "Whitespace Only" - only whitespaces are removed from the code.

.. _project_info:

Project Information
-------------------

This page contains information regarding the selected project and can be viewed by the ``[info]`` link beside the project's title.

    .. image:: src_images/project_manager/project_manager_info.png
       :align: center
       :width: 100%

Commands
........

*Back to Projects*
    Returns to the Project Manager's main page.

*Help*
    Opens the :ref:`Help file <project_info>`.

Project Parameters
..................

*Project Name*
    The name of the project.

*Project Title*
    Project title as shown in the browser.

*Project Author / Company*
    The name of the project's author or the title of the developer company.

*Project Icon*
    The icon of the project.

*Application*
    Application's main JSON file.

*Engine Binding Type*
    The type of the project.

*Project Path (Development Directory)*
    Project's directory.

*Project Config*
    Project's config file.

*Build Directory*
    Project build folder.

*Blend Directory(s)*
    Directories where project's blend files are located.

*Assets Directory(s)*
    Directories where project's media assets are located.

*URL Params*
    The list of :ref:`URL parameters <webplayer_attributes>` used to start the application.

*JavaScript Obfuscation Level*
    JavaScript optimization level.

*JavaScript Compilation Ignore List*
    The list of exceptions for the project's script compilation.

*CSS Compilation Ignore List*
    The list of exceptions for the projects style sheets compilation.

*Deployment Directory Assets Prefix*
    The scene resource folder in the deployed application.

.. _import_projects:

Project Import
--------------

Tools for importing projects are available by the ``[Import Project(s)]`` link.

Clicking this link opens standard Open File dialog where you can select the project you need to import.

.. _export_projects:

Project Export
--------------

Project exporting window can be accessed by the ``[Export Project(s)]`` link.

    .. image:: src_images/project_manager/project_manager_export.png
       :align: center
       :width: 100%

Commands
........

*Back to Projects*
    Returns to the Project Manager’s main page.

*Hide Stock Projects*
    Hides stock projects. If such projects are already hidden, this command is replaced with the ``[Show Stock Projects]`` command.

*Help*
    Shows the Help page.

*Export Project(s)*
    Can be used to export selected projects.

Project Parameters
..................

*Select*
    Shows if the project is selected for export.

*Name*
    The name of the project's directory.

*Title*
    Project's title.

*Author*
   Project author’s name.

*Archive Name*
    The name of an archive to which exported projects are packed.


