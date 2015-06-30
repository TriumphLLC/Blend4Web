#ifndef BINDINGS_H
#define BINDINGS_H

// pointer to some object/structure
#define DU_ID(name) typedef struct name##__ { int unused; } *name

// pointer to some float vector
#define DU_VEC(name) typedef float *name

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

DU_VEC(du_vec3);
DU_VEC(du_vec4);
DU_VEC(du_quat);
DU_VEC(du_array6);

struct du_collision_result {
    du_body_id body_a;
    du_body_id body_b;
    bool is_in_contact;
    float contact_point[3];
    float contact_normal[3];
    float contact_dist;
};

class du_ray_test_results {
public:
    bool calc_pos_norm;
    int num_unchanged;

    btAlignedObjectArray<btCollisionObject*> bodies;
    btAlignedObjectArray<bool> remained_flags;
    btAlignedObjectArray<btScalar> fractions;
    btAlignedObjectArray<btVector3> positions;
    btAlignedObjectArray<btVector3> normals;

    du_ray_test_results(bool calc_pos_norm) : calc_pos_norm(calc_pos_norm)
    {
    }

    void swap(int index1, int index2)
    {
        bodies.swap(index1, index2);
        remained_flags.swap(index1, index2);
        fractions.swap(index1, index2);

        if (calc_pos_norm) {
            positions.swap(index1, index2);
            normals.swap(index1, index2);
        }
    }

    void push_back(btCollisionObject *body, bool remained_flag, btScalar fraction)
    {
        btAssert(!calc_pos_norm);

        bodies.push_back(body);
        remained_flags.push_back(remained_flag);
        fractions.push_back(fraction);
    }

    void push_back(btCollisionObject *body, bool remained_flag,
            btScalar fraction, btVector3 position, btVector3 normal)
    {
        btAssert(calc_pos_norm);

        bodies.push_back(body);
        remained_flags.push_back(remained_flag);
        fractions.push_back(fraction);
        positions.push_back(position);
        normals.push_back(normal);
    }

    void pop_back()
    {
        bodies.pop_back();
        remained_flags.pop_back();
        fractions.pop_back();

        if (calc_pos_norm) {
            positions.pop_back();
            normals.pop_back();
        }
    }

    int size()
    {
        return bodies.size();
    }

    void resize(int newsize)
    {
        bodies.resize(newsize);
        remained_flags.resize(newsize);
        fractions.resize(newsize);

        if (calc_pos_norm) {
            positions.resize(newsize);
            normals.resize(newsize);
        }
    }

    bool is_remained(int index)
    {
        btAssert(index < size());
        return remained_flags.at(index);
    }

    bool compare(int index1, int index2)
    {
        if (bodies.at(index1) == bodies.at(index2) &&
                fractions.at(index1) == fractions.at(index2) &&
                (!calc_pos_norm ||
                 (positions.at(index1) == positions.at(index2) &&
                  normals.at(index1) == normals.at(index2))))
            return true;
        else
            return false;
    }

    bool compare_bodies(int index1, int index2)
    {
        if (bodies.at(index1) == bodies.at(index2))
            return true;
        else
            return false;
    }
};

#ifdef __cplusplus
extern "C" {
#endif

float *du_alloc_float_array(int num);

du_collision_result **du_realloc_collision_result_array(du_collision_result **results, int num);

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

#ifdef __cplusplus
}
#endif

#endif

/* vim: set et ts=4 sw=4: */
