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

.. note::
    Some commands may not be available depending on the type of the project.

.. image:: src_images/project_manager/project_manager_commands.png
   :align: center

#. Compile project (not available for Web Player JSON and Web Player HTML projects).
#. Check for missing or unnecessary API modules (not available for Web Player JSON and Web Player HTML projects).

    Activating this option will make the Project Manager check the modules used by the application and output the results of the check to the console. Possible warning messages are listed below:

    1. If one or more API modules are missing from the project's folder, the following message will be displayed:

     Module `module_name` is missing from the `project_name` project, please append it to the project's html files.

    .. image:: src_images/project_manager/project_manager_check_modules_missing.png
       :align: center

    2. If the project has one or more API modules that are not used anywhere in the program code, the following message will be displayed:

     Module `module_name` is no longer required, please remove it from the project's HTML files.

    .. image:: src_images/project_manager/project_manager_check_modules_required.png
       :align: center

    3. In case no problems with missing/unnecessary modules have been detected, the following message will be displayed:

    .. image:: src_images/project_manager/project_manager_check_modules_complete.png
       :align: center

#. Re-export blend files from the project.
#. :ref:`Convert media resources. <converter>`
#. Export and download a project archive.
#. Remove the project.

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
6) Use Material Library. Blend files of the material library will be copied to the project directory "blender/project_name", while the asset files will be copied to "deploy/assets/project_name" folder.
7) Copy project manager script. The project.py script will be copied to the project directory.
8) All project files will be located in the same directory. It is preferable to use this option in small projects, such as lessons and examples. Only "update" project type is available for this option.
9) Project’s type. Several options are available:

    * "External" - engine will be taken from the "deploy/apps/common/" directory. Only application files will be compiled;
    * "Copy" - engine is copied into the compiled application directory. Only application files are compiled;
    * "Compile" - engine sources are compiled with application scripts;
    * "Update" - engine inside the project directory will be replaced;
    * "Web Player JSON" - json-file placed inside the project is run with the help of web-player inside SDK;
    * "Web Player HTML" - project is packed into single html-file, containing all required resources.

10) Javascript optimization level.

    * "Simple" - variable names are replaced in the code;
    * "Advanced" - code optimization is performed;
    * "Whitespace Only" - only whitespaces are removed from the code.


11) Web Player URL attributes. This tab is available only if ``Engine Binding Type`` parameter is set to ``Web Player JSON`` or ``Web Player HTML``.

    * "Show FPS" is used to display the FPS counter in the player’s top right corner.
    * "Auto-rotate camera" enables automatic camera rotation just after the scene loads.
    * "Disable social network buttons" disables social networks buttons on the control panel.
    * "Background transparency" enables transparency for the rendering area.
    * "Use compressed textures" enables loading of minified and compressed textures (in DDS format).

Creating a Web Player Application
---------------------------------

The main advantage of Web Player applications is the ease of deploying such applications on a website.

.. image:: src_images/project_manager/project_manager_create_web_player_project.png
       :align: center
       :width: 100%

Creating a Web Player application is simple. All you have to do when creating a new project is select the ``Web Player JSON`` or ``Web Player HTML`` option under the Engine Binding Type tab.

The parameters that are available for a Web Player project are mostly the same as for any other type of project. The only exception is the group of parameter known as the Web Player Params.

Project Settings
................

.. image:: src_images/project_manager/project_manager_web_player_parameters.png
       :align: center
       :width: 100%

This panel is only available if the ``Web Player JSON`` or ``Web Player HTML`` option has been enabled. The parameters listed here are in essence URL attributes that the Web Player application will use while running the project.

Deploying the Project
.....................

After you have completed your project, select the ``deploy project`` option from the ``Operations`` panel on the Project Manager main page. The project will be exported, packed into a single archive and downloaded to the folder where your web browser stores all dowloaded files.

To place the project on a webpage, you have to extract this archive and upload its files (the ``html`` file and the ``assets`` directory) to a web server using FTP, SSH or any other protocols supported by the server.

.. note::
    The internal structure of the archive and relative paths to its files should be retained after uploading the project files to a web server.

A Web Player HTML application can then be placed on any webpage by using an ``iframe`` container.
Here is an example of HTML code that can be used for this:

.. code-block:: html

    <!DOCTYPE html>
    <html>
    <head>
        <title>An Example Application</title>
    </head>
    <body>
        <iframe width="800" height="500" allowfullscreen src="/tutorials/examples/web_page_integration/example_scene.html"></iframe>
    </body>
    </html>

Deploying a JSON project is performed similarly, but instead of a single HTML file it uses a combination of the Web Player app and a JSON file that contains the actual scene.

.. code-block:: html

    <!DOCTYPE html>
    <html>
    <head>
        <title>Another Example Application</title>
    </head>
    <body>
        <iframe width="800" height="500" allowfullscreen src="/apps/webplayer/webplayer.html?load=/tutorials/examples/web_page_integration/example_scene.json&show_fps"></iframe>
    </body>
    </html>

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


