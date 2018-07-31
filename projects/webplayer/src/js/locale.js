export const LANG_DICT = {
  "play_tooltip": {
    "ru": "воспроизвести",
    "en": "play",
    "elem_id": "play_btn"
  },
  "pause_tooltip": {
    "ru": "пауза",
    "en": "pause",
    "elem_id": "play_btn"
  },
  "sound_on_tooltip": {
    "ru": "вкл. звук",
    "en": "sound on",
    "elem_id": "sound_btn"
  },
  "sound_off_tooltip": {
    "ru": "выкл. звук",
    "en": "sound off",
    "elem_id": "sound_btn"
  },
  "fs_on_tooltip": {
    "ru": "вкл. полноэкранный режим",
    "en": "full-screen on",
    "elem_id": "fullscreen_btn"
  },
  "fs_off_tooltip": {
    "ru": "выкл. полноэкранный режим",
    "en": "full-screen off",
    "elem_id": "fullscreen_btn"
  },
  "autorotate_on_tooltip": {
    "ru": "вкл. автовращение",
    "en": "autorotation on",
    "elem_id": "auto_rotate_btn"
  },
  "autorotate_off_tooltip": {
    "ru": "выкл. автовращение",
    "en": "autorotation off",
    "elem_id": "auto_rotate_btn"
  },
  "def": {
    "ru": "стерео режим / Отключено",
    "en": "Stereo mode / disabled"
  },
  "anag": {
    "ru": "анаглиф",
    "en": "anaglyph"
  },
  "side": {
    "ru": "sidebyside",
    "en": "sidebyside"
  },
  "hmd": {
    "ru": "hmd",
    "en": "hmd"
  },
  "cam_type": {
    "static": {
      "ru": "Static camera controls",
      "en": "Static camera controls"
    },
    "hover": {
      "ru": "Hover camera controls",
      "en": "Hover camera controls"
    },
    "target": {
      "ru": "Target camera controls",
      "en": "Target camera controls"
    },
    "eye": {
      "ru": "Eye camera controls",
      "en": "Eye camera controls"
    }
  }
}

export const HELP_DICT = {
    "desk": {

        // TARGET

        "help_target_rotate": {
            "t": {
                "ru": "Перемещение Камеры",
                "en": "Camera Movement"
            },
            "ru": "Чтобы выполнить вращение камеры относительно её цели нужно, с зажатой левой клавишей, перемещать мышь влево/вправо, вперёд/назад, аналогичные действия выполняют клавиши A, R, D, F и стрелки клавиатуры.",
            "en": "Hold the left mouse button and move the mouse left/right or forward/backward to rotate the camera across its target; the camera can also be rotated using arrow keys or A, R, D and F keys on the keyboard."
        },

        "help_target_zoom": {
            "t": {
                "ru": "Приближение Камеры",
                "en": "Camera Zoom"
            },
            "ru": "Чтобы приблизиться/отдалиться отцели камеры нужно, прокрутить среднее колесо мыши вперёд/назад, аналогичные действия выполняют клавишы S и W клавиауры.",
            "en": "Rotate the mouse wheel forward or backward to move the camera closer to or farther from the target; the S and W keys on the keyboard can also be used for this."
        },

        "help_target_interact": {
            "t": {
                "ru": "Взаимодействие",
                "en": "Interaction"
            },
            "ru": "Для взаимодействия с интерактивными элементами сцены нужно однократно нажать левую клавишу мыши.",
            "en": "Click interactive elements in the scene with the left mouse button to use them."
        },

        // STATIC

        "help_static": {
            "ru": "Данный тип камеры не может контролироваться пользователем. Это — программируемый тип камеры.",
            "en": "This is a programmable camera type; it cannot be controlled by the user."

        },

        // EYE

        "help_eye_rotation": {
            "t": {
                "ru": "Вращение камеры",
                "en": "Camera rotation"
            },
            "ru": "Чтобы выполнить вращение камеры относительно своего центра нужно, с зажатой левой клавишей, перемещать мышь влево/вправо, вперёд/назад, анологичные действия выполняют стрелки клавиатуры.",
            "en": "Hold the left mouse button and move the mouse right or left to rotate the camera across its center. The camera can also be moved using arrow keys on the keyboard."
        },

        "help_eye_zoom": {
            "t": {
                "ru": "Движение камеры вперёд/назад",
                "en": "Camera Zoom"
            },
            "ru": "Чтобы выполнить движение камерой вперёд/назад нужно, соответственно нажать клавиши клавиатуры W/S.",
            "en": "To move the camera forward or backward, press W or S key respectively."
        },

        "help_eye_move_cam_space": {
            "t": {
                "ru": "Перемещение камеры",
                "en": "Camera Movement"
            },
            "ru": "Чтобы переместить камеру в горизонтальном или вертикальном направлении нужно, нажать клавиши клавиатуры A/D (влево/вправо), R/F (вперёд/назад).",
            "en": "To move the camera horizontally or vertically, press A/D (left and right) or R/F (forward and backward) keys on the keyboard."
        },

        // HOVER

        "help_hover_lean": {
            "t": {
                "ru": "Изменение угла наклона камеры",
                "en": "Changing camera angle"
            },
            "ru": "Чтобы измененить угол поворота камеры относительно горизонтальной плоскости, нужно прокрутить среднее колесо мыши вперёд/назад, аналогичные действия выполняют клавишы R и F клавиауры.",
            "en": "Rotate the mouse wheel forward or backward to change the angle of camera inclination from the horizontal plane. This can also be done using R and F keys on the keyboard."
        },

        "help_hover_rotate": {
            "t": {
                "ru": "Вращение камеры",
                "en": "Camera rotation"
            },
            "ru": "Чтобы повернуть камеру вокруг вертикальной оси (Z), нужно, с зажатой правой клавишей, перемещать мышь в горизонтальном направлении влево/вправо.",
            "en": "Hold right mouse button and move mouse left or right to rotate the camera across the vertical (Z) axis."
        },

        "help_hover_move": {
            "t": {
                "ru": "Перемещение камеры",
                "en": "Camera move"
            },
            "ru": "Чтобы переместить камеру в горизонтальном или вертикальном направлении нужно, с зажатой левой клавишей, перемещать мышь влево/вправо, вперёд/назад, анологичные действия выполняют клавиши A, W, S, D и стрелки клавиатуры.",
            "en": "Hold the left mouse button and move the mouse left/right or forward/backward to move the camera vertically or horizontally. Arrow keys and W, A, S and D keys on the keyboard can also be used to move camera."
        },

        "help_hover_interact": {
            "t": {
                "ru": "Взаимодействие",
                "en": "Interaction"
            },
            "ru": "Для взаимодействия с интерактивными элементами сцены нужно однократно нажать левую клавишу мыши.",
            "en": "To use an interactive element in a scene, click it with the left mouse button."
        },

        "tmpl": {
            "t": {
                "ru": "",
                "en": ""
            },
            "ru": "",
            "en": ""
        },
    },
    "mobile": {

        // STATIC

        "help_static": {
            "ru": "Данный тип камеры не может контролироваться пользователем. Это — программируемый тип камеры.",
            "en": "This is a programmable camera type; it cannot be controlled by the user."
        },

        // EYE

        "help_eye_rotation": {
            "ru": "Вращение камеры относительно собственного центра.",
            "en": "Camera rotation across its center point."
        },

        "help_eye_interact": {
            "ru": "Взаимодействие с интерактивными элементами",
            "en": "Interaction with interactive elements"
        },

        // HOVER

        "help_hover_zoom": {
            "ru": "Изменение угла наклона камеры относительно горизонтальной плоскости.",
            "en": "Changing the angle of camera inclination relative to the horizontal plane."
        },

        "help_hover_rotate": {
            "ru": "Поворот камеры вокруг вертикальной оси (Z).",
            "en": "Camera rotation across the vertical (Z) axis."
        },

        "help_hover_move": {
            "ru": "Перемещение камеры в горизонтальном или вертикальном направлении.",
            "en": "Moving camera horizontally or vertically."
        },

        "help_hover_interact": {
            "ru": "Взаимодействие с интерактивными элементами.",
            "en": "Using interactive elements."
        },

        // TARGET

        "help_target_zoom": {
            "ru": "Приближение и отдаление относительно цели (наезд/отъезд).",
            "en": "Move camera closer to of farther from the target (zoom in/zoom out)."
        },

        "help_target_rotate": {
            "ru": "Вращение камеры относительно цели в любом направлении.",
            "en": "Rotate camera across the target in any direction. "
        },

        "help_target_interact": {
            "ru": "Взаимодействие с интерактивными элементами.",
            "en": "Using interactive elements."
        },

        "tmpl": {
            "t": {
                "ru": "",
                "en": ""
            },
            "ru": "",
            "en": ""
        },
    }
}
