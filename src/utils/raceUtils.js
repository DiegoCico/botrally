// Racing utilities for lap counting and track positioning
import * as THREE from 'three';

export class RaceTracker {
  constructor(trackCurve, totalLaps = 3) {
    this.trackCurve = trackCurve;
    this.totalLaps = totalLaps;
    this.players = new Map();
    this.checkpoints = this.generateCheckpoints();
  }

  generateCheckpoints() {
    // Generate checkpoints along the track curve
    const checkpoints = [];
    const numCheckpoints = 8; // 8 checkpoints per lap
    
    for (let i = 0; i < numCheckpoints; i++) {
      const t = i / numCheckpoints;
      const position = this.trackCurve.getPoint(t);
      checkpoints.push({
        position: position,
        t: t,
        index: i
      });
    }
    return checkpoints;
  }

  addPlayer(playerId, startPosition) {
    this.players.set(playerId, {
      position: startPosition.clone(),
      currentLap: 0,
      lastCheckpoint: -1,
      totalDistance: 0,
      lapTimes: [],
      raceStartTime: Date.now(),
      finished: false
    });
  }

  updatePlayer(playerId, newPosition) {
    const player = this.players.get(playerId);
    if (!player || player.finished) return;

    const oldPosition = player.position.clone();
    player.position.copy(newPosition);

    // Calculate distance traveled
    const distance = oldPosition.distanceTo(newPosition);
    player.totalDistance += distance;

    // Check for checkpoint crossings
    this.checkForCheckpoints(playerId);
  }

  checkForCheckpoints(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Find closest point on track curve
    const closestT = this.findClosestPointOnCurve(player.position);
    const currentCheckpoint = Math.floor(closestT * this.checkpoints.length);

    // Check if we've crossed a new checkpoint
    if (currentCheckpoint !== player.lastCheckpoint) {
      const expectedNext = (player.lastCheckpoint + 1) % this.checkpoints.length;
      
      if (currentCheckpoint === expectedNext) {
        player.lastCheckpoint = currentCheckpoint;
        
        // Check if we completed a lap (crossed checkpoint 0)
        if (currentCheckpoint === 0 && player.currentLap > 0) {
          const lapTime = Date.now() - (player.raceStartTime + player.lapTimes.reduce((a, b) => a + b, 0));
          player.lapTimes.push(lapTime);
          player.currentLap++;
          
          // Check if race is finished
          if (player.currentLap >= this.totalLaps) {
            player.finished = true;
          }
        } else if (currentCheckpoint === 0 && player.currentLap === 0) {
          // First lap completion
          player.currentLap = 1;
        }
      }
    }
  }

  findClosestPointOnCurve(position) {
    let closestT = 0;
    let closestDistance = Infinity;
    
    // Sample the curve to find closest point
    const samples = 100;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const curvePoint = this.trackCurve.getPoint(t);
      const distance = position.distanceTo(curvePoint);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestT = t;
      }
    }
    
    return closestT;
  }

  getPlayerProgress(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    const closestT = this.findClosestPointOnCurve(player.position);
    const progress = (player.currentLap + closestT) / this.totalLaps;
    
    return {
      currentLap: player.currentLap,
      totalLaps: this.totalLaps,
      progress: Math.min(progress, 1),
      lapTimes: player.lapTimes,
      totalDistance: player.totalDistance,
      finished: player.finished,
      position: this.getPositionOnTrack(playerId)
    };
  }

  getPositionOnTrack(playerId) {
    const player = this.players.get(playerId);
    if (!player) return 0;

    // Calculate position relative to other players
    const allPlayers = Array.from(this.players.entries());
    const sortedPlayers = allPlayers.sort((a, b) => {
      const progressA = this.getPlayerProgress(a[0]).progress;
      const progressB = this.getPlayerProgress(b[0]).progress;
      return progressB - progressA; // Higher progress = better position
    });

    return sortedPlayers.findIndex(([id]) => id === playerId) + 1;
  }

  getLeaderboard() {
    const allPlayers = Array.from(this.players.entries());
    return allPlayers
      .map(([id, player]) => ({
        playerId: id,
        ...this.getPlayerProgress(id)
      }))
      .sort((a, b) => b.progress - a.progress);
  }

  isRaceFinished() {
    return Array.from(this.players.values()).some(player => player.finished);
  }

  getWinner() {
    const finishedPlayers = Array.from(this.players.entries())
      .filter(([_, player]) => player.finished)
      .sort((a, b) => {
        const totalTimeA = a[1].lapTimes.reduce((sum, time) => sum + time, 0);
        const totalTimeB = b[1].lapTimes.reduce((sum, time) => sum + time, 0);
        return totalTimeA - totalTimeB;
      });

    return finishedPlayers.length > 0 ? finishedPlayers[0][0] : null;
  }
}

export function getRandomTrack() {
  const tracks = ['flat', 'hilly', 'technical'];
  return tracks[Math.floor(Math.random() * tracks.length)];
}

export function getStartingPositions(trackCurve, numPlayers = 2) {
  const positions = [];
  const startPoint = trackCurve.getPoint(0);
  const tangent = trackCurve.getTangent(0);
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  
  // Create starting grid
  for (let i = 0; i < numPlayers; i++) {
    const offset = (i - (numPlayers - 1) / 2) * 4; // 4 units apart
    const position = startPoint.clone().add(normal.clone().multiplyScalar(offset));
    position.y += 0.5; // Lift slightly above track
    positions.push(position);
  }
  
  return positions;
}

export function createThirdPersonCamera(car, scene) {
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  const updateCamera = () => {
    if (!car) return;
    
    // Get car's forward direction
    const carDirection = new THREE.Vector3(0, 0, -1);
    car.getWorldDirection(carDirection);
    
    // Position camera behind and above the car
    const cameraOffset = carDirection.clone().multiplyScalar(-8); // 8 units behind
    cameraOffset.y += 4; // 4 units above
    
    const targetPosition = car.position.clone().add(cameraOffset);
    camera.position.lerp(targetPosition, 0.1);
    
    // Look at a point in front of the car
    const lookAtTarget = car.position.clone().add(carDirection.multiplyScalar(5));
    lookAtTarget.y += 1;
    camera.lookAt(lookAtTarget);
  };
  
  return { camera, updateCamera };
}