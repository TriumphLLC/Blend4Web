#include "LinearMath/btVector3.h"
#include "duFloatingBody.h"

duFloatingBody::duFloatingBody(btRigidBody* body,
                               btScalar floatingFactor,
                               btScalar waterLinDamping,
                               btScalar waterRotDamping)
:m_floatingFactor(floatingFactor),
m_waterLinDamping(waterLinDamping),
m_waterRotDamping(waterRotDamping)
{
    m_rigidBody = body;
    m_defaultLinDamping = m_rigidBody->getLinearDamping();
    m_defaultRotDamping = m_rigidBody->getAngularDamping();
    m_water = NULL;
}

duFloaterBob& duFloatingBody::addBob(const btVector3& connectionPointCS)
{
    m_bobInfo.push_back(duFloaterBob(connectionPointCS));
    
    duFloaterBob& bob = m_bobInfo[getNumBobs()-1];
    
    updateBobTransformsWS(bob, false);
    updateBobTransform(getNumBobs()-1, false);
    return bob;
}

void duFloatingBody::updateBody(btScalar step)
{
    for (int i=0;i<getNumBobs();i++) {
        updateBobTransform(i, false);
    }

    int numBobsUnderwater = 0;
    int i=0;
    for (i=0; i<m_bobInfo.size(); i++) {
        duFloaterBob& bob = m_bobInfo[i];
        
        btScalar depth = getWaterDist(bob);
        if (bob.m_isInContact) {
            btVector3 impulse = btVector3(0.f, 0.f, 1.f) / getNumBobs()
                                / getRigidBody()->getInvMass() * 10.f * step
                                * btMin(depth, 1.f) * m_floatingFactor;
            btVector3 relpos = bob.m_hardPointWS 
                               - getRigidBody()->getCenterOfMassPosition();
        
            getRigidBody()->applyImpulse(impulse, relpos);
            numBobsUnderwater++;
        }
    }
    if (numBobsUnderwater > 0)
        getRigidBody()->setDamping(m_waterLinDamping, m_waterRotDamping);
    else
        getRigidBody()->setDamping(m_defaultLinDamping, m_defaultRotDamping);
}

void duFloatingBody::updateBobTransform(int bobIndex, bool interpolatedTransform)
{
    duFloaterBob& bob = m_bobInfo[ bobIndex ];
    updateBobTransformsWS(bob, interpolatedTransform);
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

void duFloatingBody::updateBobTransformsWS(duFloaterBob& bob, bool interpolatedTransform)
{
    bob.m_isInContact = false;

    btTransform bodyTrans = getBodyWorldTransform();
    if (interpolatedTransform && (getRigidBody()->getMotionState())) {
        getRigidBody()->getMotionState()->getWorldTransform(bodyTrans);
    }

    bob.m_hardPointWS = bodyTrans(bob.m_ConnectionPointCS);
    bob.m_bobDirectionWS = bodyTrans.getBasis() *  btVector3(0.f, 1.f, 0.f);
    bob.m_bobAxleWS = bodyTrans.getBasis() * btVector3(1.f, 0.f, 0.f);;
}

const btTransform& duFloatingBody::getBodyWorldTransform() const
{
    return getRigidBody()->getCenterOfMassTransform();
}

const btTransform& duFloatingBody::getBobTransformWS( int bobIndex ) const
{
    btAssert(bobIndex < getNumBobs());
    const duFloaterBob& bob = m_bobInfo[bobIndex];
    return bob.m_worldTransform;
}

btScalar duFloatingBody::getWaterDist(duFloaterBob& bob)
{
    if (m_water) {
        const btTransform& bobTrans = bob.m_worldTransform;
        const btVector3 bobPos = bobTrans.getOrigin();

        btScalar waterLevel = m_water->getWaterLevel(bobPos[0], -bobPos[1],
                                                     m_waterInd);

        if (bobPos[2] <= waterLevel)
            bob.m_isInContact = true;

        return waterLevel - bobPos[2];
    } else {
        return btScalar(-1.f);
    }
}
