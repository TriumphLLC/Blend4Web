//#include <emscripten.h>
#include <stdio.h>
#include <btBulletDynamicsCommon.h>
#include <BulletCollision/CollisionDispatch/btGhostObject.h>
#include "duCharacter.h" 
#include "duBoat.h" 
#include "duFloatingBody.h" 
#include "duWater.h" 
#include "duWorld.h" 

#include "bindings.h"

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

static btCollisionShape *consider_compound(btCollisionShape *shape, 
        float cm_x, float cm_y, float cm_z);
static void delete_shape(btCollisionShape *shape);
static void set_transform(btTransform *transform, float *trans, float *quat);
static int get_collision_id(btCollisionObject *obj);

static duWorld *_world = NULL;

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize a new dynamics world
 */
void du_create_world()
{
    btBroadphaseInterface *broadphase;
    btConstraintSolver *csolver;
    btDefaultCollisionConfiguration *cconf;
    btCollisionDispatcher *dispatcher;

    broadphase = new btDbvtBroadphase();
    csolver = new btSequentialImpulseConstraintSolver();
    cconf = new btDefaultCollisionConfiguration();
    dispatcher = new btCollisionDispatcher(cconf);

    _world = new duWorld(dispatcher, broadphase, csolver, cconf);
    _world->setGravity(btVector3(0, 0, -10));
}

void du_cleanup_world()
{
    int i;

    for (i = _world->getNumConstraints() - 1; i >= 0; i--) {
        btTypedConstraint* cons = _world->getConstraint(i);
        _world->removeConstraint(cons);
        delete cons;
    }

    for (i = _world->getNumCollisionObjects() - 1; i >= 0; i--) {
        btCollisionObject* obj = _world->getCollisionObjectArray()[i];
        btRigidBody* body = btRigidBody::upcast(obj);

        delete_shape(obj->getCollisionShape());

        // works for btRigidBody too
        _world->removeCollisionObject(obj);
        delete obj;
    }

    // TODO: remove ActionInterfaces (Vehicles)

    btBroadphaseInterface *broadphase = _world->getBroadphase();
    btConstraintSolver *csolver = _world->getConstraintSolver();
    btCollisionDispatcher *dispatcher = static_cast <btCollisionDispatcher*>(_world->getDispatcher());
    btCollisionConfiguration *cconf = dispatcher->getCollisionConfiguration();

    // delete in reverse order
    delete _world;

    delete dispatcher;
    delete cconf;
    delete csolver;
    delete broadphase;

    _world = NULL;
}

/**
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

float *du_create_float_pointer(float init_value) {
    float *num = du_alloc_float_array(1);
    *num = init_value;
    return num;
}

du_vec3 du_create_vec3(float x, float y, float z) {
    float *vec3 = du_alloc_float_array(3);

    vec3[0] = x;
    vec3[1] = y;
    vec3[2] = z;

    return vec3;
}

du_quat du_create_quat(float x, float y, float z, float w)
{
    float *quat4 = du_alloc_float_array(4);

    quat4[0] = x;
    quat4[1] = y;
    quat4[2] = z;
    quat4[3] = w;

    return quat4;
}

float *du_create_array6(float el0, float el1, float el2, float el3, float el4, float el5)
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

du_body_id du_create_static_mesh_body(du_shape_id shape, float *trans,
        float friction, float restitution) 
{
    btCollisionShape *bt_shape = reinterpret_cast <btCollisionShape*>(shape);

    btTransform gtrans;
    gtrans.setIdentity();
    gtrans.setOrigin(btVector3(trans[0], trans[1], trans[2]));
    // NOTE: no rotation

    float mass = 0;
    btVector3 loc_iner(0, 0, 0);

    btRigidBody::btRigidBodyConstructionInfo cinfo(mass, NULL, bt_shape, loc_iner);
    btRigidBody* body = new btRigidBody(cinfo);

    body->setFriction(friction);
    body->setRestitution(restitution);
    body->setWorldTransform(gtrans);

    return reinterpret_cast <du_body_id>(body);
}

du_shape_id du_create_mesh_shape(int indices_len, int *indices, 
        int positions_len, float *positions)
{

    int tnum = indices_len / 3;
    int plen = positions_len / 3;

    btStridingMeshInterface *tmesh = new btTriangleIndexVertexArray(tnum, 
            indices, 3*sizeof(int), plen, positions, 3*sizeof(float));
    
    // seems useQuantizedAabbCompression=false performs better
    btCollisionShape *shape = new btBvhTriangleMeshShape(tmesh, false, true);

    return reinterpret_cast <du_shape_id>(shape);
}

du_body_id du_create_ghost_mesh_body(du_shape_id shape, float *trans) 
{
    btCollisionShape *bt_shape = reinterpret_cast <btCollisionShape*>(shape);

    btTransform gtrans;
    gtrans.setIdentity();
    gtrans.setOrigin(btVector3(trans[0], trans[1], trans[2]));

    btCollisionObject *body = new btGhostObject();
    body->setWorldTransform(gtrans);
    body->setCollisionShape(bt_shape);
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

void du_compound_append_child(du_shape_id du_shape, float *trans, float *quat, du_shape_id du_child_shape)
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

    btCollisionShape *cyl = new btCylinderShapeZ(btVector3(ext_x, ext_y, ext_z));
    cyl = consider_compound(cyl, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(cyl);
}

du_shape_id du_create_cone_shape(float radius, float height,
        float cm_x, float cm_y, float cm_z)
{

    btCollisionShape *con = new btConeShapeZ(radius, height);
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
    btCollisionShape *cap = new btCapsuleShapeZ(radius, height);
    cap = consider_compound(cap, cm_x, cm_y, cm_z);
    return reinterpret_cast <du_shape_id>(cap);
}

du_shape_id du_create_empty_shape()
{
    btCollisionShape *empty = new btEmptyShape();
    return reinterpret_cast <du_shape_id>(empty);
}

const char *du_get_shape_name(du_body_id body)
{
    btCollisionObject *obj = reinterpret_cast <btCollisionObject*>(body);
    btCollisionShape *shape = obj->getCollisionShape();

    switch (shape->getShapeType()) {
    case BOX_SHAPE_PROXYTYPE:
        return "BOX";
    case SPHERE_SHAPE_PROXYTYPE:
        return "SPHERE";
    case CAPSULE_SHAPE_PROXYTYPE:
        return "CAPSULE";
    case CONE_SHAPE_PROXYTYPE:
        return "CONE";
    case CYLINDER_SHAPE_PROXYTYPE:
        return "CYLINDER";
    case TRIANGLE_MESH_SHAPE_PROXYTYPE:
        return "TRIANGLE_MESH";
    case EMPTY_SHAPE_PROXYTYPE:
        return "EMPTY";
    case COMPOUND_SHAPE_PROXYTYPE:
        return "COMPOUND";
    default:
        return "UNKNOWN";
    }
}

void du_set_trans(du_body_id body, float tx, float ty, float tz)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btTransform transform = bt_obj->getWorldTransform();
    transform.setOrigin(btVector3(tx, ty, tz));
    bt_obj->setWorldTransform(transform);
}

void du_set_quat(du_body_id body, float qx, float qy, float qz, float qw)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btTransform transform = bt_obj->getWorldTransform();
    transform.setRotation(btQuaternion(qx, qy, qz, qw));
    bt_obj->setWorldTransform(transform);
}

void du_set_trans_quat(du_body_id body, float tx, float ty, float tz,
        float qx, float qy, float qz, float qw)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btTransform transform(btQuaternion(qx, qy, qz, qw), btVector3(tx, ty, tz));
    bt_obj->setWorldTransform(transform);
}

void du_get_trans(du_body_id body, float *dest)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btTransform transform = bt_obj->getWorldTransform();
    btVector3 origin = transform.getOrigin();

    dest[0] = origin.x();
    dest[1] = origin.y();
    dest[2] = origin.z();
}

void du_get_trans_quat(du_body_id body, float *dest_trans, float* dest_quat)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);

    btTransform transform = bt_obj->getWorldTransform();

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

float du_get_hit_fraction(du_body_id body)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    return bt_obj->getHitFraction();
}

void du_set_margin(du_shape_id shape, float margin)
{
    btCollisionShape *bt_shape = reinterpret_cast <btCollisionShape*>(shape);
    bt_shape->setMargin(margin);
}

float du_get_margin(du_shape_id shape)
{
    btCollisionShape *bt_shape = reinterpret_cast <btCollisionShape*>(shape);
    return bt_shape->getMargin();
}

void du_set_collision_id(du_body_id body, int collision_id)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    bt_obj->setUserIndex(collision_id);
}

int du_get_collision_id(du_body_id body)
{
    btCollisionObject *bt_obj = reinterpret_cast <btCollisionObject*>(body);
    return get_collision_id(bt_obj);
}

int get_collision_id(btCollisionObject *obj)
{
    return obj->getUserIndex();
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

/**
 * Delete body from memory, should already be removed from the world
 */
void du_delete_body(du_body_id body)
{
    btCollisionObject *obj = reinterpret_cast <btCollisionObject*>(body);

    delete_shape(obj->getCollisionShape());

    delete obj;
}

int du_pre_simulation(float time_step, float max_sub_steps,
        float fixed_time_step)
{
    return _world->preSimulation(time_step, max_sub_steps, fixed_time_step);
}

float du_calc_sim_time(float timeline, int step,
        int clamped_simulation_steps)
{
    return _world->calcSimTime(timeline, step, clamped_simulation_steps);
}

void du_single_step_simulation(float fixed_time_step)
{
    _world->singleStepSimulation(fixed_time_step);
}

void du_post_simulation()
{
    _world->postSimulation();
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

void du_append_constraint(du_cons_id cons, bool disable_linked_collisions)
{
    btTypedConstraint *bt_cons = reinterpret_cast <btTypedConstraint*>(cons);
    _world->addConstraint(bt_cons, disable_linked_collisions);
}

void du_remove_constraint(du_cons_id cons)
{
    btTypedConstraint *bt_cons = reinterpret_cast <btTypedConstraint*>(cons);
    _world->removeConstraint(bt_cons);
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

    btVehicleRaycaster *raycaster = new btDefaultVehicleRaycaster(_world);

    btRaycastVehicle *vehicle = new btRaycastVehicle(*bt_tuning, bt_chassis,
            raycaster);

    vehicle->setCoordinateSystem(0, 2, 1);

    return reinterpret_cast <du_vehicle_id>(vehicle);
}

du_boat_id du_create_boat(du_body_id hull, float float_factor,
                          float water_lin_damp, float water_rot_damp)
{
    btRigidBody *du_hull = reinterpret_cast <btRigidBody*>(hull);

    duBoat *boat = new duBoat(du_hull, float_factor,
                              water_lin_damp, water_rot_damp);

    boat->setCoordinateSystem(0, 2, 1);

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
    btVector3 wheel_dir_cs0( 0, 0,-1);
    btVector3 wheel_axle_cs(1, 0, 0);

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

    btDispatcher *dispatcher = _world->getDispatcher();

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

            results[id]->contact_normal[0] = pt.m_normalWorldOnB.x();
            results[id]->contact_normal[1] = pt.m_normalWorldOnB.y();
            results[id]->contact_normal[2] = pt.m_normalWorldOnB.z();

            // NOTE: point position is provided for object with greater pointer
            if (du_body_a == MIN(du_body_a, du_body_b)) {
                const btVector3 &pt_b = pt.getPositionWorldOnB();
                results[id]->contact_point[0] = pt_b.x();
                results[id]->contact_point[1] = pt_b.y();
                results[id]->contact_point[2] = pt_b.z();
            } else {
                const btVector3 &pt_a = pt.getPositionWorldOnA();
                results[id]->contact_point[0] = pt_a.x();
                results[id]->contact_point[1] = pt_a.y();
                results[id]->contact_point[2] = pt_a.z();

                // invert normal
                results[id]->contact_normal[0] *= -1.0;
                results[id]->contact_normal[1] *= -1.0;
                results[id]->contact_normal[2] *= -1.0;
            }

            results[id]->contact_dist = pt.getDistance();
        }
    }
}

float du_check_collision_impulse(du_body_id du_body)
{
    btCollisionObject *bt_body = reinterpret_cast <btCollisionObject*>(du_body);

    btDispatcher *dispatcher = _world->getDispatcher();

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

class duRayResultCallback : public btCollisionWorld::RayResultCallback
{
public:
    duRayResultCallback(int collision_id, bool calc_all_hits, bool calc_pos_norm,
            btCollisionObject* ign_src_body,
            const btVector3 &ray_from_world, const btVector3 &ray_to_world, 
            du_ray_test_results *results)
    {
        m_collision_id = collision_id;
        m_calc_all_hits = calc_all_hits;
        m_calc_pos_norm = calc_pos_norm;
        m_ign_src_body = ign_src_body;
        m_rayFromWorld = ray_from_world;
        m_rayToWorld = ray_to_world;

        m_results = results;

        int size = m_results->size();

        // remove results which was not updated earlier
        // e.g. scheduled for removal after being reported as non-hit
        for (int i = 0; i < size; i++) {
            if (!m_results->is_remained(i)) {

                m_results->swap(i, size-1);
                m_results->pop_back();

                i--;
                size--;
            }
        }

        // clear updated flags
        for (int i = 0; i < m_results->size(); i++)
            m_results->remained_flags.at(i) = false;

        m_results->num_unchanged = 0;
    }

    virtual btScalar addSingleResult(btCollisionWorld::LocalRayResult& rayResult, bool normalInWorldSpace)
    {
        // NOTE: maybe should be in needsCollision()
        if (rayResult.m_collisionObject == m_ign_src_body)
            return 1.0;

        m_collisionObject = rayResult.m_collisionObject;

        if (!m_calc_all_hits)
            m_closestHitFraction = rayResult.m_hitFraction;

        btVector3 hitPointWorld, hitNormalWorld;

        if (m_calc_pos_norm) {
            // position
            hitPointWorld.setInterpolate3(m_rayFromWorld, m_rayToWorld,
                    rayResult.m_hitFraction);

            // normal
            if (normalInWorldSpace)
                hitNormalWorld = rayResult.m_hitNormalLocal;
            else
                hitNormalWorld = m_collisionObject->getWorldTransform().getBasis()*
                        rayResult.m_hitNormalLocal;
        }
        

        if (m_calc_all_hits)
            storeResultAllHits(const_cast <btCollisionObject*>(rayResult.m_collisionObject),
                    rayResult.m_hitFraction, hitPointWorld, hitNormalWorld);
        else
            storeResultClosestHit(const_cast <btCollisionObject*>(rayResult.m_collisionObject),
                    rayResult.m_hitFraction, hitPointWorld, hitNormalWorld);

        return m_closestHitFraction;
    }

    virtual bool needsCollision(btBroadphaseProxy* proxy0) const
    {
        bool collides = (proxy0->m_collisionFilterGroup & m_collisionFilterMask) != 0;
        collides = collides && (m_collisionFilterGroup & proxy0->m_collisionFilterMask);
        collides = collides && (!m_collision_id || get_collision_id(
                    static_cast <btCollisionObject*>(proxy0->m_clientObject)) == m_collision_id);
        return collides;
    }

    virtual int prepareResults()
    {
        int size = m_results->size();

        if (m_calc_all_hits) {
            return size - m_results->num_unchanged;

        } else {
            // initialization stage
            if (m_results->is_remained(0)) {
                // remove intermediate results
                m_results->swap(0, size-1);
                m_results->resize(1);
                return 1;

            // comparison stage
            } else {
                // remove intermediate results
                m_results->swap(1, size-1);
                m_results->resize(2);

                // no need to remove anything here because an old will be
                // removed and a new one will become old on next iteration
                
                if (m_results->compare(0, 1)) {
                    // the same result
                    return 0;
                } else if (m_results->compare_bodies(0, 1)) {
                    // place updated result before unused older one
                    m_results->swap(0, 1);
                    return 1;
                } else
                    return 2;
            }
        }
    }

    virtual int prepareResultsNoHit()
    {
        // report all remaining as non-hit
        return m_results->size();
    }

protected:
    int m_collision_id;
    bool m_calc_all_hits;
    bool m_calc_pos_norm;
    btCollisionObject* m_ign_src_body;

    du_ray_test_results *m_results;

    // temporary
    btVector3 m_rayFromWorld;
    btVector3 m_rayToWorld;

    virtual void storeResultClosestHit(btCollisionObject *body, btScalar fraction,
            btVector3 position, btVector3 normal)
    {
        if (m_calc_pos_norm)
            m_results->push_back(body, true, fraction, position, normal);
        else
            m_results->push_back(body, true, fraction);
    }

    virtual void storeResultAllHits(btCollisionObject *body, btScalar fraction,
            btVector3 position, btVector3 normal)
    {
        int ind = m_results->bodies.findLinearSearch(body);

        int size = m_results->size();

        // body already exists in results
        if (ind < size) {

            m_results->remained_flags.at(ind) = true;

            // move unchanged result to the end
            if (m_results->fractions.at(ind) == fraction &&
                    (!m_calc_pos_norm ||
                     (m_results->positions.at(ind) == position &&
                      m_results->normals.at(ind) == normal))) {

                int num_unchanged = m_results->num_unchanged;

                m_results->swap(ind, size-num_unchanged-1);
                m_results->num_unchanged++;
            // or update result
            } else {
                m_results->fractions.at(ind) = fraction;

                if (m_calc_pos_norm) {
                    m_results->positions.at(ind) = position;
                    m_results->normals.at(ind) = normal;
                }
            }
        } else if (m_calc_pos_norm)
            m_results->push_back(body, true, fraction, position, normal);
        else
            m_results->push_back(body, true, fraction);
    }
};



du_ray_test_results *du_create_ray_test_results(bool calc_pos_norm) {
    return new du_ray_test_results(calc_pos_norm);
}

void du_cleanup_ray_test_results(du_ray_test_results *results) {
    results->bodies.clear();
    results->fractions.clear();
    results->positions.clear();
    results->normals.clear();
    delete results; 
}

/**
 * collision_id=-1 - hit all objects
 */
int du_check_ray_hit(du_body_id du_body_src, float *from, float *to,
        int collision_id, bool calc_all_hits, bool calc_pos_norm,
        bool ign_src_rot, du_ray_test_results *results)
{
    btVector3 bt_from(from[0], from[1], from[2]);
    btVector3 bt_to(to[0], to[1], to[2]);

    btVector3 bt_from_w, bt_to_w;
    btCollisionObject *bt_body_src;

    // offsets in local space of source object
    if (du_body_src) {
        bt_body_src = reinterpret_cast <btCollisionObject*>(du_body_src);
       
        // with rotation
        if (!ign_src_rot) {
            bt_from_w = bt_body_src->getWorldTransform() * bt_from;
            bt_to_w = bt_body_src->getWorldTransform() * bt_to;

        // without rotation
        } else {
            btVector3 origin = bt_body_src->getWorldTransform().getOrigin();

            bt_from_w = origin + bt_from;
            bt_to_w = origin + bt_to;
        }
    } else {
        // offsets in world space
        bt_body_src = NULL;

        bt_from_w = bt_from;
        bt_to_w = bt_to;
    }

    duRayResultCallback ray_cb(collision_id, calc_all_hits, calc_pos_norm,
            bt_body_src, bt_from_w, bt_to_w, results);

    _world->rayTest(bt_from_w, bt_to_w, ray_cb);

    if (ray_cb.hasHit())
        return ray_cb.prepareResults();
    else
        return ray_cb.prepareResultsNoHit();
}

du_body_id du_get_ray_hit_body(du_ray_test_results *results, int index)
{
    return reinterpret_cast <du_body_id>(results->bodies.at(index));
}

float du_get_ray_hit_fraction(du_ray_test_results *results, int index)
{
    if (results->remained_flags.at(index) == true)
        return results->fractions.at(index);
    else
        return -1.0;
}

void du_get_ray_hit_position(du_ray_test_results *results, int index, du_vec3 dest)
{
    btVector3 vec = results->positions.at(index);

    if (results->remained_flags.at(index) == true) {
        dest[0] = vec.x();
        dest[1] = vec.y();
        dest[2] = vec.z();
    } else {
        dest[0] = 0.0;
        dest[1] = 0.0;
        dest[2] = 0.0;
    }
}

void du_get_ray_hit_normal(du_ray_test_results *results, int index, du_vec3 dest)
{
    btVector3 vec = results->normals.at(index);

    if (results->remained_flags.at(index) == true) {
        dest[0] = vec.x();
        dest[1] = vec.y();
        dest[2] = vec.z();
    } else {
        dest[0] = 0.0;
        dest[1] = 0.0;
        dest[2] = 0.0;
    }
}


void du_append_body(du_body_id body, int collision_group, int collision_mask)
{
    btCollisionObject *bt_colobj = reinterpret_cast <btCollisionObject*>(body);
    btRigidBody *bt_body = btRigidBody::upcast(bt_colobj);

    if (!collision_group)
        collision_group = btBroadphaseProxy::DefaultFilter;
    if (!collision_mask)
        collision_mask = btBroadphaseProxy::AllFilter;

    if (bt_body)
        _world->addRigidBody(bt_body, collision_group, collision_mask);
    else
        _world->addCollisionObject(bt_colobj, collision_group, collision_mask);
}

/**
 * Remove body from world
 */
void du_remove_body(du_body_id body)
{
    btCollisionObject *obj = reinterpret_cast <btCollisionObject*>(body);
    // works for btRigidBody too
    _world->removeCollisionObject(obj);
}

void du_append_action(du_action_id action)
{
    _world->addAction(reinterpret_cast <btActionInterface*>(action));
}

void du_remove_action(du_action_id action)
{
    _world->removeAction(reinterpret_cast <btActionInterface*>(action));
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
void du_set_angular_velocity(du_body_id body, float avx, float avy, float avz)
{
    btRigidBody *bt_body = reinterpret_cast <btRigidBody*>(body);
    bt_body->setAngularVelocity(btVector3(avx, avy, avz));
}

void du_update_vehicle_controls(du_vehicle_id vehicle, float engine_force, 
        float brake_force, float steering_value)
{
    btRaycastVehicle *bt_vehicle = reinterpret_cast <btRaycastVehicle*>(vehicle);

    // NOTE: in Z-up configuration it goes in reverse direction
    engine_force *= -1;
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

    // NOTE: in Z-up configuration it goes in reverse direction
    engine_force *= -1;
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
    // NOTE: in Z-up configuration it goes in reverse direction
    return -bt_vehicle->getCurrentSpeedKmHour();
}

float du_get_boat_speed(du_boat_id boat)
{
    duBoat *du_boat = reinterpret_cast <duBoat*>(boat);
    // NOTE: in Z-up configuration it goes in reverse direction
    return -du_boat->getCurrentSpeedKmHour();
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
    dest_quat[0] = 0.0;
    dest_quat[1] = 0.0;
    dest_quat[2] = sinf(half);
    dest_quat[3] = cosf(half);

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
    bt_body->setGravity(btVector3(0, 0, -gravity));
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

    new_result->contact_normal[0] = 0.0;
    new_result->contact_normal[1] = 0.0;
    new_result->contact_normal[2] = 0.0;

    new_result->contact_dist = 0.0;

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
                              float *coll_pos,
                              float *coll_norm,
                              float *coll_dist)
{
    int id = du_get_collision_result_ind(results, size, du_body_a, du_body_b);

    bool is_in_contact = results[id]->is_in_contact;

    if (coll_pos) {
        if (is_in_contact) {
            coll_pos[0] = results[id]->contact_point[0];
            coll_pos[1] = results[id]->contact_point[1];
            coll_pos[2] = results[id]->contact_point[2];
        } else {
            coll_pos[0] = 0;
            coll_pos[1] = 0;
            coll_pos[2] = 0;
        }
    }

    if (coll_norm) {
        if (is_in_contact) {
            coll_norm[0] = results[id]->contact_normal[0];
            coll_norm[1] = results[id]->contact_normal[1];
            coll_norm[2] = results[id]->contact_normal[2];
        } else {
            coll_norm[0] = 0;
            coll_norm[1] = 0;
            coll_norm[2] = 0;
        }
    }

    if (coll_dist) {
        if (is_in_contact)
            *coll_dist = results[id]->contact_dist;
        else
            *coll_dist = 0;
    }

    //printf("%d, %f,%f,%f, %f,%f,%f, %f,%d", is_in_contact, coll_pos[0],coll_pos[1],coll_pos[2],
    //        coll_norm[0], coll_norm[1], coll_norm[2], *coll_dist, coll_dist);

    return is_in_contact;
}

#ifdef __cplusplus
}
#endif

/* vim: set et ts=4 sw=4: */
