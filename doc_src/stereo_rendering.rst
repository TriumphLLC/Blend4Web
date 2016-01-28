 
.. index:: анаглиф, стереоизображение

.. _stereo:

*****************
Стереоизображение
*****************

Режим стереоизображения предназначен для просмотра контента в специальных очках и активируется приложением.

Blend4Web поддерживает два стереорежима - анаглифное изображение и HMD (Head-mounted display, шлем виртуальной реальности).

Анаглиф:

.. image:: src_images/postprocessing_effects/postprocessing_effects_anaglyph.png
   :align: center
   :width: 100%

HMD:

.. image:: src_images/postprocessing_effects/postprocessing_effects_stereo.png
   :align: center
   :width: 100%

HMD - экспериментальная возможность, она работает только с камерами типа ``Eye``.

Активация
---------

Для работы стереорежима HMD нужно установить `runtime-утилиту <https://developer.oculus.com/downloads/>`_ от Oculus. Версии для Windows и MacOS присутствуют на сайте Oculus в бинарном формате, версию утилиты для Linux пользователю понадобится собирать из исходников самостоятельно.

На сегодняшний день HMD поддерживается в экспериментальных сборках `Chromium <http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html>`_ и в nightly build `Firefox <https://nightly.mozilla.org/>`_.

`Настройки Chromium. <https://docs.google.com/document/d/1g02qHfX85vSRSOkWm9k33I0b7VuyN79md9U9t6MIa4E/edit>`_

`Настройки Firefox. <https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API>`_

Чтобы включить стереорежим, нужно выбрать соответствующий пункт в настройках приложения, в третьем столбце справа, как показано на иллюстрации.

.. image:: src_images/postprocessing_effects/postprocessing_effects_hmd.png
   :align: center
   :width: 100%

Для корректной работы рекомендуется включить полноэкранный режим.

Дополнительные настройки
------------------------

Отсутствуют.


