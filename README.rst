*****************************
Blend4Web: a 3D Web Framework
*****************************

Blend4Web is a tool for interactive 3D visualization on the Internet. Our framework is well suited for showcasing products, e-learning, game development, advertising and webdesign.

.. image:: https://www.blend4web.com/static/blend4web/images/about/blend4web_scheme.png
    :alt: Blender + Web = Blend4Web
    :align: center

The major distinguishing features of Blend4Web are:

* It works right in the web browser without installing any plug-ins (WebGL technology);
* Not only does it render 3D graphics but it also integrates realistic physics and spatial audio;
* It is extremely simple to use because it is based on Blender in which 3D scenes can be made and then directly exported, even as a standalone web page;
* It is available as a fully functional open source version or as under a paid commercial license.
* It does not depend on any non-free components or cloud services.

This repo mirrors the free SDK distribution which can be also `downloaded from the official site <https://www.blend4web.com/en/downloads/>`_.

-----

|latest_version| |compatible_blender_version| |license|

-----

=====
Demos
=====

|planetarium| |capri_begins| |mi-34_hermit|
|azure_grotto| |the_fountain| |the_watch|
|sports_car| |naturemorte| |the_farm|
|fashion_show| |the_island| |victory_day_2015|
|new_year_2015| |victory_day_2014|

=========
Tutorials
=========

|jungle_outpost| |sunglasses| |pyatigors_tale|
|playroom| |webmasters| |cloth_workflow|
|tortoise| |visualizing_grass| |simple_app|
|machinima| |soffit| |beach_umbrella|
|striped_shader|

============
Installation
============

Setting up the development environment suits 3D application developers. 
To familiarize yourself with the Blend4Web addon `Quick Installation <https://www.blend4web.com/doc/en/first_steps.html>`_ can be a better option.

----------------------------------
Step 1 - Adding to Blender Scripts
----------------------------------

* Run Blender, load the default scene **File > New**;
* Open the user preferences window **File > User Preferences...**;
* Go to the **File** tab, choose the path to the **blender_scripts** directory in the **Scripts** field;
* Click **Save User Settings** and *restart Blender*.

.. image:: https://www.blend4web.com/doc/en/_images/user_preferences_scripts_path.jpg
    :alt: Adding to Blender Scripts
    :align: center

----------------------------
Step 2 - Enabling the Add-on
----------------------------

* Again load the default scene;
* Open the user preferences window;
* Go to the **Addons** tab and choose the **Import-Export** category. Enable the **Import-Export: Blend4Web** checkbox;

.. image:: https://www.blend4web.com/doc/en/_images/user_preferences_enable_addon.jpg
    :alt: Enabling the Add-on
    :align: center

* Click **Save User Settings**. Restarting Blender is not required.

------------------------------------
Step 3 - Starting Development Server
------------------------------------

* Go to the **Render** tab and press the **Start** button on the **Development Server** panel;
* Press the **Open SDK** button to open the index web page of the Blend4Web SDK in your default browser. Try running demos!

.. image:: https://www.blend4web.com/media/img_article/107/rect4179-1-4.jpg
    :alt: Starting Development Server
    :align: center



.. |latest_version| image:: https://img.shields.io/badge/latest%20version-15.07-blue.svg
    :target: https://www.blend4web.com/en/downloads/
    :alt: Latest Version of Blend4Web

.. |compatible_blender_version| image:: https://img.shields.io/badge/compatible%20with%20Blender-2.75-orange.svg
    :target: https://download.blender.org/release/Blender2.75/
    :alt: Compatible Blender Version

.. |license| image:: https://img.shields.io/badge/license-GPLv3,%20commercial-lightgrey.svg
    :target: https://www.blend4web.com/en/services/
    :alt: License


.. |planetarium| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/planetarium.min50.jpg
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/interactivity/solar_system/solar_system_en.json
    :alt: Planetarium
    :width: 100 px

.. |capri_begins| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/capri_begins.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/capri_intro.json&compressed_textures
    :alt: Capri Begins

.. |mi-34_hermit| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/helicopter.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/vehicles/mi_34s1/mi_34s1_demo_scene.json&autorotate&compressed_textures
    :alt: Mi-34 Hermit

.. |azure_grotto| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/azure_grotto.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/vehicles/boat_pf28/boat_pf28.json&autorotate&compressed_textures
    :alt: Azure Grotto

.. |the_fountain| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/fountain.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/buildings/fountain_elephants/fountain_elephants.json&autorotate&compressed_textures
    :alt: The Fountain

.. |the_watch| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/watch.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/props/watch_scene/watch_scene.json&autorotate&compressed_textures
    :alt: The Watch

.. |sports_car| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/car.min50.png
    :target: https://www.blend4web.com/apps/webplayer/webplayer.html?load=../../assets/capri/vehicles/car_bv_eb164/car_bv_eb164.json&autorotate&compressed_textures
    :alt: Sports Car

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

.. |victory_day_2014| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/greetcard_victory_day_2014.min50.png
    :target: https://www.blend4web.com/tutorials/victory_day/victory_day.html?autorotate
    :alt: Victory Day (2014)

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

.. |striped_shader| image:: https://www.blend4web.com/static/blend4web/images/demos/github_icons/tut_striped_shader.min50.png
    :target: https://www.blend4web.com/en/demo/tut_striped_shader/
    :alt: Striped Shader



