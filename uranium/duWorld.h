#ifndef DU_WORLD_H
#define DU_WORLD_H

#include "BulletDynamics/Dynamics/btDiscreteDynamicsWorld.h"

//#include "BulletDynamics/Dynamics/btRigidBody.h"
//#include "LinearMath/btIDebugDraw.h"

class duWorld;

typedef void (*duTickCallback)(duWorld *world, btScalar time);

class duWorld : public btDiscreteDynamicsWorld
{
public:
	duWorld(btDispatcher* dispatcher, btBroadphaseInterface* pairCache,
            btConstraintSolver* constraintSolver,
            btCollisionConfiguration* collisionConfiguration);

	virtual int	preSimulation(btScalar timeStep, int maxSubSteps=1,
            btScalar fixedTimeStep=btScalar(1.)/btScalar(60.));
    virtual btScalar calcSimTime(btScalar timeline, int step, int clampedSimulationSteps);
	virtual void singleStepSimulation(btScalar fixedTimeStep);
	virtual void postSimulation();

	virtual ~duWorld();
protected:
    duTickCallback m_tickCallback;
    duTickCallback m_preTickCallback;
};
#endif

/* vim: set et ts=4 sw=4: */
