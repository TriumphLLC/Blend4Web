 
.. index:: anaglyph

.. _stereo:

****************
Stereo Rendering
****************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

The stereoscopic rendering mode is intended for viewing the content using special glasses. It is activated by an application via API.

Blend4Web supports two techniques of the stereo image rendering - anaglyph image and the HMD (head-mounted display).

Anaglyph:

.. image:: src_images/postprocessing_effects/postprocessing_effects_anaglyph.png
   :align: center
   :width: 100%

HMD:

.. image:: src_images/postprocessing_effects/postprocessing_effects_stereo.png
   :align: center
   :width: 100%

HMD is an experimental feature, for now it works only with the ``Eye`` type cameras.

Activation
----------

To use HMD stereo rendering, you need to install Oculus's `runtime utility <https://developer.oculus.com/downloads/>`_. Windows and MacOS versions can be found on the Oculus website in binary format, while Linux version should be compiled from the source code.

For now, the HMD is supported by the `Chromium experimental builds <http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html>`_ and in the `Firefox nightly builds <https://nightly.mozilla.org/>`_.

`Chromium settings. <https://docs.google.com/document/d/1g02qHfX85vSRSOkWm9k33I0b7VuyN79md9U9t6MIa4E/edit>`_

`Firefox settings. <https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API>`_

To turn the stereo rendering on, you need to choose certain option in the settings, in the third column from the right, as shown on the picture.

.. image:: src_images/postprocessing_effects/postprocessing_effects_hmd.png
   :align: center
   :width: 100%

For stereo rendering to work correctly, switching to the full screen mode is recommended.

Additional Settings
-------------------

None.
