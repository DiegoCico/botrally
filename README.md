# BotRally 🏎️🤖

**Code your racing brain. Build algorithms. Beat the grid.**

BotRally is an innovative educational racing game where players program autonomous racing cars using visual block-based programming (like Scratch) and compete against AI opponents or other players in real-time multiplayer races.

![BotRally Demo](https://via.placeholder.com/800x400/0a0a0f/ffffff?text=BotRally+Racing+Action)

## Inspiration

The inspiration for BotRally came from the intersection of three powerful learning concepts:

- **Learning through play**: Making programming education engaging and fun through competitive racing
- **Visual programming accessibility**: Using Scratch-like blocks to make algorithm design approachable for beginners
- **Real-world application**: Teaching core computer science concepts (sensors, control systems, AI) through autonomous vehicle programming

We wanted to create a platform where students could learn fundamental programming concepts like conditional logic, sensor processing, and algorithm optimization while having the immediate satisfaction of watching their code come to life on a race track. The competitive element adds motivation and makes abstract programming concepts tangible.

## What it does

BotRally is a comprehensive educational racing platform that combines:

### 🎮 Visual Block Programming
- Scratch-like drag-and-drop interface for building racing algorithms
- Categories include Motion, Sensing, Control, Logic, Variables, and Events
- Real-time algorithm execution with immediate visual feedback

### 🏁 Multiple Game Modes
- **AI Racing**: Compete against Cerebras AI-powered opponents with adjustable difficulty
- **Multiplayer Racing**: Cross-computer multiplayer with lobby system and real-time synchronization
- **Solo Practice**: Test algorithms on various track types

### 🛠️ Car Customization
- Visual car builder with different body styles, wheels, and spoilers
- 3D car showcase with interactive camera controls
- Customizations affect both appearance and performance

### 🏎️ Diverse Racing Environments
- **Flat Track**: Wide racing lines for learning basic concepts
- **Hilly Track**: Elevation changes requiring speed management
- **Technical Track**: Complex corners and chicanes for advanced algorithms

### 📊 Advanced AI Integration
- Cerebras AI generates competitive racing algorithms
- Fallback AI system ensures gameplay without API dependencies
- Dynamic difficulty adjustment based on player performance

### 🌐 Real-time Multiplayer
- WebSocket-based lobby system for cross-computer play
- Automatic lobby cleanup and connection management
- Synchronized race states and real-time position tracking

## How we built it

### Frontend Architecture
- **React 18** with functional components and hooks
- **Three.js** for 3D graphics, car models, and track rendering
- **React Router** for navigation between game modes
- **Custom CSS** with Tailwind-inspired utility classes for the futuristic UI

### 3D Graphics & Physics
- **Three.js ecosystem**: @react-three/fiber and @react-three/drei for React integration
- **Custom car physics**: CarAdapter class handling acceleration, steering, and collision
- **Sensor simulation**: SensorRig class providing distance sensors for algorithm input
- **Track generation**: Procedural track builders with curves, elevation, and collision detection

### Block Programming System
- **Custom block engine**: Scratch-inspired visual programming interface
- **Runtime interpreter**: BlockRuntime class executes visual programs in real-time
- **Safety systems**: SafetyLimiter prevents dangerous car behavior
- **Extensible architecture**: Easy to add new block types and categories

### AI & Algorithm Generation
- **Cerebras AI integration**: Uses Cerebras Cloud API for intelligent opponent generation
- **Fallback algorithms**: Hand-crafted racing strategies for different difficulty levels
- **Strategy analysis**: AI analyzes player algorithms to create competitive opponents

### Multiplayer Infrastructure
- **Node.js WebSocket server**: Real-time communication between players
- **Lobby management**: Automatic lobby creation, joining, and cleanup
- **Cross-computer networking**: Support for local network and internet play
- **State synchronization**: Real-time race position and status updates

### Development Tools
- **Create React App**: Development environment and build system
- **Concurrently**: Simultaneous client and server development
- **ES6+ JavaScript**: Modern JavaScript features throughout

## Challenges we ran into

### 1. Real-time 3D Performance
**Challenge**: Maintaining 60fps with multiple cars, complex tracks, and real-time physics
**Solution**: Optimized Three.js rendering pipeline, efficient collision detection, and careful memory management

### 2. Cross-computer Multiplayer Networking
**Challenge**: Synchronizing game state across different computers and networks
**Solution**: Built custom WebSocket lobby server with automatic cleanup, connection management, and state broadcasting

### 3. Visual Programming Complexity
**Challenge**: Creating an intuitive Scratch-like interface that generates executable racing algorithms
**Solution**: Developed modular block system with clear categories, visual feedback, and runtime interpretation

### 4. AI Algorithm Generation
**Challenge**: Creating competitive AI opponents that adapt to player strategies
**Solution**: Integrated Cerebras AI for dynamic algorithm generation with intelligent fallback systems

### 5. Physics and Sensor Simulation
**Challenge**: Realistic car physics and sensor data for algorithm development
**Solution**: Custom CarAdapter and SensorRig classes providing accurate vehicle dynamics and environmental sensing

### 6. Responsive 3D UI Design
**Challenge**: Creating a futuristic, arcade-style interface that works across devices
**Solution**: Custom CSS with gradients, animations, and responsive design patterns

## Accomplishments that we're proud of

### 🎯 Educational Impact
- Created an engaging way to teach programming concepts through racing
- Made algorithm design accessible through visual programming
- Integrated real computer science concepts (sensors, control systems, AI)

### 🚀 Technical Achievements
- **Seamless multiplayer**: Cross-computer racing with real-time synchronization
- **AI integration**: Dynamic opponent generation using Cerebras AI
- **3D performance**: Smooth 60fps racing with complex physics simulation
- **Visual programming**: Intuitive Scratch-like interface for algorithm creation

### 🎮 User Experience
- **Immediate feedback**: See your code in action instantly on the race track
- **Progressive difficulty**: From simple rules to complex racing strategies
- **Competitive element**: Leaderboards and multiplayer racing motivation

### 🛠️ Robust Architecture
- **Modular design**: Easy to extend with new tracks, cars, and block types
- **Fallback systems**: Graceful degradation when external services are unavailable
- **Cross-platform**: Works on any device with a modern web browser

## What we learned

### Technical Skills
- **3D Web Development**: Deep dive into Three.js, WebGL, and browser-based 3D graphics
- **Real-time Networking**: WebSocket implementation for multiplayer gaming
- **AI Integration**: Working with modern AI APIs for dynamic content generation
- **Physics Simulation**: Implementing realistic vehicle dynamics in JavaScript

### Educational Design
- **Learning through play**: How gamification can make complex topics accessible
- **Visual programming**: The power of block-based interfaces for beginners
- **Immediate feedback loops**: Importance of seeing results instantly when learning

### Software Architecture
- **Modular systems**: Building extensible, maintainable codebases
- **Performance optimization**: Balancing features with smooth user experience
- **Error handling**: Graceful degradation and fallback systems

### User Experience
- **Progressive complexity**: Starting simple and building up to advanced concepts
- **Motivation through competition**: How leaderboards and multiplayer drive engagement
- **Accessibility**: Making programming concepts approachable for all skill levels

## What's next for BotRally

### 🎓 Educational Expansion
- **Curriculum integration**: Lesson plans and educational materials for classrooms
- **Advanced algorithms**: Machine learning, pathfinding, and optimization challenges
- **Code export**: Convert visual programs to Python, JavaScript, or other languages
- **Tutorial system**: Interactive guided lessons for programming concepts

### 🏁 Racing Features
- **More tracks**: City circuits, off-road courses, and community-created tracks
- **Advanced physics**: Weather effects, tire wear, and fuel management
- **Team racing**: Collaborative algorithms and relay races
- **Tournament system**: Organized competitions with brackets and prizes

### 🤖 AI & Analytics
- **Performance analytics**: Detailed algorithm performance metrics and optimization suggestions
- **Adaptive AI**: AI opponents that learn from player strategies over time
- **Algorithm marketplace**: Share and download community-created racing algorithms
- **Genetic algorithms**: Evolve racing strategies through multiple generations

### 🌐 Platform Growth
- **Mobile support**: Touch-friendly interface for tablets and phones
- **VR integration**: Immersive racing experience with VR headsets
- **Cloud saves**: Account system with algorithm storage and sharing
- **Global leaderboards**: Worldwide competitions and rankings

### 🛠️ Developer Tools
- **Algorithm debugger**: Step-through debugging for visual programs
- **Performance profiler**: Identify bottlenecks in racing algorithms
- **Custom block creator**: Tools for educators to create domain-specific blocks
- **API access**: Allow external tools to interact with BotRally

---

## Quick Start

```bash
# Install dependencies
npm install

# Start both server and client
npm run dev

# Or start separately:
npm run server  # WebSocket server (port 8080)
npm start       # React app (port 3000)
```

Visit `http://localhost:3000` and start coding your racing brain! 🏎️

## Contributing

We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Track's hot. Engines ready. Build. Race. Learn.** 🏁