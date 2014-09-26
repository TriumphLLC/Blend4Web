.. _problems_and_solutions:

******************
Проблемы и решения
******************


.. _renderer_not_working:


Проблемы при запуске рендерера
==============================

*1. Появляется сообщение "Browser could not initialize WebGL."*

Следует выполнить действия, описанные в разделе :ref:`webgl_not_working`. 

*2. Видны элементы интерфейса и фон, но сцена по умолчанию не отображается (куб с логотипом). При этом тестовый сайт* http://get.webgl.org/ *и другие WebGL приложения работают корректно.*

Вероятные причины: 

* Браузер не настроен для работы с локальными ресурсами. См. раздел :ref:`browser_for_local_loading`.

* Файлы ресурсов, которые пытается загрузить рендерер, были перемещены или удалены.

* Используется комбинация браузера, драйверов и операционной системы, не обеспечивающая полную поддержку WebGL (примеры: Internet Explorer 11 / Windows, открытые драйверы / Linux).


.. _webgl_not_working:

Ошибка инициализации WebGL
==========================

Сайт http://get.webgl.org/ при просмотре в браузерах Chrome или Firefox последней версии сообщает о проблемах. Что делать? 


1. Установить доступные обновления для системы (для Windows см. `инструкцию <http://support.microsoft.com/kb/311047/ru>`_). В случае Windows установить последнюю версию `DirectX <http://www.microsoft.com/ru-ru/download/details.aspx?id=35>`_. Перезагрузить систему.

2. Рекомендуется проводить своевременное обновление драйверов для графических карт. Чтобы определить тип и производителя карты, можно ввести **about:gpu** (или **chrome://gpu**) в адресную строку браузера Chrome...


.. image:: src_images/problems_and_solutions/chrome_gpu.jpg
   :align: center
   :width: 100%

|

или воспользоваться средством диагностики DirectX **dxdiag** (только для Windows).

|

.. image:: src_images/problems_and_solutions/dxdiag.png
   :align: center
   :width: 100%

|


Необходимо загрузить драйверы с соответствующего центра поддержки (например, `Intel <http://downloadcenter.intel.com/Default.aspx?lang=rus>`_, `Nvidia <http://www.nvidia.com/Download/index.aspx?lang=ru>`_, `AMD/ATI <http://support.amd.com/ru-ru/download>`_). После установки драйверов перезагрузить систему.

3. Если в результате вышеперечисленных действий инициализировать рендеринг не удается (или нет возможности обновить систему), можно попробовать изменить настройки браузера. 

*В Chrome*:

Ввести **about:flags** (или **chrome://flags**) в адресную строку браузера, нажать :file:`Включить` (:file:`Enable`) под опцией :file:`Переопределение списка программного рендеринга` (:file:`Override software rendering list`) и перезапустить браузер.

|

.. image:: src_images/problems_and_solutions/about_flags_force_webgl.jpg
   :align: center
   :width: 100%

|

*В Firefox*: 

Ввести **about:config** в адресную строку браузера, найти параметр ``webgl.force-enabled`` и переключить его двойным щелчком мыши из ``false`` в ``true``. 


.. image:: src_images/problems_and_solutions/about_config_force_webgl.jpg
   :align: center
   :width: 100%


.. note::

    Для пользователей Linux - ввиду неполной реализации OpenGL стека в драйверах с открытым кодом в настоящий момент рекомендуется использовать проприетарные драйверы текущей версии для графических процессоров Nvidia и AMD. 



.. _local_web_server:

Использование локального web-сервера
====================================

Простым вариантом обеспечения просмотра локальных ресурсов в браузерах может быть запуск web-сервера из стандартной библиотеки `Python <http://ru.wikipedia.org/wiki/Python>`_.

*На Windows*:

1. Загрузить и инсталлировать последнюю версию Python с `официального сайта <http://www.python.org/download/releases/>`_. На сегодняшний день это версия 3.4, и по умолчанию установка произойдет в директорию :file:`Python34` на диске :file:`C`.

2. Запустить командную строку (Command Prompt).

3. Выполнить команды::

    > c:
    > /Python34/python -m http.server

4. Перейти на страницу http://localhost:8000, на которой выбрать нужный файл для отображения.

*На Linux*::

    > python -m SimpleHTTPServer


или::


    > python3 -m http.server

Можно указать порт дополнительным параметром::

    > python -m SimpleHTTPServer 8080



