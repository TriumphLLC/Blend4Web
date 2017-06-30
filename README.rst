****************************************
Blend4Web: Award-Winning 3D Web Solution
****************************************

Blend4Web is a tool for creating interactive, web-based 3D content. The framework can be used for showcasing products, e-learning, game development, advertising and web design.

Why Blend4Web?

* It works right in the web browser without installing any plug-ins (thanks to WebGL);
* Not only does it render 3D graphics but it also integrates realistic physics and spatial audio;
* It is extremely simple to use because it is based on Blender in which 3D scenes can be made and then directly exported, even as a standalone web page;
* It is available as a fully functional open source version or as under a paid commercial license.
* It does not depend on any non-free components or cloud services.

This repo mirrors the community edition SDK distribution which can also be `downloaded from the official site <https://www.blend4web.com/en/downloads/>`_.

-----

|latest_version| |compatible_blender_version| |license|

-----

=====
Demos
=====

|planetarium| |mi-34_hermit| |dairy_plant|
|capri_begins| |azure_grotto| |the_fountain|
|the_watch| |naturemorte| |the_farm|
|fashion_show| |the_island| |victory_day_2015|
|new_year_2015|

=========
Tutorials
=========

|jungle_outpost| |sunglasses| |pyatigors_tale|
|playroom| |webmasters| |cloth_workflow|
|tortoise| |visualizing_grass| |simple_app|
|machinima| |soffit| |beach_umbrella|

===============
Getting Started
===============

You need a compatible version of Blender installed in order to use Blend4Web.

---------------------------------
Step 1 - Specify the Scripts Path
---------------------------------

* Run Blender, load the default scene **File > New**;
* Open the user preferences window **File > User Preferences...**;
* Go to the **File** tab, choose the path to the **blender_scripts** directory in the **Scripts** field;
* Click **Save User Settings** and *restart Blender*.

.. image:: https://www.blend4web.com/doc/en/_images/user_preferences_sdk_path.png
    :alt: Specifying Blender Scripts Path
    :align: center

--------------------------
Step 2 - Enable the Add-on
--------------------------

* Again load the default scene;
* Open the user preferences window;
* Go to the **Add-ons** tab and select **Import-Export**. Turn on the **Import-Export: Blend4Web** checkbox;
* Click **Save User Settings**.

.. image:: https://www.blend4web.com/doc/en/_images/user_preferences_enable_addon.png
    :alt: Enabling the Add-on
    :align: center


===================
What's Next. Basics
===================

To reveal the engine settings, select Blend4Web from the upper panel menu.

------------
Fast Preview
------------

Preview scenes using **Fast Preview** button, located both at the bottom of the 3D View window and under the **Render** tab. In this case the scene will be exported inside some temporary storage and opened with the Scene Viewer.

------
Export
------

Select either **Blend4Web (.html)** or **Blend4Web (.json)** option from the **File > Export** menu.

Exported HTML files are self-contained and can be opened with a generic browser right away. On the other hand, exported JSON (together with BIN) files should be opened with the stock Web Player or loaded into your own 3D web app. See this `tutorial <https://www.blend4web.com/en/article/59/>`_ for more info.

--------------
SDK Index Page
--------------

Under the **Render** tab click **SDK Index**. The SDK index page will be opened in the default browser. Look through the demos, read the docs, run the Project Manager.


=======
Support
=======

We are always glad to answer your questions on the `Blend4Web forums <https://www.blend4web.com/en/forums/>`_. We also offer assistance for Blend4Web PRO owners with any technical issues which may arise (more `here <https://www.blend4web.com/en/services/support/>`_).


.. |latest_version| image:: https://img.shields.io/badge/latest%20version-17.06-blue.svg
    :target: https://www.blend4web.com/en/downloads/
    :alt: Latest Version of Blend4Web

.. |compatible_blender_version| image:: https://img.shields.io/badge/compatible%20with%20Blender-2.78-orange.svg
    :target: https://www.blend4web.com/blender/release/Blender2.78/
    :alt: Compatible Blender Version

.. |license| image:: https://img.shields.io/badge/license-GPLv3-lightgrey.svg
    :target: https://www.blend4web.com/en/services/
    :alt: License


.. |planetarium| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/planetarium.min50.jpg
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/interactivity/solar_system/solar_system_en.json
    :alt: Planetarium
    :width: 100 px

.. |dairy_plant| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/dairy_plant.min50.png
    :target: https://www.blend4web.com/en/demo/dairy_plant/
    :alt: Dairy Plant

.. |mi-34_hermit| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/helicopter.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/vehicles/mi_34s1/mi_34s1_demo_scene.json&autorotate&compressed_textures
    :alt: Mi-34 Hermit

.. |capri_begins| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/capri_begins.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/capri_intro.json&compressed_textures
    :alt: Capri Begins

.. |azure_grotto| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/azure_grotto.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/vehicles/boat_pf28/boat_pf28.json&autorotate&compressed_textures
    :alt: Azure Grotto

.. |the_fountain| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/fountain.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/buildings/fountain_elephants/fountain_elephants.json&autorotate&compressed_textures
    :alt: The Fountain

.. |the_watch| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/watch.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/props/watch_scene/watch_scene.json&autorotate&compressed_textures
    :alt: The Watch

.. |naturemorte| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/naturemorte.min50.png
    :target: https://www.blend4web.com/en/demo/naturemorte/
    :alt: Nature Morte

.. |the_farm| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/farm.min50.png
    :target: https://www.blend4web.com/en/demo/farm/
    :alt: The Farm

.. |fashion_show| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/fashion.min50.png
    :target: https://www.blend4web.com/en/demo/fashion/
    :alt: Fashion Show

.. |the_island| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/island.min50.png
    :target: https://www.blend4web.com/apps/flight/flight.html
    :alt: The Island

.. |victory_day_2015| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/greetcard_victory_day_2015.min50.png
    :target: https://www.blend4web.com/apps/victory_day_2015/victory_day_2015.html?lang=en
    :alt: V-Day 70th Anniversary

.. |new_year_2015| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/greetcard_happy_new_year_2015.min50.png
    :target: https://www.blend4web.com/en/demo/greetcard_happy_new_year_2015/
    :alt: Happy New Year 2015!

.. |jungle_outpost| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_jungle_outpost.min50.png
    :target: https://www.blend4web.com/en/demo/tut_jungle_outpost/
    :alt: Jungle Outpost

.. |sunglasses| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_sunglasses.min50.png
    :target: https://www.blend4web.com/en/article/81
    :alt: Making Sunglasses

.. |pyatigors_tale| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_pyatigors_tale.min50.png
    :target: https://www.blend4web.com/en/demo/tut_pyatigors_tale/
    :alt: Pyatigor's Tale

.. |playroom| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_playroom.min50.png
    :target: https://www.blend4web.com/en/demo/tut_playroom/
    :alt: Furnishing a Room

.. |webmasters| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_balloons.min50.png
    :target: https://www.blend4web.com/en/demo/tut_balloons/
    :alt: Webmasters!

.. |cloth_workflow| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_cloth_workflow.min50.png
    :target: https://www.blend4web.com/en/article/48
    :alt: Cloth Simulation Workflow

.. |tortoise| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_tortoise.min50.png
    :target: https://www.blend4web.com/en/demo/tut_tortoise/
    :alt: Tortoise

.. |visualizing_grass| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_grass.min50.png
    :target: https://www.blend4web.com/en/article/28
    :alt: Visualizing Grass

.. |simple_app| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_simple_webapp.min50.png
    :target: https://www.blend4web.com/en/article/23
    :alt: Simple App

.. |machinima| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_machinima.min50.png
    :target: https://www.blend4web.com/en/demo/tut_machinima/
    :alt: Machinima

.. |soffit| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_soffit.min50.png
    :target: https://www.blend4web.com/en/demo/tut_soffit/
    :alt: Soffit

.. |beach_umbrella| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_beach_umbrella.min50.png
    :target: https://www.blend4web.com/en/demo/tut_beach_umbrella/
    :alt: Beach Umbrella

