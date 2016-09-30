if (b4w.module_check("game_config"))
    throw "Failed to register module: game_config";

b4w.register("game_config", function(exports, require) {

exports.DEFAULT_POS = new Float32Array([0, 0, -4]);

exports.LEVEL_LOAD_DELAY = 1.5;

// gems
exports.GEM_OFFSET = new Float32Array([0, 0, 1]);
exports.GEM_ROT_OFFSET = new Float32Array([0, 0, 0, 1]);
exports.GEM_SCALE_OFFSET = 0.6;

// gems state
exports.GM_SPARE = 0;
exports.GM_CARRIED = 1;
exports.GM_LAYING = 2;

exports.SHUTTER_EMITTER_EMPTY = "shutter_glass";
exports.SHUTTER_EMITTER_NAME = "glass_shutter_emitter";

// colors
exports.CL_BLUE = 0;
exports.CL_PURPLE = 1;
exports.CL_RED = 2;
exports.CL_GREEN = 3;
exports.CL_YELLOW = 4;
exports.CL_MULTI = 5;

// character
exports.CHAR_EMPTY = "petigor";
exports.CHAR_ARMAT = "petigor_armature";
exports.CHAR_MODEL = "petigor_model";
exports.CHAR_PICKER = "petigor_picker";
exports.CHAR_LIGHT = "sword_light";
exports.CHAR_SPHERE = "lava_shield_prot";
exports.CHAR_SWORD_SWITCHER = "flaming_sword_switcher";

exports.MOUSE_ROT_MULT = 2;
exports.TOUCH_ROT_MULT = 0.007;
exports.CAM_SOFTNESS = 0.2;
exports.CAM_OFFSET = new Float32Array([0, 15, 8]);
exports.CHAR_RAY_LENGTH = 1.2;

exports.MAX_CHAR_HP = 100;
exports.CHAR_ATTACK_DIST = 2.0;
exports.CHAR_ATTACK_STR = 35;
exports.CHAR_ATTACK_ANIM_FRAME = 12;

// character state
exports.CH_STILL = 0;
exports.CH_RUN = 1;
exports.CH_ATTACK = 2;
exports.CH_JUMP = 3;
exports.CH_VICTORY = 4;

// lava
exports.LAVA_DAMAGE_INTERVAL = 0.02;

// bonuses
exports.BONUS_SPAWN_CHANCE = 0.5;

exports.BONUS_HP_INCR = 30;
exports.BONUS_SHIELD_TIME = 10;
exports.BONUS_SHIELD_EFFECT = 0.33;
exports.BONUS_LAVA_PROT_TIME = 15;
exports.BONUS_LIFETIME = 15;
exports.BONUS_FLASH_SPEED = 3;

// bonus types
exports.BTYPE_HP = 0;
exports.BTYPE_LAVA = 1;
exports.BTYPE_SHIELD = 2;

// animations
exports.CHAR_IDLE_ANIM = "petigor_idle_combat";
exports.CHAR_RUN_ANIM = "petigor_run";
exports.CHAR_STRAFE = "petigor_strafe";
exports.CHAR_JUMP_ANIM = "petigor_jump";
exports.CHAR_DEATH_ANIMS = ["petigor_death_01", "petigor_death_02"];
exports.CHAR_ATTACK_ANIMS = ["petigor_atack_01", "petigor_atack_02",
                            "petigor_atack_03"];
exports.CHAR_VICTORY_ANIM = "petigor_victory";

exports.CHAR_HEAL_PICK_ANIM = "heal_pick";
exports.CHAR_LAVA_PROT_ANIM = "lava_prot_pick";
exports.CHAR_SHIELD_PICK_ANIM = "shield_pick";

exports.SHIELD_FLASH_LENGTH = 0.9;
exports.LAVA_FALL_LENGTH = 1.0;

// golem behaviour
exports.GOLEM_SPEED = 0.8;
exports.GOLEM_ROT_SPEED = 1.0;
exports.GOLEM_ATTACK_DIST = 2.0;
exports.GOLEM_ATTACK_STRENGTH = 20;
exports.GOLEM_ATTACK_ANIM_FRAME = 30;
exports.GOLEMS_SPAWN_INTERVAL = 3;
exports.GOLEM_HP = 100;
exports.STONE_GOLEMS_SP_MULT = 1.5;

// golem state
exports.GS_WALKING = 0;
exports.GS_ATTACKING = 1;
exports.GS_GETTING_OUT = 2;
exports.GS_NONE = 3;

// enemy type
exports.EN_TYPE_GOLEM_LAVA = 0;
exports.EN_TYPE_GOLEM_STONE = 1;

// golem target
exports.GT_POINT = 0;
exports.GT_CHAR = 1;
exports.GT_OBELISK = 2;

exports.GOLEM_LAVA_DEATH_EMPTY = ["golem_lava_death"];
exports.GOLEM_DEATH_RIG   = ["golem_death_armature"];
exports.GOLEM_DEATH_BLOW  = ["golem_death_blow"];
exports.STONE_GOLEM_EMITTER_EMPTY = "golem_stone_getout";
exports.STONE_GOLEM_EMITTER = ["golem_stone_getout", "golem_stone_getout_emitter"];

// objects
exports.HP_BONUSES_EMPTIES = ["potion_hp", "potion_hp.001", "potion_hp.002"];
exports.SHIELD_BONUSES_EMPTIES = ["potion_def"];
exports.LAVA_BONUSES_EMPTIES = ["potion_lava"];
exports.CAMERA_INDICTAOR = ["camera_indicator", "camera_indicator"];
exports.CAM_INDICATOR_VAL = "mask_switcher";

// sounds
exports.CHAR_RUN_SPEAKER = "speaker_petigor_run";
exports.CHAR_WIN_SPEAKER = "character_win_voice";
exports.CHAR_ATTACK_SPEAKER = "speaker_petigor_sword_miss";
exports.CHAR_ATTACK_VOICE_SPKS = ["speaker_petigor_voice_atack_01",
                                 "speaker_petigor_voice_atack_02",
                                 "speaker_petigor_voice_atack_03"];
exports.CHAR_HURT_SPKS = ["speaker_petigor_voice_hurt_01",
                          "speaker_petigor_voice_hurt_02"];
exports.CHAR_JUMP_SPKS = ["speaker_petigor_voice_jump_01",
                          "speaker_petigor_voice_jump_02"];

exports.CHAR_SWORD_SPEAKER = "speaker_petigor_sword_hit";
exports.CHAR_DEATH_SPEAKER = "speaker_petigor_voice_death_01";
exports.CHAR_LANDING_SPEAKER = "speaker_petigor_jump_ends";
exports.GEM_PICKUP_SPEAKER = "speaker_petigor_gem_pickup";
exports.GEM_MOUNT_SPEAKER = "speaker_petigor_gem_mount";

exports.CHAR_HEAL_SPEAKER = "speaker_petigor_bonus_heal";
exports.CHAR_LAVA_SPEAKER = "speaker_petigor_bonus_lava";
exports.CHAR_SHIELD_SPEAKER = "speaker_petigor_bonus_shield";

exports.GOLEM_WALK_SPEAKER = "golem_walk";
exports.GOLEM_ATTACK_SPEAKER = "golem_atack_miss";
exports.GOLEM_HIT_SPEAKER = "golem_atack_hit";
exports.GOLEM_GETOUT_SPEAKER = "golem_getout";

exports.GEM_DESTR_SPEAKER = "gem_destroy";
exports.WIN_SPEAKER = "final_win";

})
