//#include <emscripten.h>
#include <stdio.h>
#include <btBulletDynamicsCommon.h>
#include <BulletCollision/CollisionDispatch/btGhostObject.h>
#include "duCharacter.h" 
#include "duBoat.h" 
#include "duFloatingBody.h" 
#include "duWater.h" 
#include "duWorld.h" 

#define MAXWORLDS 256
#define MAXBODIES 65536
#define MAXVEHICLES 65536
#define MAXCONSTRAINTS 65536
#define MAX(a,b) ((a)>(b) ? (a): (b))
#define MIN(a,b) ((a)<(b) ? (a): (b))

#define COMPOUND_THRESHOLD 0.01
#define CCD_SIZE_THRESHOLD 0.5
// default 0.8
#define LINEAR_SLEEPING_THRESHOLD 0.8
// default 1.0
#define ANGULAR_SLEEPING_THRESHOLD 0.5
#define VEHICLE_INIT_BRAKE_FORCE 10000.0
#define COLLISION_MIN_DISTANCE 0.2
#define COMB_SORT_JUMP_COEFF 1.247330950103979

#define DU_ID(name) typedef struct name##__ { int unused; } *name

DU_ID(du_world_id);
DU_ID(du_body_id);
DU_ID(du_shape_id);
DU_ID(du_vehicle_tuning_id);
DU_ID(du_cons_id);
DU_ID(du_water_id);

DU_ID(du_action_id);
DU_ID(du_vehicle_id);
DU_ID(du_boat_id);
DU_ID(du_character_id);
DU_ID(du_floater_id);

struct du_collision_result {
    du_body_id body_a;
    du_body_id body_b;
    bool is_in_contact;
    float contact_point[3];
};

#ifdef __cplusplus
extern "C" { 
#endif

void delete_shape(btCollisionShape *shape);

static void terminate(const char *msg) __attribute__((noreturn));

float *du_alloc_float_array(int num);
du_collision_result **du_realloc_collision_result_array(du_collision_result **results, int num);

duWorld* get_active_world();

btCollisionShape *create_mesh_shape(int indices_len, int *indices, 
        int positions_len, float *positions);

btCollisionShape *consider_compound(btCollisionShape *shape, 
        float cm_x, float cm_y, float cm_z);

btMotionState *get_motion_state(btCollisionObject *obj);

void set_transform(btTransform *transform, float *trans, float *quat);

void du_reset_collision_results(du_collision_result **results,
                                int results_size);

void du_set_collision_result(du_collision_result **results, int size,
                             btPersistentManifold *contactManifold,
                             int point_ind);

void du_sort_array_ascending(du_collision_result **arr, int length);

int du_bin_search_by_body(du_collision_result **arr, du_body_id searched,
                          int start, int end);

int du_search_around_body_a(du_collision_result **arr, du_body_id searched,
                            int start_id);

int du_get_collision_result_ind(du_collision_result **results, int size,
                                du_body_id du_body_a, du_body_id du_body_b);

du_world_id _active_world = NULL;

// NOTE: for debug purposes. Doesn't work with asm.js
//void print(int i, void *p) {
//    asm("console.log(%0, %1)" : : "r"(i), "r"(p));
//}

/**
 * Initialize the new dynamics world
 */
du_world_id du_create_world()
{
    btBroadphaseInterface *broadphase;
    btConstraintSolver *csolver;
    btDefaultCollisionConfiguration *cconf;
    btCollisionDispatcher *dispatcher;

    duWorld *world;

    broadphase = new btDbvtBroadphase();
    csolver = new btSequentialImpulseConstraintSolver();
    cconf = new btDefaultCollisionConfiguration();
    dispatcher = new btCollisionDispatcher(cconf);

    world = new duWorld(dispatcher, broadphase, csolver, cconf);

    return reinterpret_cast <du_world_id>(world);
}

void du_cleanup_world(du_world_id world)
{
    int i;

    duWorld *bt_world = reinterpret_cast <duWorld*>(world);

    for (i = bt_world->getNumConstraints() - 1; i >= 0; i--) {
        btTypedConstraint* cons = bt_world->getConstraint(i);
        bt_world->removeConstraint(cons);
        delete cons;
    }

    for (i = bt_world->getNumCollisionObjects() - 1; i >= 0; i--) {
        btCollisionObject* obj = bt_world->getCollisionObjectArray()[i];
        btRigidBody* body = btRigidBody::upcast(obj);

        if (body && body->getMotionState())
            delete body->getMotionState();

        delete_shape(obj->getCollisionShape());

        // works for btRigidBody too
        bt_world->removeCollisionObject(obj);
        delete obj;
    }

    // TODO: remove ActionInterfaces (Vehicles)

    btBroadphaseInterface *broadphase = bt_world->getBroadphase();
    btConstraintSolver *csolver = bt_world->getConstraintSolver();
    btCollisionDispatcher *dispatcher = static_cast <btCollisionDispatcher*>(bt_world->getDispatcher());
    btCollisionConfiguration *cconf = dispatcher->getCollisionConfiguration();

    // delete in reverse order
    delete bt_world;

    delete dispatcher;
    delete cconf;
    delete csolver;
    delete broadphase;
}

/*
 * perform recursive shape cleanup
 */
void delete_shape(btCollisionShape *shape)
{
    if (shape->isCompound()) {
        // upcast
        btCompoundShape *comp_shape = (btCompoundShape*)shape;

        for (int i = comp_shape->getNumChildShapes()-1; i >= 0; i--) {
            btCollisionShape *child_shape = comp_shape->getChildShape(i);
            comp_shape->removeChildShape(child_shape);
            delete_shape(child_shape);
        }
    }
    
    delete shape;
}

void du_set_active_world(du_world_id id)
{
    _active_world = id;
}

void terminate(const char *msg) 
{
    printf("%s\n", msg);
    exit(1);
}

int *du_alloc_int_array(int num) 
{
    return (int*)malloc(num * sizeof(int));
}

float *du_alloc_float_array(int num) 
{
    return (float*)malloc(num * sizeof(float));
}

/**
 * Allocate array of pointers to physics bodies
 */
void *du_alloc_body_array(int num)
{
    return malloc(num * sizeof(du_body_id));
}

du_collision_result **du_realloc_collision_result_array(du_collision_result **results, int num)
{
    return (du_collision_result**)realloc(results, num * sizeof(du_collision_result*));
}

void du_store_body(du_body_id body_array[], du_body_id body_id, int index)
{
    body_array[index] = body_id;
}

void du_free(void *ptr)
{
    free(ptr);
}

/**
 * Allocate new pointer to du_body_id.
 * don't forget to release memory if not in use
 */
du_body_id *du_alloc_body_id_pointer()
{
    du_body_id *ptr = new du_body_id;
    return ptr;
}

du_body_id du_get_body_id_by_pointer(du_body_id *ptr)
{
    return *ptr;
}

float *du_vec3(float x, float y, float z) {
    float *vec3 = du_alloc_float_array(3);

    vec3[0] = x;
    vec3[1] = y;
    vec3[2] = z;

    return vec3;
}

float *du_quat4(float x, float y, float z, float w)
{
    float *quat4 = du_alloc_float_array(4);

    quat4[0] = x;
    quat4[1] = y;
    quat4[2] = z;
    quat4[3] = w;

    return quat4;
}

float *du_array6(float el0, float el1, float el2, float el3, float el4, float el5)
{
    float *arr = du_alloc_float_array(6);

    arr[0] = el0;
    arr[1] = el1;
    arr[2] = el2;
    arr[3] = el3;
    arr[4] = el4;
    arr[5] = el5;

    return arr;
}

du_world_id du_get_active_world()
{
    return _active_world;
}

duWorld* get_active_world()
{
    return reinterpret_cast <duWorld*>(_active_world);
}

du_body_id du_create_static_mesh_body(int indices_len, int *indices, 
        int positions_len, float *positions, float *trans, float friction, 
        float restitution) 
{
    btCollisionShape *shape = create_mesh_shape(indices_len, indices, 
            positions_len, positions);

    btTransform gtrans;
    gtrans.setIdentity();
    gtrans.setOrigin(btVector3(trans[0], trans[1], trans[2]));
    // NOTE: no rotation

    float mass = 0;
    btVector3 loc_iner(0, 0, 0);

    btRigidBody::btRigidBodyConstructionInfo cinfo(mass, NULL, shape, loc_iner);
    btRigidBody* body = new btRigidBody(cinfo);

    body->setFriction(friction);
    body->setRestitution(restitution);
    body->setWorldTransform(gtrans);

    return reinterpret_cast <du_body_id>(body);
}

btCollisionShape *create_mesh_shape(int indices_len, int *indices, 
        int positions_len, float *positions)
{

    int tnum = indices_len / 3;
    int plen = positions_len / 3;

    btStridingMeshInterface *tmesh = new btTriangleIndexVertexArray(tnum, 
            indices, 3*sizeof(int), plen, positions, 3*sizeof(float));
    
    // seems useQuantizedAabbCompression=false performs better
    btCollisionShape *shape = new btBvhTriangleMeshShape(tmesh, false, true);

    return shape;
}

du_body_id du_create_ghost_mesh_body(int indices_len, int *indices,
        int positions_len, float *positions, float *trans) 
{

    btCollisionShape *shape = create_mesh_shape(indices_len, indices,
            positions_len, positions);

    btTransform gtrans;
    gtrans.setIdentity();
    gtrans.setOrigin(btVector3(trans[0], trans[1], trans[2]));

    btCollisionObject *body = new btGhostObject();
    body->setWorldTransform(gtrans);
    body->setCollisionShape(shape);
    body->setCollisionFlags(btCollisionObject::CF_NO_CONTACT_RESPONSE);

    return reinterpret_cast <du_body_id>(body);
}

du_shape_id du_create_box_shape(float ext_x, float ext_y, float ext_z,
        float cm_x, float cm_y, float cm_z)
{

    btCollisionShape *box = new btBoxShape(btVector3(ext_x, ext_y, ext_z));
    box = consider_compound(box, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(box);
}

du_shape_id du_create_compound()
{
    btCompoundShape *compound = new btCompoundShape();
    return reinterpret_cast <du_shape_id>(compound);
}

void du_compound_add_child(du_shape_id du_shape, float *trans, float *quat, du_shape_id du_child_shape)
{
    btCompoundShape *shape = reinterpret_cast <btCompoundShape*>(du_shape);
    btCollisionShape *child_shape = reinterpret_cast <btCollisionShape*>(du_child_shape);

    btTransform offset;
    offset.setIdentity();
    offset.setOrigin(btVector3(trans[0], trans[1], trans[2]));

    if (quat)
        offset.setRotation(btQuaternion(quat[0], quat[1], quat[2], quat[3]));

    shape->addChildShape(offset, child_shape);
}

btCollisionShape *consider_compound(btCollisionShape *shape,
        float cm_x, float cm_y, float cm_z)
{
    // center of mass is different from object translation
    if (fabs(cm_x) > COMPOUND_THRESHOLD ||
            fabs(cm_y) > COMPOUND_THRESHOLD ||
            fabs(cm_z) > COMPOUND_THRESHOLD) {

        btCompoundShape *compound = new btCompoundShape();

        btTransform offset;
        offset.setIdentity();
        offset.setOrigin(btVector3(cm_x, cm_y, cm_z));

        compound->addChildShape(offset, shape);
        return static_cast <btCollisionShape*>(compound);
    } else
        return shape;
}

du_shape_id du_create_cylinder_shape(float ext_x, float ext_y, float ext_z,
        float cm_x, float cm_y, float cm_z)
{

    btCollisionShape *cyl = new btCylinderShape(btVector3(ext_x, ext_y, ext_z));
    cyl = consider_compound(cyl, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(cyl);
}

du_shape_id du_create_cone_shape(float radius, float height,
        float cm_x, float cm_y, float cm_z)
{

    btCollisionShape *con = new btConeShape(radius, height);
    con = consider_compound(con, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(con);
}

du_shape_id du_create_sphere_shape(float radius, float cm_x, float cm_y,
        float cm_z)
{
    btCollisionShape *sph = new btSphereShape(radius);
    sph = consider_compound(sph, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(sph);
}

du_shape_id du_create_capsule_shape(float radius, float height,
        float cm_x, float cm_y, float cm_z)
{
    btCollisionShape *cap = new btCapsuleShape(radius, height);
    cap = consider_compound(cap, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(cap);
}

du_shape_id du_create_empty_shape()
{
    btCollisionShape *empty = new btEmptyShape();
    return reinterpret_cast <du_shape_id>(empty);
}

void du_set_trans(du_body_id body, float tx, float ty, float tz)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    btMotionState *mstate = get_motion_state(bt_obj);

    btTransform transform;
    if (mstate)
        mstate->getWorldTransform(transform);
    else
        transform = bt_obj->getWorldTransform();

    transform.setOrigin(btVector3(tx, ty, tz));

    // always set object transform since motion state may also be initialized
    // from that value during addition to world (enable_simulation)
    bt_obj->setWorldTransform(transform);

    if (mstate)
        mstate->setWorldTransform(transform);
}

void du_set_quat(du_body_id body, float qx, float qy, float qz, float qw)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    btMotionState *mstate = get_motion_state(bt_obj);

    btTransform transform;
    if (mstate)
        mstate->getWorldTransform(transform);
    else
        transform = bt_obj->getWorldTransform();

    transform.setRotation(btQuaternion(qx, qy, qz, qw));

    bt_obj->setWorldTransform(transform);

    if (mstate)
        mstate->setWorldTransform(transform);
}

void du_set_trans_quat(du_body_id body, float tx, float ty, float tz,
        float qx, float qy, float qz, float qw)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    btMotionState *mstate = get_motion_state(bt_obj);

    btTransform transform;
    transform.setIdentity();
    transform.setOrigin(btVector3(tx, ty, tz));
    transform.setRotation(btQuaternion(qx, qy, qz, qw));

    bt_obj->setWorldTransform(transform);

    if (mstate)
        mstate->setWorldTransform(transform);
}

void du_get_trans(du_body_id body, float *dest)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btMotionState *mstate = get_motion_state(bt_obj);
    btTransform transform;
    if (mstate)
        mstate->getWorldTransform(transform);
    else
        transform = bt_obj->getWorldTransform();

    btVector3 origin = transform.getOrigin();

    dest[0] = origin.x();
    dest[1] = origin.y();
    dest[2] = origin.z();
}

void du_get_trans_quat(du_body_id body, float *dest_trans, float* dest_quat)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btMotionState *mstate = get_motion_state(bt_obj);
    btTransform transform;
    if (mstate)
        mstate->getWorldTransform(transform);
    else
        transform = bt_obj->getWorldTransform();

    btVector3 origin = transform.getOrigin();

    dest_trans[0] = origin.x();
    dest_trans[1] = origin.y();
    dest_trans[2] = origin.z();

    btQuaternion rotation = transform.getRotation();

    dest_quat[0] = rotation.x();
    dest_quat[1] = rotation.y();
    dest_quat[2] = rotation.z();
    dest_quat[3] = rotation.w();
}

/**
 * NOTE: Always returns NULL since all motion states was disabled
 */
btMotionState *get_motion_state(btCollisionObject *obj)
{
    btRigidBody* body = btRigidBody::upcast(obj);

    if (body && body->getMotionState())
        return body->getMotionState();
    else
        return NULL;
}

void du_get_interp_data(du_body_id body, float *dest_trans, float* dest_quat,
        float *dest_linvel, float *dest_angvel)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btTransform transform = bt_obj->getInterpolationWorldTransform();

    btVector3 origin = transform.getOrigin();

    dest_trans[0] = origin.x();
    dest_trans[1] = origin.y();
    dest_trans[2] = origin.z();

    btQuaternion rotation = transform.getRotation();

    dest_quat[0] = rotation.x();
    dest_quat[1] = rotation.y();
    dest_quat[2] = rotation.z();
    dest_quat[3] = rotation.w();

    btVector3 lin_vel = bt_obj->getInterpolationLinearVelocity();
    dest_linvel[0] = lin_vel.x();
    dest_linvel[1] = lin_vel.y();
    dest_linvel[2] = lin_vel.z();

    btVector3 ang_vel = bt_obj->getInterpolationAngularVelocity();
    dest_angvel[0] = ang_vel.x();
    dest_angvel[1] = ang_vel.y();
    dest_angvel[2] = ang_vel.z();
}

du_body_id du_create_dynamic_bounding_body(du_shape_id shape, float mass, 
        float *trans, float *quat, float damping, float rotation_damping, 
        float size, float ang_fact_x, float ang_fact_y, float ang_fact_z, 
        float friction, float restitution) 
{
    btCollisionShape *bt_shape = reinterpret_cast <btCollisionShape*>(shape);
    btVector3 loc_iner(0, 0, 0);

    btTransform transform;
    transform.setIdentity();
    transform.setOrigin(btVector3(trans[0], trans[1], trans[2]));
    if (quat) 
        transform.setRotation(btQuaternion(quat[0], quat[1], quat[2], quat[3]));

    if (mass > 0)
        bt_shape->calculateLocalInertia(mass, loc_iner);

    btRigidBody::btRigidBodyConstructionInfo cinfo(mass, NULL, bt_shape, loc_iner);
    btRigidBody* body = new btRigidBody(cinfo);

    body->setSleepingThresholds(LINEAR_SLEEPING_THRESHOLD, 
            ANGULAR_SLEEPING_THRESHOLD);
    body->setDamping(damping, rotation_damping);
    body->setAngularFactor(btVector3(ang_fact_x, ang_fact_y, ang_fact_z));

    body->setFriction(friction);
    body->setRestitution(restitution);

    // Enable CCD for small objects
    if (size < CCD_SIZE_THRESHOLD) {
        body->setCcdMotionThreshold(0.04);
        body->setCcdSweptSphereRadius(size * 0.5);
    }

    body->setWorldTransform(transform);

    return reinterpret_cast <du_body_id>(body);
}

du_body_id du_create_ghost_bounding_body(du_shape_id shape, float *trans,
        float *quat) 
{
    btCollisionObject *body = new btGhostObject();

    btCollisionShape *bt_shape = reinterpret_cast <btCollisionShape*>(shape);
    body->setCollisionShape(bt_shape);

    body->setCollisionFlags(btCollisionObject::CF_NO_CONTACT_RESPONSE);

    btTransform transform;
    transform.setIdentity();
    transform.setOrigin(btVector3(trans[0], trans[1], trans[2]));
    if (quat) 
        transform.setRotation(btQuaternion(quat[0], quat[1], quat[2], quat[3]));
    body->setWorldTransform(transform);

    return reinterpret_cast <du_body_id>(body);
}


int du_pre_simulation(du_world_id world, float time_step, float max_sub_steps,
        float fixed_time_step)
{
    duWorld *bt_world = reinterpret_cast <duWorld*>(world);
    return bt_world->preSimulation(time_step, max_sub_steps, fixed_time_step);
}

float du_calc_sim_time(du_world_id world, float timeline, int step,
        int clamped_simulation_steps)
{
    duWorld *bt_world = reinterpret_cast <duWorld*>(world);
    return bt_world->calcSimTime(timeline, step, clamped_simulation_steps);
}

void du_single_step_simulation(du_world_id world, float sim_time)
{
    duWorld *bt_world = reinterpret_cast <duWorld*>(world);
    bt_world->singleStepSimulation(sim_time);
}

void du_post_simulation(du_world_id world)
{
    duWorld *bt_world = reinterpret_cast <duWorld*>(world);
    bt_world->postSimulation();
}

du_cons_id du_create_generic_6dof_constraint(du_body_id body_a, 
        float *trans_in_a, float *quat_in_a, 
        du_body_id body_b, float *trans_in_b, float *quat_in_b)
{
    btRigidBody *bt_body_a = reinterpret_cast <btRigidBody*>(body_a);
    btTransform bt_frame_in_a;
    set_transform(&bt_frame_in_a, trans_in_a, quat_in_a);

    btRigidBody *bt_body_b = reinterpret_cast <btRigidBody*>(body_b);
    btTransform bt_frame_in_b;
    set_transform(&bt_frame_in_b, trans_in_b, quat_in_b);

    btTypedConstraint *cons = new btGeneric6DofConstraint(*bt_body_a, *bt_body_b, 
            bt_frame_in_a, bt_frame_in_b, true);

    return reinterpret_cast <du_cons_id>(cons);
}

void set_transform(btTransform *transform, float *trans, float *quat)
{
    transform->setIdentity();

    float tx = trans[0];
    float ty = trans[1];
    float tz = trans[2];
    transform->setOrigin(btVector3(tx, ty, tz));

    if (quat) {
        float qx = quat[0];
        float qy = quat[1];
        float qz = quat[2];
        float qw = quat[3];

        transform->setRotation(btQuaternion(qx, qy, qz, qw));
    }
}

du_cons_id du_create_generic_6dof_spring_constraint(du_body_id body_a, 
        float *trans_in_a, float *quat_in_a, du_body_id body_b,
        float *trans_in_b, float *quat_in_b, float *stiffness, float *damping)
{
    btRigidBody *bt_body_a = reinterpret_cast <btRigidBody*>(body_a);
    btTransform bt_frame_in_a;
    set_transform(&bt_frame_in_a, trans_in_a, quat_in_a);

    btRigidBody *bt_body_b = reinterpret_cast <btRigidBody*>(body_b);
    btTransform bt_frame_in_b;
    set_transform(&bt_frame_in_b, trans_in_b, quat_in_b);

    btGeneric6DofSpringConstraint *cons =
            new btGeneric6DofSpringConstraint(*bt_body_a, *bt_body_b,
                    bt_frame_in_a, bt_frame_in_b, true);

    for (int i = 0; i < 6; i++) {
        cons->enableSpring(i, true);
        cons->setStiffness(i, *(stiffness + i));
        cons->setDamping(i, *(damping + i));
    }

    //cons->setEquilibriumPoint();

    return reinterpret_cast <du_cons_id>(cons);
}

du_cons_id du_create_hinge_constraint(du_body_id body_a, 
        float *trans_in_a, float *quat_in_a, 
        du_body_id body_b, float *trans_in_b, float *quat_in_b)
{

    btRigidBody *bt_body_a = reinterpret_cast <btRigidBody*>(body_a);
    btTransform bt_frame_in_a;
    set_transform(&bt_frame_in_a, trans_in_a, quat_in_a);

    btRigidBody *bt_body_b = reinterpret_cast <btRigidBody*>(body_b);
    btTransform bt_frame_in_b;
    set_transform(&bt_frame_in_b, trans_in_b, quat_in_b);

    btTypedConstraint *cons = new btHingeConstraint(*bt_body_a, *bt_body_b, 
            bt_frame_in_a, bt_frame_in_b, true);

    return reinterpret_cast <du_cons_id>(cons);
}


du_cons_id du_create_point2point_constraint(du_body_id body_a, float *trans_in_a, 
        du_body_id body_b, float *trans_in_b)
{
    btRigidBody *bt_body_a = reinterpret_cast <btRigidBody*>(body_a);
    btVector3 bt_trans_a(trans_in_a[0], trans_in_a[1], trans_in_a[2]);

    btRigidBody *bt_body_b = reinterpret_cast <btRigidBody*>(body_b);
    btVector3 bt_trans_b(trans_in_b[0], trans_in_b[1], trans_in_b[2]);

    btTypedConstraint *cons = new btPoint2PointConstraint(*bt_body_a, *bt_body_b, 
            bt_trans_a, bt_trans_b);

    return reinterpret_cast <du_cons_id>(cons);
}

du_cons_id du_create_cone_twist_constraint(du_body_id body_a, 
        float *trans_in_a, float *quat_in_a, 
        du_body_id body_b, float *trans_in_b, float *quat_in_b)
{

    btRigidBody *bt_body_a = reinterpret_cast <btRigidBody*>(body_a);
    btTransform bt_frame_in_a;
    set_transform(&bt_frame_in_a, trans_in_a, quat_in_a);

    btRigidBody *bt_body_b = reinterpret_cast <btRigidBody*>(body_b);
    btTransform bt_frame_in_b;
    set_transform(&bt_frame_in_b, trans_in_b, quat_in_b);

    btTypedConstraint *cons = new btConeTwistConstraint(*bt_body_a, *bt_body_b, 
            bt_frame_in_a, bt_frame_in_b);

    return reinterpret_cast <du_cons_id>(cons);
}

void du_set_generic_6dof_limit(du_cons_id cons, int axis, float low, float high)
{
    btGeneric6DofConstraint *bt_cons = reinterpret_cast <btGeneric6DofConstraint*>(cons);
    bt_cons->setLimit(axis, low, high);
}

void du_set_hinge_limit(du_cons_id cons, float low, float high)
{
    btHingeConstraint *bt_cons = reinterpret_cast <btHingeConstraint*>(cons);
    bt_cons->setLimit(low, high);
}

// no limits for Point2Point constraint

void du_set_cone_twist_limit(du_cons_id cons, int limit_index, float limit_value)
{
    btConeTwistConstraint *bt_cons = reinterpret_cast <btConeTwistConstraint*>(cons);
    bt_cons->setLimit(limit_index, limit_value);
}

void du_set_constraint_param(du_cons_id cons, int num, float value, int axis)
{
    btTypedConstraint *bt_cons = reinterpret_cast <btTypedConstraint*>(cons);
    bt_cons->setParam(num, value, axis);
}

/**
 * constant
 */
int du_cons_param_stop_cfm()
{
    return BT_CONSTRAINT_STOP_CFM;
}   
/**
 * constant
 */
int du_cons_param_stop_erp() {
    return BT_CONSTRAINT_STOP_ERP;
}

void du_add_constraint(du_cons_id cons, bool disable_linked_collisions)
{
    duWorld *world = get_active_world();
    btTypedConstraint *bt_cons = reinterpret_cast <btTypedConstraint*>(cons);
    world->addConstraint(bt_cons, disable_linked_collisions);
}

void du_remove_constraint(du_cons_id cons)
{
    duWorld *world = get_active_world();
    btTypedConstraint *bt_cons = reinterpret_cast <btTypedConstraint*>(cons);
    world->removeConstraint(bt_cons);
}

du_vehicle_tuning_id du_create_vehicle_tuning(float suspensionCompression, 
                                              float suspensionStiffness,
                                              float suspensionDamping,
                                              float wheelFriction,
                                              float maxSuspensionTravelCm)
{
    btRaycastVehicle::btVehicleTuning *tuning = 
            new btRaycastVehicle::btVehicleTuning();
    
    tuning->m_suspensionStiffness = suspensionStiffness;
    tuning->m_suspensionDamping = suspensionDamping;
    tuning->m_suspensionCompression = suspensionCompression;
    tuning->m_frictionSlip = wheelFriction;
    tuning->m_maxSuspensionTravelCm = maxSuspensionTravelCm; 
    
    return reinterpret_cast <du_vehicle_tuning_id>(tuning);
}

du_vehicle_id du_create_vehicle(du_body_id chassis, du_vehicle_tuning_id tuning)
{
    btRaycastVehicle::btVehicleTuning *bt_tuning = reinterpret_cast 
            <btRaycastVehicle::btVehicleTuning*>(tuning);

    btRigidBody *bt_chassis = reinterpret_cast <btRigidBody*>(chassis);

    duWorld *world = get_active_world();
    btVehicleRaycaster *raycaster = new btDefaultVehicleRaycaster(world);

    btRaycastVehicle *vehicle = new btRaycastVehicle(*bt_tuning, bt_chassis,
            raycaster);

    vehicle->setCoordinateSystem(0, 1, 2);

    return reinterpret_cast <du_vehicle_id>(vehicle);
}

du_boat_id du_create_boat(du_body_id hull, float float_factor,
                          float water_lin_damp, float water_rot_damp)
{
    btRigidBody *du_hull = reinterpret_cast <btRigidBody*>(hull);

    duBoat *boat = new duBoat(du_hull, float_factor,
                              water_lin_damp, water_rot_damp);

    boat->setCoordinateSystem(0, 1, 2);

    return reinterpret_cast <du_boat_id>(boat);
}

du_floater_id du_create_floater(du_body_id body, float float_factor, 
                                float water_lin_damp, float water_rot_damp)
{
    btRigidBody *du_floater = reinterpret_cast <btRigidBody*>(body);

    duFloatingBody *floater = new duFloatingBody(du_floater,
                                  float_factor, water_lin_damp, water_rot_damp);

    return reinterpret_cast <du_floater_id>(floater);
}

du_water_id du_create_water(btScalar waterLevel)
{
    duWater* du_water = new duWater(waterLevel);
    return reinterpret_cast <du_water_id>(du_water);
}

void du_add_water_wrapper(du_water_id water, float dst_noise_scale0,
                            float dst_noise_scale1, float dst_noise_freq0,
                            float dst_noise_freq1, float dir_min_shore_fac,
                            float dir_freq, float dir_noise_scale,
                            float dir_noise_freq, float dir_min_noise_fac,
                            float dst_min_fac, float waves_hor_fac,
                            float size_x, float size_z, float center_x,
                            float center_z, float max_shore_dist,
                            float waves_height, float waves_length,
                            float shoremap_tex_size, float* shore_dist_array)
{
    duWaterDynInfo* di = new duWaterDynInfo();

    di->dst_noise_scale0  = dst_noise_scale0;
    di->dst_noise_scale1  = dst_noise_scale1;
    di->dst_noise_freq0   = dst_noise_freq0;
    di->dst_noise_freq1   = dst_noise_freq1;
    di->dir_min_shore_fac = dir_min_shore_fac;
    di->dir_freq          = dir_freq;
    di->dir_noise_scale   = dir_noise_scale;
    di->dir_noise_freq    = dir_noise_freq;
    di->dir_min_noise_fac = dir_min_noise_fac;
    di->dst_min_fac       = dst_min_fac;
    di->waves_hor_fac     = waves_hor_fac;

    duWater* du_water = reinterpret_cast <duWater*>(water);

    du_water->appendWrapper(di, shore_dist_array, size_x, size_z,
                 center_x, center_z, max_shore_dist, waves_height,
                 waves_length, shoremap_tex_size);
}

void du_set_water_time(du_water_id water, float time)
{
    duWater* du_water = reinterpret_cast<duWater*>(water);
    du_water->setWaterTime(time);
}

du_character_id du_create_character(du_body_id character,
                                    float angle, float height, float walkSpeed,
                                    float runSpeed, float stepHeight, 
                                    float jumpStrength, float waterLine,
                                    short collisionGroup, short collisionMask)
{
    btRigidBody *du_char_body = reinterpret_cast <btRigidBody*>(character);

    duCharacter *du_character = new duCharacter(du_char_body, angle, height,
                                                walkSpeed, runSpeed, stepHeight,
                                                jumpStrength, waterLine,
                                                collisionGroup, collisionMask);

    return reinterpret_cast <du_character_id>(du_character);
}

void du_vehicle_add_wheel(du_vehicle_id vehicle, du_vehicle_tuning_id tuning,
        float *conn_point, float susp_rest_len, float rollInfluence, float radius,
        bool front)
{
    btRaycastVehicle *bt_vehicle = reinterpret_cast <btRaycastVehicle*>(vehicle);
    btRaycastVehicle::btVehicleTuning *bt_tuning = reinterpret_cast 
            <btRaycastVehicle::btVehicleTuning*>(tuning);

    btVector3 conn_point_cs0(conn_point[0], conn_point[1], conn_point[2]);
    btVector3 wheel_dir_cs0( 0,-1, 0);
    btVector3 wheel_axle_cs(-1, 0, 0);

    bt_vehicle->addWheel(conn_point_cs0, wheel_dir_cs0, wheel_axle_cs, 
            susp_rest_len, radius, *bt_tuning, front);

    int num_wheels = bt_vehicle->getNumWheels();
    btWheelInfo &wheel = bt_vehicle->getWheelInfo(num_wheels - 1);
    wheel.m_rollInfluence = rollInfluence;
}

void du_boat_add_bob(du_boat_id boat, float *conn_point)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);

    btVector3 conn_point_cs0(conn_point[0], conn_point[1], conn_point[2]);

    du_boat->addBob(conn_point_cs0);
}

void du_floating_body_add_bob(du_floater_id floater, float *conn_point)
{
    duFloatingBody *du_floater = reinterpret_cast <duFloatingBody*>(floater);

    btVector3 conn_point_cs0(conn_point[0], conn_point[1], conn_point[2]);

    du_floater->addBob(conn_point_cs0);
}

void du_floater_set_water(du_floater_id floater, du_water_id water)
{
    duFloatingBody *du_floater = reinterpret_cast <duFloatingBody*>(floater);
    duWater *du_water = reinterpret_cast<duWater*>(water);
    du_floater->setWater(du_water);
}

void du_character_set_water(du_character_id character, du_water_id water)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    duWater *du_water = reinterpret_cast<duWater*>(water);
    du_character->setWater(du_water);
}

void du_boat_set_water(du_boat_id boat, du_water_id water)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);
    duWater *du_water = reinterpret_cast<duWater*>(water);
    du_boat->setWater(du_water);
}

void du_floater_set_water_wrapper_ind(du_floater_id floater, int index)
{
    duFloatingBody *du_floater = reinterpret_cast <duFloatingBody*>(floater);
    du_floater->setWaterWrapperInd(index);
}

void du_character_set_water_wrapper_ind(du_character_id character, int index)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setWaterWrapperInd(index);
}

void du_boat_set_water_wrapper_ind(du_boat_id boat, int index)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);
    du_boat->setWaterWrapperInd(index);
}

void du_check_collisions(du_collision_result **results, int size)
{

    du_reset_collision_results(results, size);

    duWorld *world = get_active_world();
    btDispatcher *dispatcher = world->getDispatcher();

    int num_manifolds = dispatcher->getNumManifolds();

    for (int i = 0; i < num_manifolds; i++) {
        btPersistentManifold *contactManifold = 
                dispatcher->getManifoldByIndexInternal(i);

        int num_contacts = contactManifold->getNumContacts();

        for (int j = 0; j < num_contacts; j++) {
            du_set_collision_result(results, size, contactManifold, j);
        }
    }
}

void du_reset_collision_results(du_collision_result **results, int results_size)
{
    for (int i = 0; i < results_size; i++)
        results[i]->is_in_contact = false;
}

void du_set_collision_result(du_collision_result **results, int size,
                             btPersistentManifold *contactManifold,
                             int point_ind)
{
    btManifoldPoint &pt = contactManifold->getContactPoint(point_ind);

    if (pt.getDistance() < COLLISION_MIN_DISTANCE) {

        btCollisionObject *bt_body_a_m =
                    const_cast<btCollisionObject*>(contactManifold->getBody0());
        btCollisionObject *bt_body_b_m =
                    const_cast<btCollisionObject*>(contactManifold->getBody1());

        du_body_id du_body_a = reinterpret_cast<du_body_id>(bt_body_a_m);
        du_body_id du_body_b = reinterpret_cast<du_body_id>(bt_body_b_m);

        int id = du_get_collision_result_ind(results, size, du_body_a, du_body_b);

        if (id != -1) {
            results[id]->is_in_contact = true;

            const btVector3 &pt_a = pt.getPositionWorldOnA();
            results[id]->contact_point[0] = pt_a.x();
            results[id]->contact_point[1] = pt_a.y();
            results[id]->contact_point[2] = pt_a.z();
        }
    }
}

float du_check_collision_impulse(du_body_id du_body)
{
    btCollisionObject *bt_body = reinterpret_cast <btCollisionObject*>(du_body);

    duWorld *world = get_active_world();
    btDispatcher *dispatcher = world->getDispatcher();

    int num_manifolds = dispatcher->getNumManifolds();

    float max_impulse = 0.0;

    for (int i = 0; i < num_manifolds; i++) {
        btPersistentManifold *contactManifold = 
                dispatcher->getManifoldByIndexInternal(i);

        const btCollisionObject *bt_body_a_m = 
                static_cast<const btCollisionObject*>(contactManifold->getBody0());
        const btCollisionObject *bt_body_b_m = 
                static_cast<const btCollisionObject*>(contactManifold->getBody1());

        int num_contacts = contactManifold->getNumContacts();
        for (int j = 0; j < num_contacts; j++) {
            btManifoldPoint &pt = contactManifold->getContactPoint(j);
            if (pt.getDistance() < COLLISION_MIN_DISTANCE &&
                    (bt_body == bt_body_a_m || bt_body == bt_body_b_m)) {
                max_impulse = max_impulse + pt.getAppliedImpulse();
            }
        }
    }

    return max_impulse;
}

class ClosestArrayRayResultCallback : public btCollisionWorld::RayResultCallback
{
public:
    ClosestArrayRayResultCallback(btCollisionObject **body_arr, int body_num)
    {
        m_body_arr = body_arr;
        m_body_num = body_num;
    }

    virtual btScalar addSingleResult(btCollisionWorld::LocalRayResult &rayResult, 
            bool normalInWorldSpace)
    {

        for (int i = 0; i < m_body_num; i++) {
            btCollisionObject *body = m_body_arr[i];

            if (body == rayResult.m_collisionObject) {
                m_closestHitFraction = rayResult.m_hitFraction;
                m_collisionObject = rayResult.m_collisionObject;

                // ignore hit normal/point
                
                return rayResult.m_hitFraction;
            }
        }

        return 1.0;
    }
protected:
    btCollisionObject **m_body_arr;
    int m_body_num;
};

float du_check_ray_hit(du_body_id du_body_a, float *from, float *to, bool local,
        du_body_id du_body_b_arr[], int du_body_b_num, du_body_id *du_body_b_hit_ptr)
{
    duWorld *world = get_active_world();

    btCollisionObject *bt_body_a = reinterpret_cast <btCollisionObject*>(du_body_a);
    btCollisionObject **bt_body_b_arr = reinterpret_cast <btCollisionObject**>(du_body_b_arr);

    btVector3 bt_from(from[0], from[1], from[2]);
    btVector3 bt_to(to[0], to[1], to[2]);

    btVector3 bt_from_w, bt_to_w;

    if (local) {
        // offsets in local space of A
        bt_from_w = bt_body_a->getWorldTransform() * bt_from;
        bt_to_w = bt_body_a->getWorldTransform() * bt_to;
    } else {
        // offsets in world space
        btTransform transform = bt_body_a->getWorldTransform();
        btVector3 origin = transform.getOrigin();

        bt_from_w = origin + bt_from;
        bt_to_w = origin + bt_to;
    }

    ClosestArrayRayResultCallback ray_cb(bt_body_b_arr, du_body_b_num);
    world->rayTest(bt_from_w, bt_to_w, ray_cb);

    if (ray_cb.hasHit()) {
        *du_body_b_hit_ptr = (du_body_id)ray_cb.m_collisionObject;
        return ray_cb.m_closestHitFraction;
    } else {
        *du_body_b_hit_ptr = NULL;
        return 1.0;
    }
}

void du_add_body(du_body_id body, int collision_group, int collision_mask)
{
    duWorld *world = get_active_world();

    btCollisionObject *bt_colobj = reinterpret_cast <btCollisionObject*>(body);
    btRigidBody *bt_body = btRigidBody::upcast(bt_colobj);

    if (!collision_group)
        collision_group = btBroadphaseProxy::DefaultFilter;
    if (!collision_mask)
        collision_mask = btBroadphaseProxy::AllFilter;

    if (bt_body)
        world->addRigidBody(bt_body, collision_group, collision_mask);
    else
        world->addCollisionObject(bt_colobj, collision_group, collision_mask);
}

void du_remove_body(du_body_id body)
{
    duWorld *world = get_active_world();

    btCollisionObject *obj = reinterpret_cast <btCollisionObject*>(body);
    // works for btRigidBody too
    world->removeCollisionObject(obj);
}

void du_add_action(du_action_id action)
{
    duWorld *world = get_active_world();
    world->addAction(reinterpret_cast <btActionInterface*>(action));
}

void du_remove_action(du_action_id action)
{
    duWorld *world = get_active_world();
    world->removeAction(reinterpret_cast <btActionInterface*>(action));
}

void du_activate(du_body_id body)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->activate();
}
void du_disable_deactivation(du_body_id body)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->setActivationState(DISABLE_DEACTIVATION);
}
void du_set_linear_velocity(du_body_id body, float vx, float vy, float vz)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->setLinearVelocity(btVector3(vx, vy, vz));
}
void du_apply_central_force(du_body_id body, float fx, float fy, float fz)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->clearForces();
    bt_body->applyCentralForce(btVector3(fx, fy, fz));
}
void du_apply_torque(du_body_id body, float tx, float ty, float tz)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->applyTorque(btVector3(tx, ty, tz));
}

void du_update_vehicle_controls(du_vehicle_id vehicle, float engine_force, 
        float brake_force, float steering_value)
{
    btRaycastVehicle *bt_vehicle = reinterpret_cast <btRaycastVehicle*>(vehicle);

    bt_vehicle->applyEngineForce(engine_force, 2);
    bt_vehicle->applyEngineForce(engine_force, 3);

    bt_vehicle->setBrake(brake_force, 2);
    bt_vehicle->setBrake(brake_force, 3);

    bt_vehicle->setSteeringValue(steering_value, 0);
    bt_vehicle->setSteeringValue(steering_value, 1);
}

void du_update_boat_controls(du_boat_id boat, float engine_force, 
        float brake_force, float steering_value)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);

    du_boat->applyEngineForce(engine_force);

    du_boat->setBrake(brake_force, 0);
    du_boat->setBrake(brake_force, 1);
    du_boat->setBrake(brake_force, 2);
    du_boat->setBrake(brake_force, 3);

    du_boat->setSteeringValue(steering_value);
}

void du_get_vehicle_wheel_trans_quat(du_vehicle_id vehicle, int wheel_num, 
        float *dest_trans, float* dest_quat)
{
    btRaycastVehicle *bt_vehicle = reinterpret_cast <btRaycastVehicle*>(vehicle);

    bt_vehicle->updateWheelTransform(wheel_num, true);

    // in vehicle local space
    btTransform transform = bt_vehicle->getChassisWorldTransform().inverse() *
            bt_vehicle->getWheelTransformWS(wheel_num);

    btVector3 origin = transform.getOrigin();

    dest_trans[0] = origin.x();
    dest_trans[1] = origin.y();
    dest_trans[2] = origin.z();

    btQuaternion rotation = transform.getRotation();

    dest_quat[0] = rotation.x();
    dest_quat[1] = rotation.y();
    dest_quat[2] = rotation.z();
    dest_quat[3] = rotation.w();
}

void du_get_boat_bob_trans_quat(du_boat_id boat, int bob_num, 
        float *dest_trans, float* dest_quat)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);

    du_boat->updateBobTransform(bob_num, true);

    // in boat local space
    btTransform transform = du_boat->getHullWorldTransform().inverse() *
            du_boat->getBobTransformWS(bob_num);

    btVector3 origin = transform.getOrigin();

    dest_trans[0] = origin.x();
    dest_trans[1] = origin.y();
    dest_trans[2] = origin.z();

    btQuaternion rotation = transform.getRotation();

    dest_quat[0] = rotation.x();
    dest_quat[1] = rotation.y();
    dest_quat[2] = rotation.z();
    dest_quat[3] = rotation.w();
}

void du_get_floater_bob_trans_quat(du_floater_id floater, int bob_num, 
        float *dest_trans, float* dest_quat)
{
    duFloatingBody *du_floater = reinterpret_cast <duFloatingBody*>(floater);

    du_floater->updateBobTransform(bob_num, true);
    btTransform transform = du_floater->getBobTransformWS(bob_num);

    btVector3 origin = transform.getOrigin();

    dest_trans[0] = origin.x();
    dest_trans[1] = origin.y();
    dest_trans[2] = origin.z();

    btQuaternion rotation = transform.getRotation();

    dest_quat[0] = rotation.x();
    dest_quat[1] = rotation.y();
    dest_quat[2] = rotation.z();
    dest_quat[3] = rotation.w();
}

float du_get_vehicle_speed(du_vehicle_id vehicle)
{
    btRaycastVehicle *bt_vehicle = reinterpret_cast <btRaycastVehicle*>(vehicle);
    return bt_vehicle->getCurrentSpeedKmHour();
}

float du_get_boat_speed(du_boat_id boat)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);
    return du_boat->getCurrentSpeedKmHour();
}

float du_get_body_speed(du_body_id body)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    const btVector3 velocity = bt_body->getLinearVelocity();
    float speed_ms = velocity.length();
    float speed = speed_ms *= 3.6;
    return speed;
}

void du_set_character_move_direction(du_character_id character, int dir_x,
                                                                int dir_y,
                                                                int dir_z)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setMoveDirection(btVector3(dir_x, dir_y, dir_z));
}

void du_set_character_move_type(du_character_id character, short type)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setMoveType(type);
}

void du_set_character_walk_velocity(du_character_id character, float velocity)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setWalkVelocity(velocity);
}

void du_set_character_run_velocity(du_character_id character, float velocity)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setRunVelocity(velocity);
}

void du_set_character_fly_velocity(du_character_id character, float velocity)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setFlyVelocity(velocity);
}

void du_set_character_rotation(du_character_id character, float angle_h,
                                                          float angle_v)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setHorRotation (angle_h);
    du_character->setVertRotation(angle_v);
}

void du_set_character_hor_rotation(du_character_id character, float angle)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setHorRotation(angle);
}

void du_set_character_vert_rotation(du_character_id character, float angle)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->setVertRotation(angle);
}

void du_character_rotation_inc(du_character_id character, float h_angle,
                                                          float v_angle)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->rotate(h_angle, v_angle);
}

void du_character_jump(du_character_id character)
{
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);
    du_character->jump();
}

void du_get_character_trans_quat(du_character_id character, du_body_id body,
                                 float *dest_trans, float *dest_quat, 
                                 float *dest_linvel, float *dest_angvel)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    duCharacter *du_character = reinterpret_cast <duCharacter*>(character);

    btTransform transform = bt_obj->getInterpolationWorldTransform();

    btVector3 origin = transform.getOrigin();

    dest_trans[0] = origin.x();
    dest_trans[1] = origin.y();
    dest_trans[2] = origin.z();

    btScalar rotation_angle = du_character->getHorRotationAngle();

    float half = rotation_angle * 0.5;
    dest_quat[3] = cosf(half);
    dest_quat[0] = 0.0;
    dest_quat[1] = sinf(half);
    dest_quat[2] = 0.0;

    btVector3 lin_vel = bt_obj->getInterpolationLinearVelocity();
    dest_linvel[0] = lin_vel.x();
    dest_linvel[1] = lin_vel.y();
    dest_linvel[2] = lin_vel.z();

    btVector3 ang_vel = bt_obj->getInterpolationAngularVelocity();
    dest_angvel[0] = ang_vel.x();
    dest_angvel[1] = ang_vel.y();
    dest_angvel[2] = ang_vel.z();
}

void du_set_gravity(du_body_id body, float gravity)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->setGravity(btVector3(0, -gravity, 0));
}

void du_set_damping(du_body_id body, float damping, float rotation_damping)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->setDamping(damping, rotation_damping);
}

du_collision_result **du_add_collision_result(du_collision_result **results, int size,
                                          du_body_id du_body_a,
                                          du_body_id du_body_b)
{

    du_collision_result *new_result = new du_collision_result();

    new_result->body_a = MIN(du_body_a, du_body_b);
    new_result->body_b = MAX(du_body_a, du_body_b);
    new_result->is_in_contact = false;
    new_result->contact_point[0] = 0.0;
    new_result->contact_point[1] = 0.0;
    new_result->contact_point[2] = 0.0;

    int new_size = size + 1;
    results = du_realloc_collision_result_array(results, new_size);

    results[size] = new_result;

    du_sort_array_ascending(results, new_size);

    return results;
}

void du_sort_array_ascending(du_collision_result **arr, int size)
{
    du_collision_result *tmp;
    int gap = size;
    bool swapped = false;

    while (gap > 1 || swapped) {
        if (gap > 1)
            gap = floor(gap / COMB_SORT_JUMP_COEFF);

        swapped = false;

        for (int i = 0; gap + i < size; i ++) {
            if ((arr[i]->body_a - arr[i + gap]->body_a) > 0) {
                tmp = arr[i];
                arr[i] = arr[i + gap];
                arr[i + gap] = tmp;
                swapped = true;
            }
        }
    }
}

du_collision_result **du_remove_collision_result(du_collision_result **results,
                                                 int size, du_body_id du_body_a,
                                                 du_body_id du_body_b)
{
    int deleted_id = du_get_collision_result_ind(results, size, du_body_a, du_body_b);

    du_collision_result *deleted_collision_result = results[deleted_id];

    for (int i = deleted_id; i < size; i++)
        results[i] = results[i+1];

    free(deleted_collision_result);

    int new_size = size - 1;
    results = du_realloc_collision_result_array(results, new_size);

    return results;
}

int du_get_collision_result_ind(du_collision_result **results, int size,
                                 du_body_id du_body_a,
                                 du_body_id du_body_b)
{
    du_body_id min_du_body = MIN(du_body_a, du_body_b);
    du_body_id max_du_body = MAX(du_body_a, du_body_b);

    int id = du_bin_search_by_body(results, min_du_body, 0, size);
    if (id == -1)
        return -1;

    int searched_id = du_search_around_body_a(results, max_du_body, id);

    return searched_id;
}

int du_bin_search_by_body(du_collision_result **arr, du_body_id searched, int start,
                                                                      int end)
{
    if (end < start)
        return -1;

    int mid = start + (end - start) / 2;

    if (arr[mid]->body_a > searched)
        return du_bin_search_by_body(arr, searched, start, mid - 1);
    else if (arr[mid]->body_a < searched)
        return du_bin_search_by_body(arr, searched, mid + 1, end);
    else
        return mid;
}

int du_search_around_body_a(du_collision_result **arr, du_body_id searched,
                            int start_id)
{
    du_body_id start_body_a = arr[start_id]->body_a;

    // search left
    int id = start_id;
    while (arr[id]->body_a == start_body_a) {
        if (arr[id]->body_b == searched)
            return id;
        id--;
    }

    // search right
    id = start_id;
    while (arr[id]->body_a == start_body_a) {
        if (arr[id]->body_b == searched)
            return id;
        id++;
    }
    return -1;
}

bool du_get_collision_result(du_collision_result **results, int size,
                              du_body_id du_body_a,
                              du_body_id du_body_b,
                              float *coll_point)
{
    int id = du_get_collision_result_ind(results, size, du_body_a, du_body_b);

    coll_point[0] = results[id]->contact_point[0];
    coll_point[1] = results[id]->contact_point[1];
    coll_point[2] = results[id]->contact_point[2];

    return results[id]->is_in_contact;
}


#ifdef __cplusplus
}
#endif

/* vim: set et ts=4 sw=4: */
