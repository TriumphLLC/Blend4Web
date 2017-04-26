#include "LinearMath/btVector3.h"
#include "duBoat.h"

#include "LinearMath/btQuaternion.h"
#include "BulletDynamics/Dynamics/btDynamicsWorld.h"
#include "LinearMath/btMinMax.h"
#include "LinearMath/btIDebugDraw.h"

#include "duWater.h"

duBoat::duBoat(btRigidBody* hull, btScalar floatingFactor,
               btScalar waterLinDamping, btScalar waterRotDamping)
:m_floatingFactor(floatingFactor),
m_waterLinDamping(waterLinDamping),
m_waterRotDamping(waterRotDamping)
{
    m_hullBody = hull;
    m_indexRightAxis = 0;
    m_indexUpAxis = 2;
    m_indexForwardAxis = 1;
    m_defaultLinDamping = m_hullBody->getLinearDamping();
    m_defaultRotDamping = m_hullBody->getAngularDamping();
}

void duBoat::defaultInit()
{
    m_currentVehicleSpeedKmHour = btScalar(0.);
    m_steeringValue = btScalar(0.);
    m_engineForce   = btScalar(0.);
}

duBoat::~duBoat()
{
}

duBobInfo& duBoat::addBob(const btVector3& connectionPointCS)
{
    duBobInfoConstructionInfo ci;

    ci.m_hullConnectionCS = connectionPointCS;
    ci.m_bobDirectionCS = btVector3(0.f, 0.f, -1.f);
    ci.m_bobAxleCS = btVector3(-1.f, 0.f, 0.f);

    m_bobInfo.push_back( duBobInfo(ci));
    
    duBobInfo& bob = m_bobInfo[getNumBobs()-1];
    
    updateBobTransformsWS(bob, false);
    updateBobTransform(getNumBobs()-1,false);
    return bob;
}

const duBobInfo& duBoat::getBobInfo(int index) const
{
    btAssert((index >= 0) && (index < getNumBobs()));
    return m_bobInfo[index];
}

duBobInfo& duBoat::getBobInfo(int index)
{
    btAssert((index >= 0) && (index < getNumBobs()));
    return m_bobInfo[index];
}

const btTransform& duBoat::getBobTransformWS( int bobIndex ) const
{
    btAssert(bobIndex < getNumBobs());
    const duBobInfo& bob = m_bobInfo[bobIndex];
    return bob.m_worldTransform;
}

void duBoat::updateBobTransform( int bobIndex , bool interpolatedTransform)
{
    duBobInfo& bob = m_bobInfo[ bobIndex ];
    updateBobTransformsWS(bob,interpolatedTransform);
    btVector3 up = -bob.m_bobDirectionWS;
    const btVector3& right = bob.m_bobAxleWS;
    btVector3 fwd = up.cross(right);

    btMatrix3x3 basis2(
        right[0],fwd[0],up[0],
        right[1],fwd[1],up[1],
        right[2],fwd[2],up[2]
    );
    
    bob.m_worldTransform.setBasis(basis2);
    bob.m_worldTransform.setOrigin(bob.m_hardPointWS);
}

void duBoat::updateBobTransformsWS(duBobInfo& bob , bool interpolatedTransform)
{
    bob.m_isInContact = false;
    btTransform hullTrans = getHullWorldTransform();
    if (interpolatedTransform && (getRigidBody()->getMotionState()))
        getRigidBody()->getMotionState()->getWorldTransform(hullTrans);

    bob.m_hardPointWS = hullTrans(bob.m_hullConnectionPointCS);
    bob.m_bobDirectionWS = hullTrans.getBasis() *  bob.m_bobDirectionCS;
    bob.m_bobAxleWS = hullTrans.getBasis() * bob.m_bobAxleCS;
}

const btTransform& duBoat::getHullWorldTransform() const
{
    return getRigidBody()->getCenterOfMassTransform();
}

void duBoat::updateBoat( btScalar step )
{
    for (int i=0;i<getNumBobs();i++) {
        updateBobTransform(i,false);
    }

    const btTransform& hullTrans = getHullWorldTransform();

    btVector3 forwardW (
        hullTrans.getBasis()[0][m_indexForwardAxis],
        hullTrans.getBasis()[1][m_indexForwardAxis],
        hullTrans.getBasis()[2][m_indexForwardAxis]);

    m_currentVehicleSpeedKmHour = 
                btScalar(3.6f) * getRigidBody()->getLinearVelocity().length();

    if (forwardW.dot(getRigidBody()->getLinearVelocity()) < btScalar(0.f))
        m_currentVehicleSpeedKmHour *= btScalar(-1.f);

    int numBobsUnderWater = 0;
    int i=0;
    for (i=0; i<m_bobInfo.size(); i++) {
        duBobInfo& bob = m_bobInfo[i];

        btScalar depth = getWaterDist(bob);
        if (bob.m_isInContact) {
            btVector3 impulse = btVector3(0.f, 0.f, 1.f) / getNumBobs()
                    / getRigidBody()->getInvMass() * 10.f * step
                    * btMin(depth, 0.5f) * m_floatingFactor;
            btVector3 relpos = bob.m_hardPointWS 
                               - getRigidBody()->getCenterOfMassPosition();
        
            getRigidBody()->applyImpulse(impulse, relpos);
            numBobsUnderWater ++;
        }
    }

    if (numBobsUnderWater > 0) {
        btVector3 up(0.f, 0.f, 1.f);
        btVector3 engineImpulse = m_engineForce * step * getNumBobs()
                                  * forwardW * 10.f;
        btMatrix3x3 rotatingMat;
        rotatingMat.setEulerZYX(0.f, 0.f, -m_steeringValue);
            
        engineImpulse = rotatingMat * engineImpulse;
        btVector3 enginePos = -forwardW ;
        getRigidBody()->applyImpulse(engineImpulse, enginePos);
        getRigidBody()->setDamping(m_waterLinDamping, m_waterRotDamping);
    } else {
        getRigidBody()->setDamping(m_defaultLinDamping, m_defaultRotDamping);
    }
}

void duBoat::setSteeringValue(btScalar steering)
{
    // NOTE: in Z-up configuration it goes in reverse direction
    m_steeringValue = -steering;
}

btScalar duBoat::getSteeringValue() const
{
    return m_steeringValue;
}

void duBoat::applyEngineForce(btScalar force)
{
    m_engineForce = force;
}

void duBoat::setBrake(btScalar brake,int bobIndex)
{
    btAssert((bobIndex >= 0) && (bobIndex <     getNumBobs()));
    getBobInfo(bobIndex).m_brake = brake;
}

struct duBobContactPoint
{
    btRigidBody* m_body0;
    btRigidBody* m_body1;
    btVector3   m_frictionPositionWorld;
    btVector3   m_frictionDirectionWorld;
    btScalar    m_jacDiagABInv;
    btScalar    m_maxImpulse;

    duBobContactPoint(btRigidBody* body0,btRigidBody* body1,const btVector3& frictionPosWorld,const btVector3& frictionDirectionWorld, btScalar maxImpulse)
        :m_body0(body0),
        m_body1(body1),
        m_frictionPositionWorld(frictionPosWorld),
        m_frictionDirectionWorld(frictionDirectionWorld),
        m_maxImpulse(maxImpulse)
    {
        btScalar denom0 = body0->computeImpulseDenominator(frictionPosWorld,frictionDirectionWorld);
        btScalar denom1 = body1->computeImpulseDenominator(frictionPosWorld,frictionDirectionWorld);
        btScalar    relaxation = 1.f;
        m_jacDiagABInv = relaxation/(denom0+denom1);
    }
};

btScalar duBoat::getWaterDist(duBobInfo& bob)
{
    if (m_water != NULL) {
        const btTransform& bobTrans = bob.m_worldTransform;
        const btVector3 bobPos = bobTrans.getOrigin();
        btScalar waterLevel = m_water->getWaterLevel(bobPos[0], -bobPos[1], m_waterInd);

        if (bobPos[2] <= waterLevel)
            bob.m_isInContact = true;

        return waterLevel - bobPos[2];
    } else {
        return btScalar(-1.f);
    }
}
