// demo/CarBlocksDemo.js
import * as THREE from 'three';
import { buildLowPolyCar } from '@/components/vehicles/LowPolyCar';
import { CarAdapter } from '@/controls/CarAdapter';
import { SensorRig } from '@/sensors/SensorRig';
import { BlockRuntime } from '@/blocks/BlockRuntime';

export function startCarBlocksDemo({ scene, colliders, clock }) {
  const { group, wheels } = buildLowPolyCar({ scale: 0.5, wheelType:'sporty' });
  scene.add(group);

  // position & face +X (default model orientation already +X)
  group.position.set(0, 0.55, 0);

  const car = new CarAdapter({ group, wheels }, { wheelBase: 2.7, tireRadius: 0.55 });
  const sensors = new SensorRig(group, { rayLength: 35, debug: false });
  const brain = new BlockRuntime([
    // if obstacle is close ahead, turn toward the side with more space and slow down
    { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
    // if fairly open, go faster and center steering by side balance
    { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
    // full send
    { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } },
  ]);

  function tick() {
    const dt = clock.getDelta();
    const sensorData = sensors.sample(colliders);
    const controls = brain.step({ sensors: sensorData, speed: car.getScalarSpeed() });
    car.setControls(controls);
    car.tick(dt);
  }
  return { tick, car, sensors, brain, group };
}
