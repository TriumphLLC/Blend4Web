#!/bin/bash

EMMAKE=emmake
EMCC=emcc

# 64 Mb
MEMORY=67108864

BUILDDIR=build

PROJECT_ASM=uranium
PROJECT_WASM=uranium_wasm

DU_MODULES=(duCharacter duBoat duFloatingBody duWater duWorld bindings)

CMAKE_TOOLCHAIN=../emcmake/Emscripten.cmake 

# before any cd
EXT_MODS=$(realpath ../tools/closure-compiler/extern_modules.js)
EXT_GLOBS=$(realpath ../tools/closure-compiler/extern_globals.js)

#COPTS="-O1 -DDEBUG"
#COPTS="-Oz -DNDEBUG"
COPTS="-O2 --llvm-lto 1 -DNDEBUG"
#COPTS="-O3 -s INLINING_LIMIT=100 -DNDEBUG"
#COPTS="-O3 --llvm-lto 1 -DNDEBUG"

#OPTS="-O1"
#LOPTS="-Oz -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1"
LOPTS="-O2 --llvm-lto 1 -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0"
#LOPTS="-O3 -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1 -s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s INLINING_LIMIT=100"
#LOPTS="-O3 --llvm-lto 1 -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1 -s AGGRESSIVE_VARIABLE_ELIMINATION=1"
LOPTS_ASM=" --closure 1"
LOPTS_WASM=" --closure 0"

LOPTS2="-s TOTAL_MEMORY=$MEMORY -s WARN_ON_UNDEFINED_SYMBOLS=1 -s NO_EXIT_RUNTIME=1 -s NO_FILESYSTEM=1 -s NO_BROWSER=0 --pre-js ../../src/b4w.js  --pre-js ../../src/ipc.js --pre-js ../bindings.js --post-js ../bindings_post.js "

LOPTS2_ASM="--pre-js ../locatefile.js --memory-init-file 1 -s ASM_JS=1 "
LOPTS2_WASM="--pre-js ../wasmbinaryfile.js --memory-init-file 0 -s WASM=1 "

EXPFUN="\
_du_create_world \
_du_cleanup_world \
_du_alloc_int_array \
_du_alloc_float_array \
_du_alloc_body_array \
_du_store_body \
_du_free \
_du_alloc_body_id_pointer \
_du_get_body_id_by_pointer \
_du_create_float_pointer \
_du_create_vec3 \
_du_create_quat \
_du_create_array6 \
_du_create_mesh_shape \
_du_create_static_mesh_body \
_du_create_ghost_mesh_body \
_du_create_dynamic_bounding_body \
_du_create_ghost_bounding_body \
_du_delete_body \
_du_create_box_shape \
_du_create_cylinder_shape \
_du_create_sphere_shape \
_du_create_capsule_shape \
_du_create_cone_shape \
_du_create_empty_shape \
_du_set_trans \
_du_set_quat \
_du_set_trans_quat \
_du_get_trans \
_du_get_trans_quat \
_du_set_collision_id \
_du_get_collision_id \
_du_set_margin \
_du_get_margin \
_du_pre_simulation \
_du_calc_sim_time \
_du_single_step_simulation \
_du_post_simulation \
_du_create_generic_6dof_constraint \
_du_create_generic_6dof_spring_constraint \
_du_create_hinge_constraint \
_du_create_point2point_constraint \
_du_create_cone_twist_constraint \
_du_set_generic_6dof_limit \
_du_set_hinge_limit \
_du_set_cone_twist_limit \
_du_set_constraint_param \
_du_cons_param_stop_cfm \
_du_cons_param_stop_erp \
_du_append_constraint \
_du_remove_constraint \
_du_create_vehicle_tuning \
_du_create_vehicle \
_du_create_boat \
_du_create_floater \
_du_vehicle_add_wheel \
_du_boat_add_bob \
_du_floating_body_add_bob \
_du_create_character \
_du_check_collisions \
_du_check_collision_impulse \
_du_add_collision_result \
_du_remove_collision_result \
_du_create_ray_test_results \
_du_cleanup_ray_test_results \
_du_check_ray_hit \
_du_get_ray_hit_body \
_du_get_ray_hit_fraction \
_du_get_ray_hit_position \
_du_get_ray_hit_normal \
_du_append_body \
_du_remove_body \
_du_append_action \
_du_remove_action \
_du_activate \
_du_disable_deactivation \
_du_set_linear_velocity \
_du_set_angular_velocity \
_du_apply_central_force \
_du_apply_torque \
_du_update_vehicle_controls \
_du_update_boat_controls \
_du_get_vehicle_wheel_trans_quat \
_du_get_boat_bob_trans_quat \
_du_get_floater_bob_trans_quat \
_du_set_character_move_direction \
_du_set_character_move_type \
_du_set_character_walk_velocity \
_du_set_character_run_velocity \
_du_set_character_fly_velocity \
_du_character_jump \
_du_set_character_rotation \
_du_set_character_hor_rotation \
_du_set_character_vert_rotation \
_du_character_rotation_inc \
_du_get_character_trans_quat \
_du_get_vehicle_speed \
_du_get_boat_speed \
_du_get_body_speed \
_du_set_gravity \
_du_set_damping \
_du_create_water \
_du_add_shore_dist_array \
_du_setup_water_params \
_du_set_water_time \
_du_get_character_dist_to_water \
_du_get_interp_data \
_du_floater_set_water \
_du_boat_set_water \
_du_character_set_water \
_du_add_water_wrapper \
_du_floater_set_water_wrapper_ind \
_du_boat_set_water_wrapper_ind \
_du_character_set_water_wrapper_ind \
_du_create_compound \
_du_compound_append_child \
_du_get_collision_result_by_id \
_du_get_collision_result \
_du_get_shape_name \
"

# CHECKS

[ ! -d "bullet" ] && echo "Bullet directory not found, seems you are trying to build uranium from light SDK" && exit 1;

# EXEC

[ -z "$EMSCRIPTEN" ] && echo "Need to set EMSCRIPTEN environment variable" && exit 1;

echo "Preparing target directory"

if [ ! -d "$BUILDDIR" ]; then
    mkdir $BUILDDIR
else
    rm -rf $BUILDDIR/*
fi

cd $BUILDDIR


echo "Compiling du modules"

#set -x
for module in "${DU_MODULES[@]}" 
do
    $EMCC $COPTS -I../bullet/src ../$module.cpp -c -o $module.bc
done

if [ $? -ne 0 ]; then
   echo "Compilation failed"
   exit 1
fi


echo "Compiling bullet" 

cmake -D CMAKE_CXX_FLAGS_RELEASE="$COPTS -Wno-warn-absolute-paths" -D BUILD_BULLET2_DEMOS:BOOL=OFF -D BUILD_BULLET3:BOOL=OFF -D BUILD_EXTRAS:BOOL=OFF -D BUILD_UNIT_TESTS:BOOL=OFF -D CMAKE_TOOLCHAIN_FILE=$CMAKE_TOOLCHAIN -G Unix\ Makefiles ../bullet/
VERBOSE=1 $EMMAKE make -j8

for i in $EXPFUN; do
    LOPTS3="$LOPTS3,'"$i"'";
done

# remove first comma
LOPTS3="-s EXPORTED_FUNCTIONS=[${LOPTS3:1}]"

echo "Generating uranium.js ($LOPTS)"

EMCC_CLOSURE_ARGS="--externs $EXT_MODS" EMCC_DEBUG=1 $EMCC $LOPTS $LOPTS_ASM $LOPTS2 $LOPTS2_ASM $LOPTS3 bindings.bc duCharacter.bc duBoat.bc duFloatingBody.bc duWater.bc duWorld.bc src/BulletDynamics/libBulletDynamics.a src/BulletCollision/libBulletCollision.a src/LinearMath/libLinearMath.a -o $PROJECT_ASM.js

echo "Generating uranium_wasm.js ($LOPTS)"
EMCC_CLOSURE_ARGS="--externs $EXT_MODS" EMCC_DEBUG=1 $EMCC $LOPTS $LOPTS_WASM $LOPTS2 $LOPTS2_WASM $LOPTS3 bindings.bc duCharacter.bc duBoat.bc duFloatingBody.bc duWater.bc duWorld.bc src/BulletDynamics/libBulletDynamics.a src/BulletCollision/libBulletCollision.a src/LinearMath/libLinearMath.a -o $PROJECT_WASM.js
#echo "Wrap in closure"
#
#(       #echo "\"use strict\"" && \
#        echo "var physics_worker = (function() {" && \
#        echo "var Module = this;" && \
#        cat $PROJECT.js && \
#        echo "return this;" && \
#        echo "}).call({});" ) > $PROJECT.js
#
