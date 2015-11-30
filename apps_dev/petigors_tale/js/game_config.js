if (b4w.module_check("game_config"))
    throw "Failed to register module: game_config";

b4w.register("game_config", function(exports, require) {

exports.DEFAULT_POS = new Float32Array([0, -4, 0]);

exports.GEM_OFFSET = new Float32Array([0, 1, 0]);
exports.GEM_ROT_OFFSET = new Float32Array([0, 0, 0, 1]);
exports.GEM_SCALE_OFFSET = 0.6;

// colors
exports.CL_BLUE = 0;
exports.CL_PURPLE = 1;
exports.CL_RED = 2;
exports.CL_GREEN = 3;
exports.CL_YELLOW = 4;
exports.CL_MULTI = 5;

// character
exports.ROT_SPEED = 2;
exports.CAM_SOFTNESS = 0.2;
exports.CAM_OFFSET = new Float32Array([0, 6, -16]);
exports.CHAR_RAY_LENGTH = 1.2;

exports.MAX_CHAR_HP = 100;
exports.CHAR_ATTACK_DIST = 2.0;
exports.CHAR_ATTACK_STR = 35;
exports.CHAR_ATTACK_ANIM_FRAME = 12;

// character state
exports.CH_STILL = 0;
exports.CH_RUN = 1;
exports.CH_ATTACK = 2;

// lava
exports.LAVA_DAMAGE_INTERVAL = 0.01;

// bonuses
exports.BONUS_SPAWN_CHANCE = 0.5;

exports.BONUS_HP_INCR = 30;
exports.BONUS_SHIELD_TIME = 10;
exports.BONUS_SHIELD_EFFECT = 0.33;
exports.BONUS_LAVA_PROT_TIME = 15;
exports.BONUS_LIFETIME = 10;
exports.BONUS_FLASH_SPEED = 3;

// animations
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

// objects
exports.HP_BONUSES_EMPTIES = ["potion_hp", "potion_hp.001", "potion_hp.002"];
exports.SHIELD_BONUSES_EMPTIES = ["potion_def"];
exports.LAVA_BONUSES_EMPTIES = ["potion_lava"];

exports.GOLEM_LAVA_DEATH_EMPTY = ["golem_lava_death"];
exports.GOLEM_DEATH_RIG   = ["golem_death_armature"];
exports.GOLEM_DEATH_BLOW  = ["golem_death_blow"];

// gems state
exports.GM_SPARE = 0;
exports.GM_CARRIED = 1;
exports.GM_LAYING = 2;

exports.SHUTTER_EMITTER_EMPTY = "shutter_glass";
exports.SHUTTER_EMITTER_NAME = "glass_shutter_emitter";

// sounds
exports.CHAR_RUN_SPEAKER = "character_run";
exports.CHAR_ATTACK_SPEAKER = "sword_miss";
exports.CHAR_ATTACK_VOICE_SPKS = ["character_voice_atack_01",
                                 "character_voice_atack_02",
                                 "character_voice_atack_03"];
exports.CHAR_HURT_SPKS = ["character_voice_hurt_01",
                          "character_voice_hurt_02"];
exports.CHAR_JUMP_SPKS = ["character_voice_jump_01",
                          "character_voice_jump_02"];

exports.CHAR_SWORD_SPEAKER = "sword_hit";
exports.CHAR_DEATH_SPEAKER = "character_voice_death_01";
exports.CHAR_LANDING_SPEAKER = "character_jump_ends";
exports.GEM_PICKUP_SPEAKER = "gem_pickup";
exports.GEM_MOUNT_SPEAKER = "gem_mount";

exports.CHAR_HEAL_SPEAKER = "bonus_heal";
exports.CHAR_LAVA_SPEAKER = "bonus_lava";
exports.CHAR_SHIELD_SPEAKER = "bonus_shield";

exports.GOLEM_WALK_SPEAKER = "golem_walk";
exports.GOLEM_ATTACK_SPEAKER = "golem_atack_miss";
exports.GOLEM_HIT_SPEAKER = "golem_atack_hit";
exports.GOLEM_GETOUT_SPEAKER = "golem_getout";

exports.GEM_DESTR_SPEAKER = "gem_destroy";
exports.WIN_SPEAKER = "final_win";

exports.BTYPE_HP = 0;
exports.BTYPE_LAVA = 1;
exports.BTYPE_SHIELD = 2;
})
