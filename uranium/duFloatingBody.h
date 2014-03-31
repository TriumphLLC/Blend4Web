#ifndef DU_FLOATINGBODY_H
#define DU_FLOATINGBODY_H
#include "BulletDynamics/Dynamics/btRigidBody.h"
class btDynamicsWorld;
#include "LinearMath/btAlignedObjectArray.h"
#include "BulletDynamics/Dynamics/btActionInterface.h"
#include "duWater.h"

struct duFloaterBob
{
    btTransform m_worldTransform;

    btVector3   m_hardPointWS;      // connection point in worldspace
    btVector3   m_bobDirectionWS;   // direction in worldspace
    btVector3   m_bobAxleWS;        // axle in worldspace
    bool        m_isInContact;
    
    btVector3   m_ConnectionPointCS; //const

    duFloaterBob(btVector3 connectionPointCS)
    {
        m_ConnectionPointCS = connectionPointCS;
    }
};

class duFloatingBody : public btActionInterface
{
private:
    btRigidBody* m_rigidBody;
    btScalar m_floatingFactor;
    btScalar m_defaultLinDamping;
    btScalar m_defaultRotDamping;
    btScalar m_waterLinDamping;
    btScalar m_waterRotDamping;

    int m_waterInd;
    duWater* m_water; 

    btScalar getWaterDist(duFloaterBob& bob);

public:

    duFloatingBody(btRigidBody* body, btScalar floatingFactor,
                   btScalar waterLinDamping, btScalar waterRotDamping);

    btAlignedObjectArray<duFloaterBob> m_bobInfo;

    duFloaterBob& addBob(const btVector3& connectionPointCS);

    ///btActionInterface interface
    virtual void updateAction(btCollisionWorld* collisionWorld, btScalar step)
    {
        (void) collisionWorld;
        updateBody(step);
    }
    ///btActionInterface interface
    void debugDraw(btIDebugDraw* debugDrawer)
    {
    }

    void updateBody(btScalar step);

    void updateBobTransform(int bobIndex, bool interpolatedTransform);
    void updateBobTransformsWS(duFloaterBob& bob, bool interpolatedTransform);

    void setWater(duWater* water) {
        m_water = water;
        m_waterInd = 0;
    }

    void setWaterWrapperInd(int ind) {
        m_waterInd = ind;
    }
    
    inline int getNumBobs() const
    {
        return int (m_bobInfo.size());
    }
    inline btRigidBody* getRigidBody() const
    {
        return m_rigidBody;
    }
    const btTransform& getBodyWorldTransform() const;
    const btTransform&  getBobTransformWS(int bobIndex) const;
};

#endif //DU_FLOATINGBODY_H
