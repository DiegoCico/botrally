import * as THREE from 'three';
import { buildLowPolyCar } from '@/components/vehicles/LowPolyCar';
import { CarAdapter } from '@/controls/CarAdapter';
import { SensorRig } from '@/sensors/SensorRig';
import { BlockRuntime } from '@/blocks/BlockRuntime';

export function startCarBlocksDemo({ scene, colliders, clock }) {
  const { group, wheels } = buildLowPolyCar({ scale: 0.5, wheelType:'sporty' });
  scene.add(group);

  group.position.set(0, 0.55, 0);

  const car = new CarAdapter({ group, wheels }, { wheelBase: 2.7, tireRadius: 0.55 });
  const sensors = new SensorRig(group, { rayLength: 35, debug: false });
  
  // ✨ Use a regular variable for the runtime, initialized with an empty program.
  const runtime = new BlockRuntime([]);
  
  function tick() {
    const dt = clock.getDelta();
    const sensorData = sensors.sample(colliders);
    // ✨ Use the correct 'runtime' variable here.
    const controls = runtime.step({ sensors: sensorData, speed: car.getScalarSpeed() });
    car.setControls(controls);
    car.tick(dt);
  }

  function setProgram(programRules) {
    runtime = new BlockRuntime(programRules);
  }

  // ✨ Return 'runtime' instead of the undefined 'brain'.
  return { tick, car, sensors, runtime, group, setProgram };
}

