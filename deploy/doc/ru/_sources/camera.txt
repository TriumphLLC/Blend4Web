.. _camera:

******
Камера
******

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
        В режиме нависания камера движется параллельно горизонтальной опорной плоскости.
    * *Static*
        В статическом режиме изменение положения камеры осуществляется посредством анимации или через API.

*Look At Cursor > Target Location*
    Доступно в режиме ``Target``. Позиция точки, относительно которой будет вращаться камера. Кнопка ``Look At Cursor`` позволяет скопировать текущее положение курсора, а при нажатии на неё активная камера поворачивается в направлении указанной точки.

*Depth of Field*
    Описано в разделе :ref:`dof`.


.. _camera_velocity:

Скорость движения камеры
========================

Для камеры доступно несколько настроек скорости движения.

*Camera Move Style > Camera Velocities > Translation Velocity*
    Актуально для режимов ``Target``, ``Eye``, ``Hover``. Задаёт скорость перемещения камеры.

*Camera Move Style > Camera Velocities > Rotation Velocity*
    Актуально для режимов ``Target``, ``Eye``, ``Hover``. Задаёт скорость вращения камеры.

*Camera Move Style > Camera Velocities > Zoom Velocity*
    Актуально для режимов ``Target``, ``Hover``. Задаёт скорость приближения камеры к опорной точке.

Значение параметров по умолчанию: ``Translation Velocity``, ``Rotation Velocity``: 1; ``Zoom Velocity``: 0.1.

Допустимые значения параметров: ``Translation Velocity``, ``Rotation Velocity``:
 :math:`\left[0,\ \infty \right)`; ``Zoom Velocity``: :math:`\left[0,\ 1\right)`.


Ограничения движения камеры
===========================

Для камеры доступно несколько настроек, ограничивающих/изменяющих её движение тем или иным образом. Они объединены в группу ``Camera Limits``.

.. image:: src_images/camera/camera_limits.png
   :align: center
   :width: 100%

Ограничители перемещения камеры могут отображаться непосредственно во вьюпорте Blender. Для этого нужно включить опцию ``Display Limits in Viewport``.

|

**Камера типа Target**

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

.. _panning_mode:

*Camera Move Style > Camera Limits > Use Panning Mode*
    Разрешить панорамное перемещение камеры.

|

**Камера типа Eye**

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

**Камера типа Hover**

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
    Позволяет пользователю приближать и удалять камеру относительно опорной точки. При отключении этого параметра камера будет свободно двигаться вдоль оси Z мировых координат в Blender'е, опорная точка не будет задана, а настройки ``Camera Move Style > Camera Limits > Horizontal Translation Limits`` и ``Camera Move Style > Camera Limits > Vertical Translation Limits`` будут ограничивать позицию самой камеры. По умолчанию отключено.

*Camera Move Style > Camera Limits > Distance Limits*
    Задание минимального и максимального расстояний от камеры до точки пересечения (опорная точка) направления взгляда камеры с горизонтальной опорной плоскостью
    (по умолчанию с плоскостью XOY мировых координат в Blender'е). Допустимые значения: *Min* :math:`\le` *Max*. Значения по умолчанию: *Min = 1*, *Max = 10*. По умолчанию отключено.

*Camera Move Style > Camera Limits > Vertical Rotation Limits*
    Ограничения угла подъема камеры (угла между направлением взгляда камеры и горизонтальной плоскостью). Становятся доступными при включении опции ``Camera Move Style > Camera Limits > Use Zooming``. Допустимые значения: *0° :math:`\le` Down :math:`\le` Up :math:`\le` 90°*. Значения по умолчанию: *Down = 0°, Up = 90°*.

*Camera Move Style > Camera Limits > Zero Level*
    Расстояние от опорной плоскости камеры до центра координат. По умолчанию равно нулю.

При включении настройки ``Blend4Web > Use Zooming`` лимиты по расстоянию и углу подъема будут действовать одновременно, задавая траекторию движения камеры в вертикальной плоскости.

.. only:: html

    .. image:: src_images/camera/hover_camera_rot_limits.svg
      :align: center
      :width: 100%

.. only:: latex

    .. image:: src_images/camera/hover_camera_rot_limits.png
      :align: center
      :width: 100%

Некорректное задание лимитов по расстоянию либо углу подъема приведет к отключению опции ``Camera Move Style > Camera Limits > Distance Limits``.

*Camera Move Style > Camera Limits > Use Horizontal Rotation*
    Разрешить вращение камеры в плоскости XOY Blender'а относительно опорной точки. Становятся доступными при включении опции ``Camera Move Style > Camera Limits > Distance Limits``. По умолчанию включено.

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

Управление камерой через API
============================

  Основные функции управления камерой находятся в модуле ``camera.js``.

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

|

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

|

.. _camera_switch_move_style:

**Изменение режима управления**

Для изменения режима управления камерой (опция в Blender - :ref:`Blend4Web > Move Style <camera_move_style>`) достаточно использовать метод ``set_camera_move_style()`` модуля ``app.js``:

.. code-block:: javascript

    // ...
    var m_app = require("app");
    var m_cam = require("camera");
    // ...
    m_app.set_camera_move_style(m_cam.MS_TARGET_CONTROLS);
    // ...

Если приложение не использует функционал модуля ``app.js``, для этих же целей можно использовать метод ``set_move_style()`` модуля ``camera.js``:

.. code-block:: javascript

    // ...
    var m_cam    = require("camera");
    var m_scenes = require("scenes");
    // ...
    var camera = m_scenes.get_active_camera();
    m_cam.set_move_style(camera, m_cam.MS_TARGET_CONTROLS);
    // ...

При изменении режима происходит сброс лимитов перемещения и позиции опорной точки (для камер типа ``TARGET`` и ``HOVER``), поэтому их необходимо установить заново с помощью соответствующих методов модуля ``camera.js``.
