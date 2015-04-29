.. _outdoor_rendering:

***********************
Рендеринг наружных сцен
***********************

.. _water:

Вода
====

Активация
---------

Для предполагаемого материала воды включить опцию ``Blend4Web > Special: Water`` во вкладке ``Material``. 

.. image:: src_images/outdoor_rendering/water_material_setup.jpg
   :align: center
   :width: 100%

Базовые настройки
-----------------

*Прозрачность*
    Рекомендуется включить прозрачность с градиентом ``Game Settings > Alpha Blend`` и настроить значение ``Transparency > Alpha``. 

*Параметры освещения*
    Параметры освещения материала воды настраиваются как описано в разделе :ref:`material_lighting_params`.

Динамика волн
-------------

Симуляция волн осуществляется картами нормалей с анимированными развертками (в количестве от 0 до 4). Для текстур - карт нормалей используется только одно общее изображение, текстуры различаются параметрами ``Mapping > Size``. Меш для воды должен иметь текстурную развертку.

.. image:: src_images/outdoor_rendering/water_texture_setup_normal.png
   :align: center
   :width: 100%
   
Смачивание поверхностей
-----------------------

Осуществляется автоматически. Для включения эффекта на соответствующих материалах выставляется флаг ``Wettable``.


Отражение и эффект Френеля
--------------------------

Для материала воды поддерживается как статическое, так и динамическое зеркальное отражение, с эффектом Френеля. См. раздел :ref:`material_mirror`.


.. image:: src_images/outdoor_rendering/water_reflection_dynamic.jpg
   :align: center
   :width: 100%

Сглаживание береговой линии
---------------------------

*Blend4Web > Water Settings > Shore Smoothing*
    Включить сглаживание.

*Blend4Web > Water Settings > Water Absorb Factor*
    Коэффициент поглощения света водой. Чем он выше, тем прозрачнее вода.


Градиент цвета
--------------
Для создания цветого градиента на материале воды должна быть наложена текстура с включенной опцией ``Blend4Web > Shore Distance Map``, генерируемая с помощью скрипта для :ref:`запекания параметров береговой линии <shore_distance_bake>`.

*Blend4Web > Water Settings > Shallow Water Color*
    Цвет воды на мелководье.

*Blend4Web > Water Settings > Shallow Water Color Factor*
    Коэффициент примешивания цвета воды на мелководье.

*Blend4Web > Water Settings > Shore Water Color*
    Цвет воды непосредственно у береговой линии.

*Blend4Web > Water Settings > Shore Water Color Factor*
    Коэффициент примешивания цвета воды на береговой линии.

Преломление
-----------

Во вкладке ``Scene`` включить опцию ``Blend4Web > Render Refractions``.

.. image:: src_images/outdoor_rendering/water_refraction.jpg
   :align: center
   :width: 100%

Пена
----

Активация
.........

Для создания пены необходимо добавить в текстурные слоты материала воды две диффузные текстуры. Для текстур необходимо выставить опцию ``Blend4Web > Water Foam``.


.. image:: src_images/outdoor_rendering/water_texture_setup_foam.png
   :align: center
   :width: 100%


Настройка текстур
.................

*Influence > Color*
    Фактор влияния цвета текстуры. Значение по умолчанию 1.0.

*Blend4Web > UV Frequency*
    Частота колебаний анимированной развертки. Значение по умолчанию (1.0, 1.0).

*Blend4Web > UV Magnitude*
    Амплитуда колебаний анимированной развертки. Значение по умолчанию (1.0, 1.0).


Настройка материала
...................

*Blend4Web > Water Settings > Water foam factor*
    Фактор общего влияния пены. Значение по умолчанию 0.5.


Каустика и хроматическая аберрация
----------------------------------

Для создания каустики необходимо добавить в текстурные слоты материала воды одну текстуру типа ``Voronoi``. 


.. image:: src_images/outdoor_rendering/water_caustics.jpg
   :align: center
   :width: 100%

Настройка
.........

.. image:: src_images/outdoor_rendering/water_texture_setup_caustics.png
   :align: center
   :width: 100%

|
   
*Voronoi > Coloring: Intensity*
    Фактор влияния каустики. Значение по умолчанию 1.0.

*Voronoi > Noise: Size*
    Размер ячеек процедурной текстуры. Значение по умолчанию 0.25.


Подводная среда
---------------

.. image:: src_images/outdoor_rendering/underwater.jpg
   :align: center
   :width: 100%

Настройки видимости ("туман")
.............................

*Blend4Web > Water Settings > Underwater Fog Density*
    Экспоненциальный фактор, влияющий на плотность и расстояние. Значение по умолчанию 0.06.

*Blend4Web > Water Settings > Underwater Fog Color*
    Цвет тумана. Значение по умолчанию (0.5, 0.5, 0.5) (серый).


Применяются также настройки :ref:`сумеречных лучей <god_rays>`.


Граница сред
------------

Выключить опцию ``Game Settings > Backface Culling``.

.. image:: src_images/outdoor_rendering/water_border.jpg
   :align: center
   :width: 100%

.. _water_volumetric_waves:

Объемные волны
--------------

Активация
.........

*Blend4Web > Water Settings > Water Dynamic*

Включить объемные волны.

.. image:: src_images/outdoor_rendering/water_waves.jpg
   :align: center
   :width: 100%

Настройка
.........

*Blend4Web > Water Settings > Wave Height*
    Высота волн. Значение по умолчанию 0.0.

*Blend4Web > Water Settings > Wave Length*
    Длина волн. Значение по умолчанию 10.0.

*Blend4Web > Water Settings > Dist Noise Scale 0*
    Размер первого компонента волн, удаленных от берега.

*Blend4Web > Water Settings > Dist Noise Scale 1*
    Размер второго компонента волн, удаленных от берега.

*Blend4Web > Water Settings > Dist Noise Freq 0*
    Частота первого компонента волн, удаленных от берега.

*Blend4Web > Water Settings > Dist Noise Freq 1*
    Частота второго компонента волн, удаленных от берега.

*Blend4Web > Water Settings > Dir Min Shore Fac*
    Минимальный коэффициент уменьшения высоты прибрежных волн.

*Blend4Web > Water Settings > Dir Frequency*
    Частота накатывания прибрежных волн.

*Blend4Web > Water Settings > Dir Noise Scale*
    Размер шума на прибрежных волнах.

*Blend4Web > Water Settings > Dir Noise Freq*
    Частота шума на прибрежных волнах.

*Blend4Web > Water Settings > Dir Min Noise Fac*
    Минимальное значение шума на прибрежных волнах.
    
*Blend4Web > Water Settings > Dist Min Fac*
    Минимальный коэффициент примешивания волн, удаленных от берега.

*Blend4Web > Water Settings > Waves Horizontal Factor*
    Коэффициент смещения прибрежных волн в направлении к берегу.

Настройки генерируемой поверхности
----------------------------------

*Blend4Web > Water Settings > Generate Mesh*
    Включить генерируемую поверхность.

*Blend4Web > Water Settings > Number of Cascades*
    Количество каскадов в генерируемой поверхности.

*Blend4Web > Water Settings > Detailed Distance*
    Максимальное расстояние от камеры до края последнего каскада.


.. index:: параметры берега, береговая линия

.. _shore_distance_bake:

Создание текстуры с параметрами береговой линии
...............................................

На панели инструментов (горячая клавиша "T") во вкладке ``Blend4Web`` открыть панель ``B4W Shore Distance Baker``. Выставить настройки максимального расстояния до берега ``Maximum Distance`` и размера получаемой текстуры ``Texture Size``. Выбрать сначала объект (или несколько объектов) ландшафта, затем объект воды. Нажать кнопку ``Bake Shore Distance``. 

В зависимости от размера текстуры и количества вершин в обрабатываемых мешах время выполнения скрипта варьируется от долей секунды до нескольких минут. Убедиться, что в меше воды создана текстура с названием ``ShoreDistance``. 

При вызове скрипта в материале воды сохраняются некоторые системные свойства. Поэтому, после его работы обязательно нужно сохранять сцену. 


.. _atmosphere:

Атмосфера
=========

Рассеивание
-----------

Во вкладке ``World`` выставить опцию ``Sky Settings > Procedural Skydome``, предварительно выставив опцию ``Sky Settings > Render Sky``. Если одновременно с этим используется статическая :ref:`текстура неба <skydome_texture>`, она будет заменена.

.. note::

    Кроме того, процедурная текстура неба может быть использована для имитации рассеянного :ref:`освещения от окружающей среды <environment_lighting>`, по аналогии со статической :ref:`текстурой неба <skydome_texture>`. Для этого необходимо выставить опции ``Sky Settings > Use as Environment Lighting`` и ``Environment Lighting > Sky Texture``. Если текстура мира для рассеянного освещения уже существует, она будет заменена.


.. image:: src_images/outdoor_rendering/skydome_procedural.jpg
   :align: center
   :width: 100%

|

Движком поддерживаются следующие настройки:

*Sky Settings > Sky Color*
     Базовый цвет неба. Значение по умолчанию (0.087, 0.255, 0.6) (голубой).

*Sky Settings > Rayleigh Brightness*
     Яркость рэлеевского рассеяния (на малых частицах). Значение по умолчанию 3.3.

*Sky Settings > Mie Brightness*
     Яркость рассеяния Ми (на крупных частицах). Значение по умолчанию 0.1.

*Sky Settings > Spot Brightness*
     Яркость пятна солнца. Значение по умолчанию 20.0.

*Sky Settings > Scatter Strength*
     Фактор рассеяния света. Значение по умолчанию 0.2.

*Sky Settings > Rayleigh Strength*
     Фактор рэлеевского рассеяния. Значение по умолчанию 0.2.

*Sky Settings > Mie Strength*
     Фактор рассеяния Ми. Значение по умолчанию 0.006.

*Sky Settings > Rayleigh Collection Power*
     Степенной коэффицент рэлеевского рассеяния. Значение по умолчанию 0.35.

*Sky Settings > Mie Collection Power*
     Степенной коэффицент рассеяния Ми. Значение по умолчанию 0.5.

*Sky Settings > Mie Distribution*
     Распределение рассеяния Ми. Значение по умолчанию 0.4.



Туман
-----

Настраивается во вкладке ``World``.

*Blend4Web > Fog Settings > Fog Density*
    Экспоненциальный фактор, влияющий на плотность и расстояние. Значение по умолчанию 0.0.

*Blend4Web > Fog Settings > Fog Color*
    Цвет тумана. Значение по умолчанию (0.5, 0.5, 0.5) (серый).
    
При использовании динамического неба цвет тумана определяется цветом неба.


Время суток
-----------

Для лампы необходимо выставить опцию ``Blend4Web > Dynamic Intensity``.

Время суток устанавливается приложениями с использованием соответствующего API. В частности, время суток может устанавливаться в интерфейсе ``Lighting``
:ref:`просмотрщика сцен <viewer>`. 

.. image:: src_images/outdoor_rendering/sunset.jpg
   :align: center
   :width: 100%


Звезды
------

Настраиваются как описано в разделе :ref:`material_halo`.

.. image:: src_images/outdoor_rendering/stars.jpg
   :align: center
   :width: 100%

.. _wind:

Ветер
=====

Сила и направление ветра оказывает воздействие на 
    - :ref:`анимацию травы и крон деревьев <wind_bending>`
    - :ref:`динамику систем частиц <particles_force_fields>`
    - :ref:`частоту колебаний волн воды <water_volumetric_waves>` (в настоящий момент влияет только сила)


Активация
---------

Добавить на сцену объект - силовое поле типа ``Wind``.


Настройка
---------

*Направление*
    Направление задается посредством вращения объекта - силового поля.

*Force Fields > Strength*
    Сила ветра. Располагается во вкладке ``Physics``. Значение по умолчанию 1.0.


.. _wind_bending:

Анимация травы и крон деревьев
------------------------------

Подготовка ресурсов для рендеринга травы описана в разделе :ref:`particles_grass`.


Активация
.........

На объекте травы или дерева включить опцию ``Blend4Web > Wind Bending``.


Настройка
.........

Интерфейс для настроек появляется после активации опции ``Blend4Web > Wind Bending``.

.. image:: src_images/outdoor_rendering/wind_bending_setup.jpg
   :align: center
   :width: 100%

|

*Main bending > Angle*
    Амплитуда угла "основного" отклонения под действием ветра (в градусах). Значение по умолчанию 10.0.
    
*Main bending > Frequency*
    Частота "основного" отклонения под действием ветра. Значение по умолчанию 0.25.

*Main bending > Main Stiffness (A)*
    Текстовое поле для названия слоя вертексного цвета, содержащего информацию о жесткости "основного" отклонения. Может быть оставлено пустым. 

*Detail bending > Detail Amplitude*
    Амплитуда угла "детализованного" отклонения под действием ветра (в градусах). Значение по умолчанию 0.1.

*Detail bending > Branch Amplitude*
    Амплитуда угла отклонения ветвей под действием ветра (в градусах). Значение по умолчанию 0.3.

*Detail bending > Leaves Stiffness (R)*
    Текстовое поле для названия слоя вертексного цвета, содержащего информацию о жесткости листвы. Может быть оставлено пустым. 

*Detail bending > Leaves Phase (G)*
    Текстовое поле для названия слоя вертексного цвета, содержащего информацию о фазе отклонения листвы. Может быть оставлено пустым. 

*Detail bending > Overall Stiffness (B)*
    Текстовое поле для названия слоя вертексного цвета, содержащего информацию об общей жесткости листвы. Может быть оставлено пустым. 

Слои вертексных цветов с указанными в настройках названиями должны существовать в меше.

.. image:: src_images/outdoor_rendering/wind_bending_vcolors.jpg
   :align: center
   :width: 100%

