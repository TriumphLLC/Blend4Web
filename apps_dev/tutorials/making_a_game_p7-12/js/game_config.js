export var NUM_ISLANDS = 5;
export var DEFAULT_POS = new Float32Array([0, 0, -1]);
export var GEM_OFFSET = new Float32Array([0, 0, 0.25]);
export var GEM_ROT_OFFSET = new Float32Array([0, 0, 0, 1]);
export var GEM_SCALE_OFFSET = 0.6;

// character
export var ROT_SPEED = 2;
export var CAM_SOFTNESS = 0.2;
export var CAM_OFFSET = new Float32Array([0, 4, 1.5]);
export var CHAR_DEF_POS = new Float32Array([0, 0, 0.5]);

export var MAX_CHAR_HP = 100;
export var CHAR_ATTACK_DIST = 0.5;
export var CHAR_ATTACK_STR = 35;
export var CHAR_ATTACK_ANIM_FRAME = 12;

// character state
export var CH_STILL = 0;
export var CH_RUN = 1;
export var CH_ATTACK = 2;

// rocks
export var ROCK_SPEED = 2;
export var ROCK_DAMAGE = 20;
export var ROCK_DAMAGE_RADIUS = 0.75;
export var ROCK_RAY_LENGTH = 10;
export var ROCK_FALL_DELAY = 0.5;

// lava
export var LAVA_DAMAGE_INTERVAL = 0.01;

// bonuses
export var BONUS_SPAWN_CHANCE = 0.5;

export var BONUS_HP_INCR = 30;
export var BONUS_SHIELD_TIME = 10;
export var BONUS_SHIELD_EFFECT = 0.33;
export var BONUS_LAVA_PROT_TIME = 15;
export var BONUS_LIFETIME = 10;
export var BONUS_FLASH_SPEED = 3;

// animations
export var SHIELD_FLASH_LENGTH = 0.9;
export var LAVA_FALL_LENGTH = 1.0;

// golem behaviour
export var GOLEM_SPEED = 0.2;
export var GOLEM_ROT_SPEED = 1.0;
export var GOLEM_ATTACK_DIST = 0.5;
export var GOLEM_ATTACK_STRENGTH = 20;
export var GOLEM_ATTACK_ANIM_FRAME = 30;
export var GOLEMS_SPAWN_INTERVAL = 3;
export var GOLEM_HP = 100;

// golem state
export var GS_WALKING = 0;
export var GS_ATTACKING = 1;
export var GS_GETTING_OUT = 2;
export var GS_NONE = 3;

// golem target
export var GT_POINT = 0;
export var GT_CHAR = 1;
export var GT_OBELISK = 2;

// objects
export var HP_BONUSES_EMPTIES = ["potion_hp", "potion_hp.001", "potion_hp.002"];
export var SHIELD_BONUSES_EMPTIES = ["potion_def"];
export var LAVA_BONUSES_EMPTIES = ["potion_lava"];

export var GOLEMS_EMPTIES = ["golem", "golem.001", "golem.002"];
//export var GOLEMS_EMPTIES = ["golem"];

export var GOLEMS_DEATH_EMPTY = ["golem_death"];
export var GOLEMS_DEATH_RIG   = ["golem_death_armature"];
export var GOLEMS_DEATH_BLOW  = ["golem_death_blow"];

export var ROCK_EMPTIES = ["lava_rock","lava_rock.001"];
export var ROCK_NAMES = ["rock_01", "rock_02", "rock_03"];

export var BURST_EMITTER_NAMES = ["burst_emitter_01", "burst_emitter_02",
                               "burst_emitter_03"];

export var MARK_NAMES = ["mark_01", "mark_02", "mark_03"];

export var GOLEM_SPAWN_POINTS = ["golem_spawn", "golem_spawn.011", "golem_spawn.010",
                              "golem_spawn.009", "golem_spawn.001", "golem_spawn.008",
                              "golem_spawn.002", "golem_spawn.006", "golem_spawn.007",
                              "golem_spawn.003", "golem_spawn.005", "golem_spawn.014",
                              "golem_spawn.013", "golem_spawn.004", "golem_spawn.012"];

export var GOLEM_PATROL_POINTS = ["golem_spawn",     "golem_patrol",     "golem_patrol.001", "golem_patrol.002", "golem_patrol.003",
                               "golem_spawn.001", "golem_patrol.004", "golem_patrol.005", "golem_patrol.006", "golem_patrol.007",
                               "golem_spawn.002", "golem_patrol.008", "golem_patrol.009", "golem_patrol.010", "golem_patrol.011",
                               "golem_spawn.003", "golem_patrol.012", "golem_patrol.013", "golem_patrol.014", "golem_patrol.015",
                               "golem_spawn.004", "golem_patrol.016", "golem_patrol.017", "golem_patrol.018", "golem_patrol.019"];

export var POINTS_PER_ISL = GOLEM_PATROL_POINTS.length / NUM_ISLANDS;

export var GEMS_EMPTIES = ["gem_0", "gem_1", "gem_2", "gem_3", "gem_4", "gem_multi"];
export var GEMS_NAMES   = ["gem_0", "gem_1", "gem_2", "gem_3", "gem_4", "gem_multi"];

// gems state
export var GM_SPARE = 0;
export var GM_CARRIED = 1;
export var GM_LAYING = 2;

// obelisks
export var OBELISK_NUM_GEMS = 4;
export var OBELISKS_GEMS_NAME = ["BG", "PG", "RG", "GG", "YG"];
export var OBELISK_GEM_HEALTH = 3;

export var ISLES_SHIELD_DUPLI_NAME_LIST = ["enviroment", "islands", "island_shield_0"];

export var SHUTTER_EMITTER_EMPTY = "shutter_glass";
export var SHUTTER_EMITTER_NAME = "glass_shutter_emitter";

// sounds
export var CHAR_RUN_SPEAKER = "character_run";
export var CHAR_ATTACK_SPEAKER = "sword_miss";
export var CHAR_ATTACK_VOICE_SPKS = ["character_voice_atack_01",
                                 "character_voice_atack_02",
                                 "character_voice_atack_03"];
export var CHAR_HURT_SPKS = ["character_voice_hurt_01",
                          "character_voice_hurt_02"];
export var CHAR_JUMP_SPKS = ["character_voice_jump_01",
                          "character_voice_jump_02"];

export var CHAR_SWORD_SPEAKER = "sword_hit";
export var CHAR_DEATH_SPEAKER = "character_voice_death_01";
export var CHAR_LANDING_SPEAKER = "character_jump_ends";
export var GEM_PICKUP_SPEAKER = "gem_pickup";
export var GEM_MOUNT_SPEAKER = "gem_mount";

export var CHAR_HEAL_SPEAKER = "bonus_heal";
export var CHAR_LAVA_SPEAKER = "bonus_lava";
export var CHAR_SHIELD_SPEAKER = "bonus_shield";
export var ISLAND_SPEAKER = "island_shield_grow";

export var GOLEM_WALK_SPEAKER = "golem_walk";
export var GOLEM_ATTACK_SPEAKER = "golem_atack_miss";
export var GOLEM_HIT_SPEAKER = "golem_atack_hit";
export var GOLEM_GETOUT_SPEAKER = "golem_getout";

export var ROCK_HIT_SPEAKERS = ["rock_hit_01", "rock_hit_02", "rock_hit_03"];
export var GEM_DESTR_SPEAKER = "gem_destroy";
export var WIN_SPEAKER = "final_win";

export var MUSIC_INTRO_SPEAKER = "level_01_bm_intro";
export var MUSIC_END_SPEAKER = "level_01_bm_end";

export var MUSIC_SPEAKERS = ["level_01_bm_loop_A",
                          "level_01_bm_loop_B",
                          "level_01_bm_loop_C",
                          "level_01_bm_loop_D",
                          "level_01_bm_percussive"];

export var BTYPE_HP = 0;
export var BTYPE_LAVA = 1;
export var BTYPE_SHIELD = 2;
