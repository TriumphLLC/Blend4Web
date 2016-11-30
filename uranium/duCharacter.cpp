#include "LinearMath/btVector3.h"

#include "BulletDynamics/Dynamics/btRigidBody.h"
#include "BulletCollision/CollisionDispatch/btCollisionWorld.h"
#include "LinearMath/btTransform.h"
#include "duCharacter.h"


duCharacter::duCharacter (btRigidBody* character, const btScalar angle,
                                                  const btScalar height,
                                                  const btScalar walkSpeed,
                                                  const btScalar runSpeed,
                                                  const btScalar stepHeight,
                                                  const btScalar jumpStrength,
                                                  const btScalar waterLine,
                                                  const btScalar collisionGroup,
                                                  const btScalar collisionMask) :
    // character initialization
    m_rigidBody(character),
    m_halfHeight(height / 2.f),
    m_maxStepHeight(stepHeight),
    m_moveType(CM_WALKING),
    m_turnAngle(angle),
    m_verticalAngle(0.f),
    m_distToWater(1.f),
    m_water(NULL),
    m_waterInd(0),
    m_collisionGroup(collisionGroup),
    m_collisionMask(collisionMask),
    m_maxLinearVelocity(walkSpeed), // meters/sec
    m_walkVelocity(walkSpeed),      // meters/sec
    m_runVelocity (runSpeed),       // meters/sec
    m_flyVelocity (25.f),           // meters/sec
    m_jumpStrength (jumpStrength),
    m_waterLine (waterLine),
    m_isJumping(false)
{
    m_rayLambda[0] = 1.f;
    m_rayLambda[1] = 1.f;

    m_rigidBody->setGravity(btVector3(0.f, 0.f, 0.f));

    m_rigidBody->setAngularFactor(0.f);

    m_moveDirection = btVector3(0.f, 0.f, 0.f);
    m_rigidBody->setDamping(0.1f, 0.1f);
}

duCharacter::~duCharacter ()
{
}

void duCharacter::destroy() 
{
    if (m_rigidBody)
    {
        delete m_rigidBody;
        m_rigidBody = 0;
    }
}

btCollisionObject* duCharacter::getCollisionObject() 
{
    return m_rigidBody;
}

void duCharacter::castRays(btCollisionWorld* collisionWorld)
{
    const btVector3 forward = btVector3(0.f, -1.f, 0.f);
    const btVector3 down    = btVector3(0.f, 0.f, -1.f);

    btTransform xform = m_rigidBody->getWorldTransform();
    m_raySource = xform.getOrigin();

    // cast rays in forward and down directions
    m_rayTarget[0] = m_raySource + down * (m_halfHeight + m_maxStepHeight);
    m_rayTarget[1] = m_raySource + forward * m_halfHeight * btScalar(1.1);

    class ClosestNotMe : public btCollisionWorld::ClosestRayResultCallback
    {
    public:
        ClosestNotMe (btRigidBody* me, btScalar& collisionGroup, btScalar& collisionMask) : btCollisionWorld::ClosestRayResultCallback(btVector3(0.f, 0.f, 0.f), btVector3(0.f, 0.f, 0.f))
        {
            m_me = me;
			m_collisionFilterGroup = collisionGroup;
			m_collisionFilterMask = collisionMask;
        }


        virtual btScalar addSingleResult(btCollisionWorld::LocalRayResult& rayResult,bool normalInWorldSpace)
        {
            if (rayResult.m_collisionObject == m_me)
                return 1.f;

            return ClosestRayResultCallback::addSingleResult (rayResult, normalInWorldSpace);
        }
    protected:
        btRigidBody* m_me;
    };

    ClosestNotMe rayCallback(m_rigidBody, m_collisionGroup, m_collisionMask);

    int i = 0;
    for (i = 0; i < 2; i++)
    {
        rayCallback.m_closestHitFraction = 1.f;
        collisionWorld->rayTest(m_raySource, m_rayTarget[i], rayCallback);
        if (rayCallback.hasHit())
        {
            m_rayLambda[i] = rayCallback.m_closestHitFraction;
        } else {
            m_rayLambda[i] = 1.f;
        }
    }

    if (m_water != NULL) {
        btScalar waterLevel = m_water->getWaterLevel(m_raySource[0],
                                                    -m_raySource[1], m_waterInd);
        m_distToWater = m_raySource[2] - waterLevel;
    }
}

void duCharacter::move(btScalar dt)
{
    btVector3 linearVelocity = m_rigidBody->getLinearVelocity();
    btScalar speed = linearVelocity.length();

    btVector3 walkDirection = m_moveDirection;
    
    if (m_distToWater < m_waterLine || m_moveType == CM_FLYING) {
        // when in water or flying rotate direction in vertical plane as well
        walkDirection = QmV3(walkDirection,
                     btQuaternion(btVector3(1.f, 0.f, 0.f), m_verticalAngle));
    }

    // rotate walk direction according to rigid body's horizontal rotation angle
    walkDirection = QmV3(walkDirection, 
                         btQuaternion(btVector3(0.f, 0.f, 1.f), m_turnAngle));
    walkDirection = walkDirection.safeNormalize();

    if (m_moveType == CM_WALKING || m_moveType == CM_RUNNING) {

        if (closeGround() || m_distToWater < m_waterLine) {

            // find horizontal part of velocity and horizontal direction
            btVector3 horVelocity = 
                 btVector3(linearVelocity[0], linearVelocity[1], 0.f);
            btVector3 horDir = 
                 btVector3(walkDirection[0], walkDirection[1], 0.f).normalize();

            btScalar  velocityDotDir  = horVelocity.dot(horDir);
            // velocity to direction projection
            btVector3 velocityDirProj = velocityDotDir * horDir;
            
            btScalar damping = fmax(1.f - 10.f * dt, 0.f);

            if (!m_moveDirection[0]) {
                if (!m_moveDirection[1]) {
                    // damp horizontal velocities
                    linearVelocity[0] *= damping;
                    linearVelocity[1] *= damping;
                } else {
                    // damp straight veloctity
                    linearVelocity[0] = velocityDirProj[0];
                    linearVelocity[1] = velocityDirProj[1];
                }
            } else {
                // damp side veloctity
                linearVelocity[0] = velocityDirProj[0];
                linearVelocity[1] = velocityDirProj[1];
            }
            if (speed > m_maxLinearVelocity) {
                // damp if character is moving too fast
                linearVelocity[0] *= damping;
                linearVelocity[1] *= damping;
            }
            if (m_distToWater < m_waterLine)
                // damp if character is underwater
                linearVelocity[2] *= damping;

            m_rigidBody->setLinearVelocity (linearVelocity);
        }

        if (speed < m_maxLinearVelocity 
                && (m_moveDirection[0] != 0.f || m_moveDirection[1] != 0.f)) {
            
            // apply moving impulse
            btVector3 move_impulse;
            if (m_distToWater < m_waterLine) {
                move_impulse[2] = walkDirection[2] * 30.f;
            } else {
                move_impulse[2] = btScalar(0.f);
            }
            move_impulse[0] = walkDirection[0] * 30.f;
            move_impulse[1] = walkDirection[1] * 30.f;
            move_impulse /= m_rigidBody->getInvMass();
            m_rigidBody->applyCentralImpulse(move_impulse * dt);
        }

    } else if (m_moveType == CM_CLIMBING) {

        if (m_moveDirection[0] != 0 || m_moveDirection[1] != 0)
            linearVelocity = 0.2 * walkDirection * m_walkVelocity;
        else 
            linearVelocity = btVector3(0.f, 0.f, 0.f);

        //change sign of vertical velocity depending on vertical angle
        linearVelocity[2] = -m_moveDirection[1] * m_walkVelocity
                            * (m_verticalAngle < 0 ? 1: -1);
        m_rigidBody->setLinearVelocity (linearVelocity);

    } else if (m_moveType == CM_FLYING) {

        if (!m_moveDirection[0] && !m_moveDirection[1])
            linearVelocity = btVector3(0.f, 0.f, 0.f);
        else {
            linearVelocity = walkDirection * m_maxLinearVelocity;
        }

        m_rigidBody->setLinearVelocity (linearVelocity);
    }
}

void duCharacter::handleVerticalVeloctity(btScalar dt)
{
    btVector3 linearVelocity = m_rigidBody->getLinearVelocity();
    btScalar depth = m_waterLine - m_distToWater;
    float dist = m_rayLambda[0];

    if (m_distToWater < m_waterLine && m_distToWater > -1.5f) {
        // close to the water - buoyancy
        btVector3 impulse = btVector3(0.f, 0.f, 10.f)
                            / m_rigidBody->getInvMass() * dt
                            * btMin(depth, 0.2f);

        m_rigidBody->applyCentralImpulse(impulse);

    } else if (dist < 0.9 && !m_isJumping) {
        // lift
        btScalar verticalVelocity = 4.f * m_maxLinearVelocity * (0.9f - dist);
        linearVelocity[2] = fmin(verticalVelocity, 5.f);
        m_rigidBody->setLinearVelocity (linearVelocity);

    } else if (dist <= 0.95f && linearVelocity[2] < 0.f) {
        // stay still
        m_isJumping = false;
        linearVelocity[2] = btScalar(0.f);
        m_rigidBody->setLinearVelocity (linearVelocity);

    } else if (dist < 1.f && !m_isJumping) {
        linearVelocity[2] = -13.f * m_maxLinearVelocity * (dist - 0.95f);
        m_rigidBody->setLinearVelocity (linearVelocity);
    }

    m_rigidBody->setGravity(btVector3(0.f, 0.f, 0.f));

    if (m_distToWater > m_waterLine && m_moveType != CM_FLYING
                                    && m_moveType != CM_CLIMBING) {

        btVector3 gravity = btVector3(0.f, 0.f, -10.f)
                            / m_rigidBody->getInvMass() * dt;
        m_rigidBody->applyCentralImpulse(gravity * btMin(-2.f * depth, 1.f));
    }
}

void duCharacter::rotate(const btScalar hAngle, const btScalar vAngle)
{
    // rotate rigid body around y and x axis by the given angles
    m_turnAngle += hAngle;
    m_verticalAngle += vAngle;
}

void duCharacter::setHorRotation(const btScalar angle)
{
    m_turnAngle = angle;
}

void duCharacter::setVertRotation(const btScalar angle)
{
    m_verticalAngle = angle;
}

btVector3 duCharacter::QmV3(const btVector3 & v, const btQuaternion & q)
{
    // transform Vector3 with a given quaternion
    btVector3 qv(q.x(), q.y(), q.z());
    btVector3 uv = qv.cross(v);
    btVector3 uuv = qv.cross(uv);
    uv *= (2.0 * q.w());
    uuv *= 2.0;
    return v + uv + uuv;
}

void duCharacter::jump()
{
    if (!canJump())
        return;

    if (!m_isJumping) {
        m_isJumping = true;

        btVector3 up = btVector3(0.f, 0.f, 1.f);
        btScalar magnitude = btScalar(m_jumpStrength) / m_rigidBody->getInvMass();
        m_rigidBody->applyCentralImpulse (up * magnitude);
    }
}

bool duCharacter::canJump() const
{
    return closeGround();
}

bool duCharacter::closeGround() const
{
    return m_rayLambda[0] < btScalar(1.f);
}

btScalar duCharacter::getHorRotationAngle() const
{
    return m_turnAngle;
}

btScalar duCharacter::getVertRotationAngle() const
{
    return m_verticalAngle;
}

void duCharacter::setMoveType(CharMovingType move_type)
{
    switch (move_type) {
    case CM_WALKING:
        m_maxLinearVelocity = m_walkVelocity;
        break;
    case CM_RUNNING:
        m_maxLinearVelocity = m_runVelocity;
        break;
    case CM_FLYING:
        m_maxLinearVelocity = m_flyVelocity;
    case CM_CLIMBING:
        break;
    }

    m_moveType = move_type;
}

void duCharacter::setMoveDirection(btVector3 direction)
{
    m_moveDirection = direction; 
}

void duCharacter::setWalkVelocity(btScalar velocity)
{
    m_walkVelocity = velocity;
    if (m_moveType == CM_WALKING) {
        m_maxLinearVelocity = velocity;
    }
}

void duCharacter::setRunVelocity(btScalar velocity)
{
    m_runVelocity = velocity;
    if (m_moveType == CM_RUNNING) {
        m_maxLinearVelocity = velocity;
    }
}

void duCharacter::setFlyVelocity(btScalar velocity) 
{
    m_flyVelocity = velocity;
    if (m_moveType == CM_FLYING) {
        m_maxLinearVelocity = velocity;
    }
}

void duCharacter::updateAction(btCollisionWorld* collisionWorld, btScalar deltaTimeStep)
{
    castRays(collisionWorld);
    if (m_moveType == CM_WALKING || m_moveType == CM_RUNNING) {
        handleVerticalVeloctity(deltaTimeStep);
    }
    move(deltaTimeStep);
}

void duCharacter::debugDraw(btIDebugDraw* debugDrawer) {};

/* vim: set et ts=4 sw=4: */
