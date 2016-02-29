.. _camera:

******
Камера
******

.. contents:: Содержание
    :depth: 3
    :backlinks: entry

Режимы управления и общие настройки
===================================

Настройки камеры выставляются в панели ``Properties`` на вкладке ``Camera (Object Data)``.

.. image:: src_images/camera/camera_setup.png
   :align: center
   :width: 100%

|

.. _camera_move_style:

*Camera Move Style > Move Style*
    Режим управления камерой:

    * *Target*
        По умолчанию камера находится в режиме вращения вокруг некоторой точки (target). Положение точки вращения может быть изменено (см. :ref:`панорамирование <panning_mode>`).
    * *Eye*
        Режим взгляда позволяет осуществлять вращение и перемещение от первого лица.
    * *Hover*
        В режиме нависания камера движется параллельно горизонтальной опорной плоскости. Дополнительными лимитами можно задать плавную траекторию движения камеры по направлению к опорной точке.
    * *Static*
        В статическом режиме изменение положения камеры осуществляется посредством анимации или через API.

*Look At Cursor > Target Location*
    Доступно в режиме ``Target``. Позиция точки, относительно которой будет вращаться камера. Кнопка ``Look At Cursor`` позволяет скопировать текущее положение курсора, а при нажатии на неё активная камера поворачивается в направлении указанной точки.

*Depth of Field*
    Описано в разделе :ref:`dof`.


.. _camera_velocity:

Для камеры доступны настройки скорости движения:

*Camera Move Style > Camera Velocities > Translation Velocity*
    Актуально для режимов ``Target``, ``Eye``, ``Hover``. Задаёт скорость перемещения камеры. Интервал значений: :math:`\left[0,\ \infty \right)`. Значение по умолчанию: 1.

*Camera Move Style > Camera Velocities > Rotation Velocity*
    Актуально для режимов ``Target``, ``Eye``, ``Hover``. Задаёт скорость вращения камеры. Интервал значений: :math:`\left[0,\ \infty \right)`. Значение по умолчанию: 1.

*Camera Move Style > Camera Velocities > Zoom Velocity*
    Актуально для режимов ``Target``, ``Hover``. Задаёт скорость приближения камеры к опорной точке. Интервал значений: :math:`\left[0,\ 0.99\right]`. Значение по умолчанию: 0.1.

Ограничения движения камеры
===========================

Для камеры доступно несколько настроек, ограничивающих/изменяющих её движение тем или иным образом. Они объединены в группу ``Camera Limits``.

.. image:: src_images/camera/camera_limits.png
   :align: center
   :width: 100%

Ограничители перемещения камеры могут отображаться непосредственно во вьюпорте Blender. Для этого нужно включить опцию ``Display Limits in Viewport``.

|

Камера типа Target
------------------

.. image:: src_images/camera/camera_limits_target.png
   :align: center
   :width: 100%

*Camera Move Style > Camera Limits > Distance Limits*
    Задание минимального и максимального расстояний от камеры до точки вращения. Допустимые значения: *Min* :math:`\le` *Max*. Значения по умолчанию: *Min = 1*, *Max = 10*. По умолчанию отключено.

.. only:: html

    .. image:: src_images/camera/distance_limits.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/distance_limits.png
        :align: center
        :width: 100%

*Camera Move Style > Camera Limits > Horizontal Rotation Limits*
    Ограничение горизонтального (вокруг мировой оси Z в Blender'е) вращения камеры относительно соответствующей точки. Вращение происходит по дуге окружности определяемой значениями ``Left Angle`` и ``Right Angle``. Дуга вращения соответствует движению из ``Left Angle`` в ``Right Angle`` против часовой стрелки. Значения по умолчанию: *Left Angle = -45°*, *Right Angle = 45°*. По умолчанию отключено.

.. only:: html

    .. image:: src_images/camera/horizontal_limits_target.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/horizontal_limits_target.png
        :align: center
        :width: 100%

*Camera Move Style > Camera Limits > Vertical Rotation Limits*
    Ограничение вертикального (вокруг локальной оси X камеры в Blender'е) вращения камеры относительно соответствующей точки. Вращение происходит по дуге окружности определяемой значениями ``Down Angle`` и ``Up Angle``. Дуга вращения соответствует движению из ``Down Angle`` в ``Up Angle`` по часовой стрелке. Значения по умолчанию: *Down Angle = -45°*, *Up Angle = 45°*. По умолчанию отключено.

.. only:: html

    .. image:: src_images/camera/vertical_limits_target.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/vertical_limits_target.png
        :align: center
        :width: 100%

*Camera Move Style > Camera Limits > Pivot Translation Limits*
    Ограничение перемещения точки привязки камеры. Значения по умолчанию: *MinZ = 0*, *MaxZ = 10*. Не отображается во вьюпорте.

.. _panning_mode:

*Camera Move Style > Camera Limits > Use Panning Mode*
    Разрешить панорамное перемещение камеры.

|

Камера типа Eye
---------------

.. image:: src_images/camera/camera_limits_eye.png
    :align: center
    :width: 100%

*Blend4Web > Horizontal Rotation Limits*
    Ограничение горизонтального (вокруг мировой оси Z в Blender'е) вращения камеры относительно своего местоположения. Вращение происходит по дуге окружности определяемой значениями ``Left Angle`` и ``Right Angle``. Дуга вращения соответствует движению из ``Left Angle`` в ``Right Angle`` по часовой стрелке. Значения по умолчанию: *Left Angle = -45°*, *Right Angle = 45°*. По умолчанию отключено.

.. only:: html

    .. image:: src_images/camera/horizontal_limits_eye.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/horizontal_limits_eye.png
        :align: center
        :width: 100%

*Camera Move Style > Camera Limits > Vertical Rotation Limits*
    Ограничение вертикального (вокруг локальной оси X камеры в Blender'е) вращения камеры относительно своего местоположения. Вращение происходит по дуге окружности определяемой значениями ``Down Angle`` и ``Up Angle``. Дуга вращения соответствует движению из ``Down Angle`` в ``Up Angle`` против часовой стрелки. Значения по умолчанию: *Down Angle = -45°*, *Up Angle = 45°*. По умолчанию отключено.

.. only:: html

    .. image:: src_images/camera/vertical_limits_eye.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/vertical_limits_eye.png
        :align: center
        :width: 100%

|

Камера типа Hover
-----------------

.. image:: src_images/camera/camera_limits_hover.png
    :align: center
    :width: 100%

*Camera Move Style > Camera Limits > Horizontal Translation Limits*
    Ограничение перемещения опорной точки вдоль оси X в мировых координатах в Blender'е. Допустимые значения: *Min* :math:`\le` *Max*. Значения по умолчанию: *MinX = -10*, *MaxX = 10*. По умолчанию отключено.

*Camera Move Style > Camera Limits > Vertical Translation Limits*
    Ограничение перемещения опорной точки вдоль оси Y в мировых координатах в Blender'е. Допустимые значения: *Min* :math:`\le` *Max*. Значения по умолчанию: *MinY = -10*, *MaxY = 10*. По умолчанию отключено.

.. only:: html

    .. image:: src_images/camera/hover_camera_trans_limits.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/hover_camera_trans_limits.png
        :align: center
        :width: 100%

*Camera Move Style > Camera Limits > Use Zooming*
    Позволяет пользователю приближать и удалять камеру относительно опорной точки. При отключении этого параметра положение камеры относительно опорной точки будет фиксированным. По умолчанию отключено.

*Camera Move Style > Camera Limits > Distance Limits*
    Задание минимального и максимального расстояний от камеры до точки пересечения (опорная точка) направления взгляда камеры с горизонтальной опорной плоскостью
    (по умолчанию с плоскостью XOY мировых координат в Blender'е). Допустимые значения: *Min* :math:`\le` *Max*. Значения по умолчанию: *Min = 1*, *Max = 10*. По умолчанию отключено.

*Camera Move Style > Camera Limits > Vertical Rotation Limits*
    Ограничения угла подъема камеры (угла между направлением взгляда камеры и горизонтальной плоскостью). Допустимые значения: *0°* :math:`\le` *Down* :math:`\le` *Up* :math:`\le` *90°*. Значения по умолчанию: *Down = 0°, Up = 90°*.

*Camera Move Style > Camera Limits > Zero Level*
    Расстояние от опорной плоскости камеры до центра координат. По умолчанию равно нулю.

.. _hover_trajectory_figure:

При включении настройки ``Blend4Web > Use Zooming`` лимиты по расстоянию и углу подъема будут действовать одновременно, задавая траекторию движения камеры в вертикальной плоскости.

.. only:: html

    .. image:: src_images/camera/hover_camera_rot_limits.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/hover_camera_rot_limits.png
        :align: center
        :width: 100%

Некорректное задание лимитов по расстоянию либо углу подъема приведет к отключению этой настройки.

*Camera Move Style > Camera Limits > Use Horizontal Rotation*
    Разрешить вращение камеры в плоскости XOY Blender'а относительно опорной точки. По умолчанию включено.

.. only:: html

    .. image:: src_images/camera/hover_camera_horiz_rotation.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/hover_camera_horiz_rotation.png
        :align: center
        :width: 100%

|

**Камера типа Static**

.. image:: src_images/camera/camera_limits_static.png
    :align: center
    :width: 100%

Камера этого типа не имеет ограничителей, так как не контролируется пользователем.

|

**Особенности задания ограничений**

* Для EYE/TARGET камеры перемена мест значений *Left/Right* или *Down/Up* приводит к движению по противоположной дуге окружности вращения.

.. only:: html

    .. image:: src_images/camera/limits_inversion.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/limits_inversion.png
        :align: center
        :width: 100%

* При ограничении горизонтального и вертикального вращения камеры можно выбрать пространство координат:

*Camera Space*
    Все углы отсчитываются относительно начального положения и ориентации камеры.

*World Space*
    Горизонтальные углы отсчитываются относительно направления оси Y в пространстве мировых координат, вертикальные - относительно плоскости XOY в мировом пространстве в Blender'е.

Значение по умолчанию: ``Camera Space``.

Ограничения по горизонтали на примере TARGET камеры:

.. only:: html

    .. image:: src_images/camera/camera_space_world_space_h.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/camera_space_world_space_h.png
        :align: center
        :width: 100%

Ограничения по вертикали на примере TARGET камеры:

.. only:: html

    .. image:: src_images/camera/camera_space_world_space_v.svg
        :align: center
        :width: 100%

.. only:: latex

    .. image:: src_images/camera/camera_space_world_space_v.png
        :align: center
        :width: 100%

.. _camera_api_notes:

Управление через API
====================

Подробная документация API модуля: :b4wmod:`ссылка camera`.

Положение и ориентация камеры в пространстве определяются конкретным режимом управления. В режимах ``EYE``, ``TARGET`` и ``HOVER`` модель поведения накладывает ряд ограничений, например, таких как выравнивание вертикальной оси камеры вдоль мировой оси Y и постоянная ориентация камеры на опорную точку.
Для ``STATIC`` камеры таких ограничений нет, поэтому она лучше подходит в случаях, когда нужен более полный контроль, например, при процедурной анимации.

Основные функции управления камерой находятся в модуле :b4wmod:`camera`. Часть из них, относящаяся к конкретному режиму управления, начинается с соответствующих префиксов: ``static_``, ``eye_``, ``target_`` и ``hover_``. Остальные методы применимы для всех режимов. 

.. _camera_move_style_change:

Задание режима управления
-------------------------

Для изменения режима и полного определения модели поведения камеры можно воспользоваться следующими методами: :b4wref:`camera.static_setup()`, :b4wref:`camera.eye_setup()`, :b4wref:`camera.target_setup()` и :b4wref:`camera.hover_setup()`. Они принимают объект, содержащий набор опциональных параметров, позволяющих задать положение камеры, поворот, наличие лимитов и т.д:

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();
    var POS = new Float32Array([1,1,1]);
    var LOOK_AT = new Float32Array([0,0,0]);
    var EYE_HORIZ_LIMITS = { left: Math.PI/4, right: -Math.PI/4 };
    var EYE_VERT_LIMITS = { down: -Math.PI/4, up: Math.PI/4 };
    var TARGET_DIST_LIMITS = { min: 1, max: 10 };
    var HOVER_DIST_LIMITS = { min: 1, max: 10 };
    var HOVER_ANGLE_LIMITS = { down: 0, up: -Math.PI/4 };
    var HOVER_HORIZ_TRANS_LIMITS = { min: -5, max: 3 };
    var HOVER_VERT_TRANS_LIMITS = { min: -1, max: 1 };

    ...
    
    // setup STATIC camera by defining the new position and the new look-at point
    m_cam.static_setup(camera, { pos: POS, look_at: LOOK_AT });

    // setup STATIC camera by defining the new look-at point and keeping the existing position
    m_cam.static_setup(camera, { look_at: LOOK_AT });

    // setup STATIC camera by defining the new position and keeping the existing orientation
    m_cam.static_setup(camera, { pos: POS });

    // setup EYE camera with horizontal rotation limits
    m_cam.eye_setup(camera, { pos: POS, look_at: LOOK_AT, 
            horiz_rot_lim: EYE_HORIZ_LIMITS });

    // setup EYE camera with vertical rotation limits
    m_cam.eye_setup(camera, { pos: POS, look_at: LOOK_AT, 
            vert_rot_lim: EYE_VERT_LIMITS });

    // setup TARGET camera with distance limits and panning mode
    m_cam.target_setup(camera, { pos: POS, pivot: LOOK_AT, 
            dist_lim: TARGET_DIST_LIMITS, use_panning: true });

    // setup HOVER camera on a fixed distance (without zooming) reltively to its pivot
    m_cam.hover_setup(camera, { pos: POS, pivot: LOOK_AT });

    // setup HOVER camera with zooming (distance + angle limits)
    m_cam.hover_setup(camera, { pos: POS, pivot: LOOK_AT, 
            dist_lim: HOVER_DIST_LIMITS, hover_angle_lim: HOVER_ANGLE_LIMITS });

    // setup HOVER camera with translation limits
    m_cam.hover_setup(camera, { pos: POS, pivot: LOOK_AT, 
            horiz_trans_lim: HOVER_HORIZ_TRANS_LIMITS, 
            vert_trans_lim: HOVER_VERT_TRANS_LIMITS });

    // setup HOVER camera with horizontal rotation enabled
    m_cam.hover_setup(camera, { pos: POS, pivot: LOOK_AT, enable_horiz_rot: true });

Особенность камеры типа ``HOVER`` заключается в том, что лимиты, ограничивающие расстояние и угол подъёма, задают определённую :ref:`траекторию <hover_trajectory_figure>` движения по направлению к опорной точке. Камера всегда будет находиться на данной траектории, поэтому её итоговая позиция может отличаться от той, что была передана в методе :b4wref:`camera.hover_setup()` (по сути происходит её проекция на траекторию). Если необходимо, чтобы заданное положение камеры сразу находилось на некой траектории, то можно воспользоваться методом :b4wref:`camera.hover_setup_rel()` для относительного задания лимитов. 

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();
    var POS = new Float32Array([1,1,1]);
    var PIVOT = new Float32Array([0,0,0]);

    ...

    // setup HOVER camera with maintaining the given camera position and 
    // ability to zoom-in and zoom-out equally
    m_cam.hover_setup_rel(camera, { pos: POS, pivot: PIVOT, dist_interval: 2, 
            angle_interval: Math.PI/4 });

Проверить текущий режим камеры можно, используя методы :b4wref:`camera.is_static_camera()`, :b4wref:`camera.is_eye_camera()`, :b4wref:`camera.is_target_camera()`, :b4wref:`camera.is_hover_camera()` или :b4wref:`camera.get_move_style()`:

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();

    ...

    if (m_cam.is_static_camera(camera))
        console.log("STATIC camera!");

    if (m_cam.get_move_style(camera) == m_cam.MS_EYE_CONTROLS)
        console.log("EYE camera!");

.. note::

    Если требуется изменить лишь некоторые аспекты поведения камеры, то стоит воспользоваться отдельными методами, описанными ниже.

Перемещение и поворот
---------------------

Для поворота STATIC камеры следует использовать методы :b4wref:`camera.static_get_rotation()` и :b4wref:`camera.static_set_rotation()` - в них поворот описывается кватернионом:

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();

    ...

    // rotation through a quaternion
    var _quat_tmp = new Float32Array(4);
    var old_quat = m_cam.static_get_rotation(camera, _quat_tmp);
    var new_quat = m_quat.rotateX(old_quat, Math.PI/2, old_quat)
    m_cam.static_set_rotation(camera, new_quat);

Для EYE, TARGET и HOVER поворот осуществляется в :ref:`сферических координатах <camera_spherical_coordinates>` с использованием методов :b4wref:`camera.eye_rotate()`, :b4wref:`camera.target_rotate()`, :b4wref:`camera.hover_rotate()` и :b4wref:`camera.rotate_camera()`:

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();

    ...

    // rotate by given delta angles
    m_cam.eye_rotate(camera, Math.PI/6, Math.PI/2);

    // set absolute rotation in world space
    m_cam.eye_rotate(camera, Math.PI/6, Math.PI/2, true, true);

Текущие сферические координаты камеры можно получить, используя метод :b4wref:`camera.get_camera_angles()`:

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();
    var _vec2_tmp = new Float32Array(2);

    ...

    // get camera orientation in spherical coordinates
    var angles = m_cam.get_camera_angles(camera, _vec2_tmp);
    phi = angles[0];
    theta = angles[1];

Доступ к позиции камеры предоставляют методы :b4wref:`camera.get_translation()` и :b4wref:`camera.set_translation()`. При этом для режимов TARGET и HOVER перемещение означает параллельный перенос всей модели, включающей позицию камеры и опорную точку.

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();
    var _vec3_tmp = new Float32Array(3);

    ...

    // get camera position
    var pos = m_cam.get_translation(camera, _vec3_tmp);

    // set new position
    var new_pos = m_vec3.set(1, 0, 2, pos);
    m_cam.set_translation(camera, new_pos);

Дополнительные методы для перемещения камеры:

* :b4wref:`camera.target_set_trans_pivot()`, :b4wref:`camera.target_set_pivot_translation()`, :b4wref:`camera.hover_set_pivot_translation()` - одновременное задание позиции и опорной точки камеры;

* :b4wref:`camera.target_get_distance()`, :b4wref:`camera.target_set_distance()` - смещение по расстоянию до опорной точки;

* :b4wref:`camera.static_set_look_at()`, :b4wref:`camera.eye_set_look_at()` - одновременное задание позиции и точки взгляда камеры;

.. note::

    Т.к. камера является объектом сцены, то при необходимости можно использовать и методы модуля :b4wmod:`transform`. Однако, результат может не всегда соответствовать ожиданиям из-за вмешательства модели поведения камеры в каждом конкретном режиме.

Задание лимитов
---------------

Лимиты камеры присутствуют в режимах EYE, TARGET и HOVER. Для назначения конкретного лимита следует воспользоваться соответствующим методом: 

+----------------------------------------------+-------------------------------------------------+-------------------------------------------------+
| EYE                                          | TARGET                                          | HOVER                                           |
+==============================================+=================================================+=================================================+
| :b4wref:`camera.eye_get_horizontal_limits()` | :b4wref:`camera.target_get_distance_limits()`   | :b4wref:`camera.hover_get_distance_limits()`    |
| :b4wref:`camera.eye_set_horizontal_limits()` | :b4wref:`camera.target_set_distance_limits()`   | :b4wref:`camera.hover_set_distance_limits()`    |
| :b4wref:`camera.eye_get_vertical_limits()`   | :b4wref:`camera.target_get_horizontal_limits()` | :b4wref:`camera.hover_get_vertical_limits()`    |
| :b4wref:`camera.eye_set_vertical_limits()`   | :b4wref:`camera.target_set_horizontal_limits()` | :b4wref:`camera.hover_set_vertical_limits()`    |
|                                              | :b4wref:`camera.target_get_vertical_limits()`   | :b4wref:`camera.hover_get_horiz_trans_limits()` |
|                                              | :b4wref:`camera.target_set_vertical_limits()`   | :b4wref:`camera.hover_set_horiz_trans_limits()` |
|                                              | :b4wref:`camera.target_get_pivot_limits`        | :b4wref:`camera.hover_get_vert_trans_limits()`  |
|                                              | :b4wref:`camera.target_set_pivot_limits`        | :b4wref:`camera.hover_set_vert_trans_limits()`  |
+----------------------------------------------+-------------------------------------------------+-------------------------------------------------+

.. code-block:: javascript

    var camera = m_scenes.get_active_camera();
    var _limits_tmp = {};
    var EYE_HORIZ_LIMITS = { left: Math.PI/4, right: -Math.PI/4 };

    ...

    // get limits
    m_cam.eye_get_horizontal_limits(camera, _limits_tmp);

    // set limits
    m_cam.eye_set_horizontal_limits(camera, EYE_HORIZ_LIMITS);

Наличие лимитов можно проверить методами :b4wref:`camera.has_distance_limits()`, :b4wref:`camera.has_horizontal_rot_limits()`, :b4wref:`camera.has_vertical_rot_limits()`, :b4wref:`camera.has_horizontal_trans_limits()` и :b4wref:`camera.has_vertical_trans_limits()`.

.. note::

    В режиме HOVER у камеры всегда есть лимиты по дистанции и углу подъёма. В случае, если они не были заданы, лимиты автоматически рассчитываются так, чтобы зафиксировать камеру в текущем положении относительно опорной точки.

.. _hover_translation_limits:

.. note::

    При выставлении лимитов перемещения для камеры типа ``HOVER`` значения лимитов будут соответствовать осям системы координат движка:

    * ``Horizontal Translation Limits`` - ось X

    * ``Vertical Translation Limits`` - ось Z

    .. only:: html

        .. image:: src_images/camera/b4w_hover_trans_limits.svg
            :align: center
            :width: 100%

    .. only:: latex

        .. image:: src_images/camera/b4w_hover_trans_limits.png
            :align: center
            :width: 100%

.. note::

    Присутствующие на камере лимиты могут влиять на её позицию и ориентацию, выставляемые через API.

.. _camera_spherical_coordinates:
  
Отсчет угловых координат
------------------------

  При работе с камерой через API (вращение, выставление ограничений) отсчет угловых координат ведется в :ref:`системе координат движка <b4w_blender_coordinates>` следующим образом:

  Для типов ``TARGET/HOVER``:

.. only:: html

    .. image:: src_images/camera/b4w_target_hover_cam_angles.svg
      :align: center
      :width: 100%

.. only:: latex

    .. image:: src_images/camera/b4w_target_hover_cam_angles.png
      :align: center
      :width: 100%

Для типа ``EYE``:

.. only:: html

    .. image:: src_images/camera/b4w_eye_cam_angles.svg
      :align: center
      :width: 100%

.. only:: latex

    .. image:: src_images/camera/b4w_eye_cam_angles.png
      :align: center
      :width: 100%
