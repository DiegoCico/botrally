// Cerebras AI service for generating racing algorithms
const CEREBRAS_API_KEY = process.env.REACT_APP_CEREBRAS_API_KEY;
const CEREBRAS_API_URL = process.env.REACT_APP_CEREBRAS_API_URL || 'https://api.cerebras.ai/v1';

class CerebrasAI {
  constructor() {
    this.apiKey = CEREBRAS_API_KEY;
    this.apiUrl = CEREBRAS_API_URL;
  }

  async generateRacingAlgorithm(trackType = 'flat', difficulty = 'medium', playerStrategy = null) {
    if (!this.apiKey || this.apiKey === 'your_cerebras_api_key_here') {
      console.warn('Cerebras API key not configured, using fallback AI');
      return this.getFallbackAlgorithm(trackType, difficulty);
    }

    const prompt = this.buildPrompt(trackType, difficulty, playerStrategy);

    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama3.1-8b',
          messages: [
            {
              role: 'system',
              content: 'You are an expert racing AI that creates optimal driving algorithms for autonomous racing cars. You understand racing physics, track navigation, and competitive strategy.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Cerebras API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      return this.parseAIResponse(aiResponse, trackType, difficulty);
    } catch (error) {
      console.error('Cerebras AI error:', error);
      return this.getFallbackAlgorithm(trackType, difficulty);
    }
  }

  buildPrompt(trackType, difficulty, playerStrategy) {
    const trackDescriptions = {
      flat: 'a flat oval track with gentle curves and wide racing lines',
      hilly: 'a hilly track with elevation changes, requiring speed management on climbs and descents',
      technical: 'a technical track with tight hairpins, chicanes, and complex corner sequences'
    };

    const difficultyDescriptions = {
      easy: 'conservative and safe, prioritizing consistency over speed',
      medium: 'balanced between speed and safety, taking calculated risks',
      hard: 'aggressive and fast, pushing limits for maximum performance',
      expert: 'extremely aggressive with advanced techniques like late braking and optimal racing lines'
    };

    let prompt = `Create a racing algorithm for ${trackDescriptions[trackType]}. The AI should be ${difficultyDescriptions[difficulty]}.

Available sensors:
- f_min, f_avg, f_max: Forward distance sensors (minimum, average, maximum)
- l_min, l_avg, l_max: Left side distance sensors
- r_min, r_avg, r_max: Right side distance sensors
- speed: Current car speed

Algorithm format should be rules like:
{ if: 'condition', then: { throttle: 'value', steer: 'value' } }

Where:
- throttle: 0.0 to 1.0 (0 = no throttle, 1 = full throttle)
- steer: -1.0 to 1.0 (-1 = full left, 0 = straight, 1 = full right)
- Conditions can use sensor values and logical operators

Example rules:
{ if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.05' } }
{ if: 'f_min >= 20', then: { throttle: '0.9', steer: '0' } }

`;

    if (playerStrategy) {
      prompt += `\nPlayer's strategy analysis: ${playerStrategy}
Create an AI that can compete effectively against this strategy.

`;
    }

    prompt += `Generate 4-6 racing rules that create an effective ${difficulty} difficulty AI for this track type. Focus on:
1. Speed management based on available space
2. Steering logic for track navigation
3. Obstacle avoidance and safety
4. Competitive racing behavior

Return only the JSON array of rules, no additional text.`;

    return prompt;
  }

  parseAIResponse(response, trackType, difficulty) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const rules = JSON.parse(jsonMatch[0]);
        if (Array.isArray(rules) && rules.length > 0) {
          return {
            rules: rules,
            difficulty: difficulty,
            trackType: trackType,
            source: 'cerebras-ai'
          };
        }
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback if parsing fails
    return this.getFallbackAlgorithm(trackType, difficulty);
  }

  getFallbackAlgorithm(trackType, difficulty) {
    const algorithms = {
      flat: {
        easy: [
          { if: 'f_min < 15', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.03' } },
          { if: 'f_min >= 15 && f_min < 30', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.02' } },
          { if: 'f_min >= 30', then: { throttle: '0.8', steer: '0' } }
        ],
        medium: [
          { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
          { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.04' } },
          { if: 'f_min >= 20', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.02' } }
        ],
        hard: [
          { if: 'f_min < 8', then: { throttle: '0.1', steer: '(r_min - l_min) * 0.08' } },
          { if: 'f_min >= 8 && f_min < 15', then: { throttle: '0.8', steer: '(r_min - l_min) * 0.05' } },
          { if: 'f_min >= 15', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.03' } }
        ]
      },
      hilly: {
        easy: [
          { if: 'f_min < 12', then: { throttle: '0.4', steer: '(r_min - l_min) * 0.04' } },
          { if: 'f_min >= 12 && f_min < 25', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
          { if: 'f_min >= 25', then: { throttle: '0.7', steer: '0' } },
          { if: 'speed > 15', then: { throttle: '0.5', steer: '(r_min - l_min) * 0.02' } }
        ],
        medium: [
          { if: 'f_min < 10', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.06' } },
          { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.04' } },
          { if: 'f_min >= 20', then: { throttle: '0.8', steer: '(r_min - l_min) * 0.02' } },
          { if: 'speed > 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } }
        ],
        hard: [
          { if: 'f_min < 8', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.08' } },
          { if: 'f_min >= 8 && f_min < 18', then: { throttle: '0.8', steer: '(r_min - l_min) * 0.05' } },
          { if: 'f_min >= 18', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.03' } },
          { if: 'speed > 25', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.04' } }
        ]
      },
      technical: {
        easy: [
          { if: 'f_min < 15', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.05' } },
          { if: 'f_min >= 15 && f_min < 25', then: { throttle: '0.5', steer: '(r_min - l_min) * 0.03' } },
          { if: 'f_min >= 25', then: { throttle: '0.6', steer: '0' } },
          { if: 'l_min < 8 && r_min > 12', then: { throttle: '0.4', steer: '0.3' } },
          { if: 'r_min < 8 && l_min > 12', then: { throttle: '0.4', steer: '-0.3' } }
        ],
        medium: [
          { if: 'f_min < 12', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.07' } },
          { if: 'f_min >= 12 && f_min < 22', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.04' } },
          { if: 'f_min >= 22', then: { throttle: '0.8', steer: '(r_min - l_min) * 0.02' } },
          { if: 'l_min < 6 && r_min > 10', then: { throttle: '0.5', steer: '0.4' } },
          { if: 'r_min < 6 && l_min > 10', then: { throttle: '0.5', steer: '-0.4' } }
        ],
        hard: [
          { if: 'f_min < 10', then: { throttle: '0.1', steer: '(r_min - l_min) * 0.09' } },
          { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.05' } },
          { if: 'f_min >= 20', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.03' } },
          { if: 'l_min < 5 && r_min > 8', then: { throttle: '0.6', steer: '0.5' } },
          { if: 'r_min < 5 && l_min > 8', then: { throttle: '0.6', steer: '-0.5' } },
          { if: 'speed > 20 && f_min < 15', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.06' } }
        ]
      }
    };

    const rules = algorithms[trackType]?.[difficulty] || algorithms.flat.medium;
    
    return {
      rules: rules,
      difficulty: difficulty,
      trackType: trackType,
      source: 'fallback'
    };
  }

  analyzePlayerStrategy(playerRules) {
    if (!playerRules || playerRules.length === 0) {
      return 'Player uses default strategy';
    }

    let analysis = 'Player strategy: ';
    const strategies = [];

    // Analyze aggression level
    const throttleValues = playerRules
      .map(rule => rule.then?.throttle)
      .filter(t => t && !isNaN(parseFloat(t)))
      .map(t => parseFloat(t));
    
    if (throttleValues.length > 0) {
      const avgThrottle = throttleValues.reduce((a, b) => a + b, 0) / throttleValues.length;
      if (avgThrottle > 0.8) strategies.push('very aggressive');
      else if (avgThrottle > 0.6) strategies.push('moderately aggressive');
      else strategies.push('conservative');
    }

    // Analyze steering behavior
    const hasComplexSteering = playerRules.some(rule => 
      rule.then?.steer && rule.then.steer.includes('r_min - l_min')
    );
    if (hasComplexSteering) strategies.push('uses adaptive steering');

    // Analyze condition complexity
    const hasSpeedConditions = playerRules.some(rule => 
      rule.if && rule.if.includes('speed')
    );
    if (hasSpeedConditions) strategies.push('considers speed in decisions');

    return analysis + strategies.join(', ');
  }
}

export const cerebrasAI = new CerebrasAI();
export default cerebrasAI;