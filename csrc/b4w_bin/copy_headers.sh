#!/bin/bash

BLENDER_SRC_PATH="$HOME/src/blender/source"

cp -v "$BLENDER_SRC_PATH/blender/blenlib/BLI_sys_types.h" ./includes/blenlib
cp -v "$BLENDER_SRC_PATH/blender/blenlib/BLI_utildefines.h" ./includes/blenlib
cp -v "$BLENDER_SRC_PATH/blender/blenlib/BLI_compiler_typecheck.h" ./includes/blenlib
cp -v "$BLENDER_SRC_PATH/blender/blenlib/BLI_compiler_compat.h" ./includes/blenlib
cp -v "$BLENDER_SRC_PATH/blender/blenlib/BLI_system.h" ./includes/blenlib

cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_action_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_color_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_customdata_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_defs.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_ID.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_image_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_listBase.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_meshdata_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_mesh_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_object_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_texture_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_userdef_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_vec_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_view2d_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_packedFile_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_key_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_boid_types.h" ./includes/makesdna
cp -v "$BLENDER_SRC_PATH/blender/makesdna/DNA_particle_types.h" ./includes/makesdna

cp -v "$BLENDER_SRC_PATH/blender/blenkernel/BKE_particle.h" ./includes/blenkernel
cp -v "$BLENDER_SRC_PATH/blender/blenkernel/BKE_customdata.h" ./includes/blenkernel















