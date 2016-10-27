if (b4w.module_check("game_config"))
    throw "Failed to register module: game_config";

b4w.register("game_config", function(exports, require) {

exports.NUM_ISLANDS = 5;
exports.DEFAULT_POS = new Float32Array([0, 0, -1]);
exports.GEM_OFFSET = new Float32Array([0, 0, 0.25]);
exports.GEM_ROT_OFFSET = new Float32Array([0, 0, 0, 1]);
exports.GEM_SCALE_OFFSET = 0.6;

// character
exports.ROT_SPEED = 2;
exports.CAM_SOFTNESS = 0.2;
exports.CAM_OFFSET = new Float32Array([0, 4, 1.5]);
exports.CHAR_DEF_POS = new Float32Array([0, 0, 0.5]);

exports.MAX_CHAR_HP = 100;
exports.CHAR_ATTACK_DIST = 0.5;
exports.CHAR_ATTACK_STR = 35;
exports.CHAR_ATTACK_ANIM_FRAME = 12;

// character state
exports.CH_STILL = 0;
exports.CH_RUN = 1;
exports.CH_ATTACK = 2;

// rocks
exports.ROCK_SPEED = 2;
exports.ROCK_DAMAGE = 20;
exports.ROCK_DAMAGE_RADIUS = 0.75;
exports.ROCK_RAY_LENGTH = 10;
exports.ROCK_FALL_DELAY = 0.5;

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
exports.GOLEM_SPEED = 0.2;
exports.GOLEM_ROT_SPEED = 1.0;
exports.GOLEM_ATTACK_DIST = 0.5;
exports.GOLEM_ATTACK_STRENGTH = 20;
exports.GOLEM_ATTACK_ANIM_FRAME = 30;
exports.GOLEMS_SPAWN_INTERVAL = 3;
exports.GOLEM_HP = 100;

// golem state
exports.GS_WALKING = 0;
exports.GS_ATTACKING = 1;
exports.GS_GETTING_OUT = 2;
exports.GS_NONE = 3;

// golem target
exports.GT_POINT = 0;
exports.GT_CHAR = 1;
exports.GT_OBELISK = 2;

// objects
exports.HP_BONUSES_EMPTIES = ["potion_hp", "potion_hp.001", "potion_hp.002"];
exports.SHIELD_BONUSES_EMPTIES = ["potion_def"];
exports.LAVA_BONUSES_EMPTIES = ["potion_lava"];

exports.GOLEMS_EMPTIES = ["golem", "golem.001", "golem.002"];
//exports.GOLEMS_EMPTIES = ["golem"];

exports.GOLEMS_DEATH_EMPTY = ["golem_death"];
exports.GOLEMS_DEATH_RIG   = ["golem_death_armature"];
exports.GOLEMS_DEATH_BLOW  = ["golem_death_blow"];

exports.ROCK_EMPTIES = ["lava_rock","lava_rock.001"];
exports.ROCK_NAMES = ["rock_01", "rock_02", "rock_03"];

exports.BURST_EMITTER_NAMES = ["burst_emitter_01", "burst_emitter_02",
                               "burst_emitter_03"];

exports.MARK_NAMES = ["mark_01", "mark_02", "mark_03"];

exports.GOLEM_SPAWN_POINTS = ["golem_spawn", "golem_spawn.011", "golem_spawn.010",
                              "golem_spawn.009", "golem_spawn.001", "golem_spawn.008",
                              "golem_spawn.002", "golem_spawn.006", "golem_spawn.007",
                              "golem_spawn.003", "golem_spawn.005", "golem_spawn.014",
                              "golem_spawn.013", "golem_spawn.004", "golem_spawn.012"];

exports.GOLEM_PATROL_POINTS = ["golem_spawn",     "golem_patrol",     "golem_patrol.001", "golem_patrol.002", "golem_patrol.003",
                               "golem_spawn.001", "golem_patrol.004", "golem_patrol.005", "golem_patrol.006", "golem_patrol.007",
                               "golem_spawn.002", "golem_patrol.008", "golem_patrol.009", "golem_patrol.010", "golem_patrol.011",
                               "golem_spawn.003", "golem_patrol.012", "golem_patrol.013", "golem_patrol.014", "golem_patrol.015",
                               "golem_spawn.004", "golem_patrol.016", "golem_patrol.017", "golem_patrol.018", "golem_patrol.019"];

exports.POINTS_PER_ISL = exports.GOLEM_PATROL_POINTS.length / exports.NUM_ISLANDS;

exports.GEMS_EMPTIES = ["gem_0", "gem_1", "gem_2", "gem_3", "gem_4", "gem_multi"];
exports.GEMS_NAMES   = ["gem_0", "gem_1", "gem_2", "gem_3", "gem_4", "gem_multi"];

// gems state
exports.GM_SPARE = 0;
exports.GM_CARRIED = 1;
exports.GM_LAYING = 2;

// obelisks
exports.OBELISK_NUM_GEMS = 4;
exports.OBELISKS_GEMS_NAME = ["BG", "PG", "RG", "GG", "YG"];
exports.OBELISK_GEM_HEALTH = 3;

exports.ISLES_SHIELD_DUPLI_NAME_LIST = ["enviroment", "islands", "island_shield_0"];

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
exports.ISLAND_SPEAKER = "island_shield_grow";

exports.GOLEM_WALK_SPEAKER = "golem_walk";
exports.GOLEM_ATTACK_SPEAKER = "golem_atack_miss";
exports.GOLEM_HIT_SPEAKER = "golem_atack_hit";
exports.GOLEM_GETOUT_SPEAKER = "golem_getout";

exports.ROCK_HIT_SPEAKERS = ["rock_hit_01", "rock_hit_02", "rock_hit_03"];
exports.GEM_DESTR_SPEAKER = "gem_destroy";
exports.WIN_SPEAKER = "final_win";

exports.MUSIC_INTRO_SPEAKER = "level_01_bm_intro";
exports.MUSIC_END_SPEAKER = "level_01_bm_end";

exports.MUSIC_SPEAKERS = ["level_01_bm_loop_A",
                          "level_01_bm_loop_B",
                          "level_01_bm_loop_C",
                          "level_01_bm_loop_D",
                          "level_01_bm_percussive"];

exports.BTYPE_HP = 0;
exports.BTYPE_LAVA = 1;
exports.BTYPE_SHIELD = 2;
})
