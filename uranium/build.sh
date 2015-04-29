#!/bin/bash

EMCONFIGURE=emconfigure
EMMAKE=emmake
EMCC=emcc

# 64 Mb
MEMORY=67108864

BUILDDIR=build

PROJECT=uranium

DU_MODULES=(duCharacter duBoat duFloatingBody duWater duWorld bindings)

if [ ! -d "$BUILDDIR" ]; then
	mkdir $BUILDDIR
else
	rm -rf $BUILDDIR/*
fi

cd $BUILDDIR

#COPTS="-O1"
#COPTS="-Oz"
COPTS="-O2 --llvm-lto 1"
#COPTS="-O3 -s INLINING_LIMIT=100"
#COPTS="-O3 --llvm-lto 1"

#LOPTS="-O1"
#LOPTS="-Oz -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1"
LOPTS="-O2 --llvm-lto 1 -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1"
#LOPTS="-O3 -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1 -s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s INLINING_LIMIT=100"
#LOPTS="-O3 --llvm-lto 1 -s DOUBLE_MODE=0 -s CORRECT_OVERFLOWS=0 -s CORRECT_ROUNDINGS=0 -s CORRECT_SIGNS=0 -s PRECISE_I64_MATH=0 --closure 1 -s AGGRESSIVE_VARIABLE_ELIMINATION=1"

LOPTS2="-s TOTAL_MEMORY=$MEMORY -s WARN_ON_UNDEFINED_SYMBOLS=1 -s NO_EXIT_RUNTIME=1 -s NO_FILESYSTEM=1 -s NO_BROWSER=0 --memory-init-file 1 -s ASM_JS=1 --pre-js ../../src/b4w.js --pre-js ../../src/ipc.js --post-js ../bindings.js"

echo "Compile du modules"

#set -x
for module in "${DU_MODULES[@]}" 
do
    $EMCC $COPTS -I../bullet/src ../$module.cpp -c -o $module.bc
done

echo "Compile bullet" 


$EMCONFIGURE ../bullet/configure CXXFLAGS="$COPTS" --disable-demos --disable-dependency-tracking
$EMMAKE make -j8


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
_du_vec3 \
_du_quat4 \
_du_array6 \
_du_create_static_mesh_body \
_du_create_ghost_mesh_body \
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
_du_create_dynamic_bounding_body \
_du_create_ghost_bounding_body \
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
_du_add_constraint \
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
_du_check_ray_hit \
_du_add_body \
_du_remove_body \
_du_add_action \
_du_remove_action \
_du_activate \
_du_disable_deactivation \
_du_set_linear_velocity \
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
_du_compound_add_child \
_du_get_collision_result_by_id \
_du_get_collision_result \
_du_get_shape_name \
"

for i in $EXPFUN; do
	LOPTS3="$LOPTS3,'"$i"'";
done

# remove first comma
LOPTS3="-s EXPORTED_FUNCTIONS=[${LOPTS3:1}]"

echo "Generate JS ($LOPTS)"

EMCC_DEBUG=1 $EMCC $LOPTS $LOPTS2 $LOPTS3 bindings.bc duCharacter.bc duBoat.bc duFloatingBody.bc duWater.bc duWorld.bc src/.libs/libBulletDynamics.a src/.libs/libBulletCollision.a src/.libs/libLinearMath.a -o $PROJECT.js

