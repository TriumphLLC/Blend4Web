.. _first_steps:

******************
Экспресс-установка
******************

.. _first_steps_blender:

Установка программы Blender
===========================

Создание 3D сцен осуществляется в графическом пакете `Blender <http://ru.wikipedia.org/wiki/Blender>`_, который является программным продуктом с открытым исходным кодом и распространяется бесплатно.

Должна использоваться текущая стабильная версия Blender. Загрузить Blender можно с `официального сайта <http://www.blender.org/download>`_.

.. image:: src_images/blender_screens/blender_first_run.jpg
   :alt: Запуск программы Blender
   :align: center
   :width: 100%

.. index:: экспорт; установка программы Blender

.. _first_step_addon:

Установка аддона движка
=======================

Запустить Blender, загрузить сцену по умолчанию :file:`File > New`.
Вызвать окно пользовательских настроек :file:`File > User Preferences...`. Во вкладке :file:`Addons` нажать :file:`Install from File...` и затем выбрать zip-архив с файлами аддона. После этого необходимо отметить галочку напротив :file:`Import-Export: Blend4Web`.

.. image:: src_images/blender_screens/user_preferences_install_b2w.jpg
   :alt: Указание пути для скриптов в окне пользовательских настроек
   :align: center
   :width: 100%

Далее нажать :file:`Save User Settings` и закрыть окно пользовательских настроек.

.. index:: экспорт; установка аддона

.. _first_step_export_view:


Экспорт и просмотр сцены
========================

Созданную сцену можно экспортировать в формате HTML. Для этого нужно выбрать опцию :file:`Export > Blend4Web (.html)` и указать путь экспорта. Полученный HTML файл можно открыть любым браузером, поддерживающим технологию WebGL.


.. seealso:: :ref:`browser_webgl_support`

.. index:: экспорт; просмотр сцены
