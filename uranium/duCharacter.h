#ifndef DU_CHARACTER_H
#define DU_CHARACTER_H

#include "LinearMath/btVector3.h"

#include "BulletDynamics/Character/btCharacterControllerInterface.h"
#include "duWater.h"

class btDynamicsWorld;
class btCollisionShape;
class btRigidBody;
class btCollisionWorld;

typedef short CharMovingType;
#define CM_WALKING  0
#define CM_RUNNING  1
#define CM_CLIMBING 2
#define CM_FLYING   3

class duCharacter : public btActionInterface
{
protected:
	btRigidBody* m_rigidBody;
	btScalar m_halfHeight;
	btScalar m_maxStepHeight;

	CharMovingType m_moveType;
	btVector3 m_moveDirection;
	btScalar m_turnAngle;
	btScalar m_verticalAngle;
    
    // Special value for controlling the character move direction from the 
    // camera, doesn't affect the character orientation like m_verticalAngle.
    // Also, m_verticalAngle doesn't affect move direction as m_turnAngle.
    btScalar m_verticalMoveDirAngle;

	btScalar m_distToWater;
    duWater *m_water;
    int m_waterInd;

    btScalar m_collisionGroup;
    btScalar m_collisionMask;

	btVector3 m_raySource;
	btVector3 m_rayTarget[2];
	btScalar m_rayLambda[2];

	btScalar m_maxLinearVelocity;
	btScalar m_walkVelocity;
	btScalar m_runVelocity;
	btScalar m_flyVelocity;
	btScalar m_jumpStrength;
	btScalar m_waterLine;

    bool m_isJumping;

public:
    duCharacter(btRigidBody* character,
                const btScalar angle,          const btScalar height,
                const btScalar walkSpeed,      const btScalar runSpeed,
                const btScalar stepHeight,     const btScalar jumpStrength,
                const btScalar waterLine, 
                const btScalar collisionGroup, const btScalar collisionMask);

    virtual ~duCharacter ();
    void destroy ();

    btCollisionObject* getCollisionObject ();

    void jump();
    void rotate(const btScalar h_angle, const btScalar v_angle);
    void setHorRotation (const btScalar angle);
    void setVertRotation(const btScalar angle);
    void setVertMoveDirAngle(const btScalar angle);

    btScalar getHorRotationAngle () const;
    btScalar getVertRotationAngle () const;
    btScalar getVertMoveDirAngle () const;

    void setMoveType(CharMovingType move_type);
    void setMoveDirection(btVector3 direction);
    void setDistToWaterLevel(btScalar dist);
    void setWalkVelocity(btScalar velocity);
    void setRunVelocity(btScalar velocity);
    void setFlyVelocity(btScalar velocity);

	void updateAction(btCollisionWorld* collisionWorld, btScalar deltaTimeStep);

	void debugDraw(btIDebugDraw* debugDrawer);
    void setWater(duWater* water) {
        m_water = water;
        m_waterInd = 0;
    }

    void setWaterWrapperInd(int ind) {
        m_waterInd = ind;
    }

private:

    void handleVerticalVeloctity(btScalar delta_time);
    void castRays(btCollisionWorld* collisionWorld);
    void move(btScalar delta_time);
	bool canJump () const;
	bool closeGround () const;
    static btVector3 QmV3(const btVector3 & v, const btQuaternion & q);
};
#endif
