.. _problems_and_solutions:

**********************
Problems and Solutions
**********************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

.. _renderer_not_working:

Problems Upon Startup
=====================

*1. The "Browser could not initialize WebGL" message is shown*.

.. image:: src_images/problems_and_solutions/no_webgl.png
   :align: center
   :width: 100%

Follow the instructions listed in the :ref:`webgl_not_working` section.

*2. The user interface or background is shown but the default scene is not rendered. At the same time the* http://get.webgl.org/ *site and other WebGL applications are working correctly.*

    Possible causes:

    * A local web server is not used or the browser is not set up for loading local resources. See the :ref:`browser_for_local_loading` section.

    * The engine tries to load resource files which were moved or deleted.

    * You are using the old versions of video drivers.

    * You are using open source drivers which do not fully support WebGL.

        For Linux users - due to incomplete OpenGL implementation in open source drivers at the moment it is recommended to use current versions of proprietary drivers for Nvidia and AMD video cards.

    * You are using an outdated operating system, such as Windows XP.


.. _webgl_not_working:

WebGL Failed to Init
====================

The http://get.webgl.org/ page tells about problems when viewing it in recent Chrome or Firefox. What can I do?


1. Install the latest updates for your system (for MS Windows see `the guide <http://support.microsoft.com/kb/311047>`_). In case of MS Windows install the latest `DirectX runtime <http://www.microsoft.com/en-us/download/details.aspx?id=35>`_. Reboot.

2. It is recommended to timely update video card drivers. To detect your video card and its vendor please type **about:gpu** (or **chrome://gpu**) to the address bar of Chrome browser...

.. image:: src_images/problems_and_solutions/chrome_gpu.png
   :align: center
   :width: 100%

|

or Firefox...

.. image:: src_images/problems_and_solutions/firefox_gpu.png
   :align: center
   :width: 100%

|

For Windows, you can run the DirectX Diagnostic Tool called **dxdiag**.

.. image:: src_images/problems_and_solutions/dxdiag.png
   :align: center
   :width: 100%

|


Download the drivers from the corresponding support center (for example `Intel <http://downloadcenter.intel.com/Default.aspx>`_, `Nvidia <http://www.nvidia.com/Download/index.aspx>`_, `AMD/ATI <http://support.amd.com/en-us/download>`_). Reboot the system after the drivers are installed.

3. If the measures described above did not help to initialize rendering (or there is no possibility to update the system) try to change the browser settings.

*For Chrome*:

Enter **about:flags** (or **chrome://flags**) into the browser's address bar, click :file:`Enable` under the :file:`Override software rendering list` option and restart the browser.

|

.. image:: src_images/problems_and_solutions/about_flags_force_webgl.png
   :align: center
   :width: 100%

|

*For Firefox*:

Enter **about:config** into the browser's address bar, search for the ``webgl.force-enabled`` parameter and double-click on it to switch from ``false`` to ``true``.


.. image:: src_images/problems_and_solutions/about_config_force_webgl.png
   :align: center
   :width: 100%

.. _known_problems:

Known Issues
============

* Problems with updating of the add-on.

    It’s strongly adviced to restart Blender after installing a newer version of Addon/SDK.

* NVIDIA 331 driver in Linux can cause WebGL errors.

* Changed texture filtering on some platforms.

    An incorrect texture filtering was disabled on iPad and Internet Explorer for materials with Alpha Clip type of transparency.

* Some devices with Mail GPU require manual WebGL activation in browser settings.

* For the local developement server to work on Apple OS X and Blender 2.76, you may need to install `Python 3.4 <https://www.python.org/downloads/release/python-343/>`. This is due to a bug in Blender https://developer.blender.org/T46623. This bug has been fixed in Blender 2.76b, so updating it is advised.

* Skeletal animation may work incorrectly while using Nouveau drivers.

* Transparent textures may not render correctly in the IE11 and Microsoft Edge web browsers and on iPad.

    The problem is relevant for the :ref:`transparent materials <alpha_blend>`. Image artifacts are visible in the areas where alpha channel value is close or equal to zero. To fix this issue, it is recommended to increase the value of the alpha channel until artifact are no longer visible (increasing it by value from 0.01 to 0.05 should be enough in the most cases).

* WebGL crashes on Linux Chromium with Nvidia GeForce 400/500 series GPUs with drivers later than 355.
    
    This issue is caused by incompatibility of Chromium sandbox and NVIDIA's latest drivers. The solution is to downgrade drivers to the 340xx version.
