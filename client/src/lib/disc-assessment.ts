export interface DiscQuestion {
  id: string;
  situation: string;
  options: {
    id: string;
    text: string;
    trait: 'D' | 'I' | 'S' | 'C';
    weight: number;
  }[];
  category: 'work' | 'communication' | 'stress' | 'decision-making' | 'social';
}

export interface DiscResponse {
  questionId: string;
  selectedOptions: string[];
  intensity: number; // 1-5 scale
}

export interface DiscResults {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
  primaryStyle: string;
  secondaryStyle?: string;
  naturalVsAdapted: {
    natural: { D: number; I: number; S: number; C: number };
    adapted: { D: number; I: number; S: number; C: number };
  };
  detailedAnalysis: {
    communicationStyle: string;
    decisionMaking: string;
    stressResponse: string;
    motivationFactors: string[];
    potentialBlindSpots: string[];
  };
}

export const DISC_QUESTIONS: DiscQuestion[] = [
  {
    id: "q1",
    situation: "When working on a sales project with tight deadlines, you typically:",
    options: [
      { id: "a", text: "Take charge and push for immediate action", trait: "D", weight: 3 },
      { id: "b", text: "Rally the team with enthusiasm and optimism", trait: "I", weight: 3 },
      { id: "c", text: "Create a detailed plan and follow it systematically", trait: "C", weight: 3 },
      { id: "d", text: "Support team members and ensure everyone is comfortable", trait: "S", weight: 3 }
    ],
    category: "work"
  },
  {
    id: "q2",
    situation: "During a difficult client negotiation, your natural response is to:",
    options: [
      { id: "a", text: "Be direct and assertive about your position", trait: "D", weight: 3 },
      { id: "b", text: "Use charm and persuasion to win them over", trait: "I", weight: 3 },
      { id: "c", text: "Listen carefully and find common ground", trait: "S", weight: 3 },
      { id: "d", text: "Present detailed facts and logical arguments", trait: "C", weight: 3 }
    ],
    category: "communication"
  },
  {
    id: "q3",
    situation: "When presenting to potential investors, you prefer to:",
    options: [
      { id: "a", text: "Focus on bottom-line results and ROI", trait: "D", weight: 3 },
      { id: "b", text: "Tell engaging stories and build excitement", trait: "I", weight: 3 },
      { id: "c", text: "Provide comprehensive data and analysis", trait: "C", weight: 3 },
      { id: "d", text: "Build trust through relationships and testimonials", trait: "S", weight: 3 }
    ],
    category: "communication"
  },
  {
    id: "q4",
    situation: "Under pressure, you tend to:",
    options: [
      { id: "a", text: "Become more decisive and action-oriented", trait: "D", weight: 3 },
      { id: "b", text: "Seek support and collaboration from others", trait: "I", weight: 2 },
      { id: "c", text: "Slow down and analyze all options carefully", trait: "C", weight: 3 },
      { id: "d", text: "Maintain calm and provide stability for others", trait: "S", weight: 3 }
    ],
    category: "stress"
  },
  {
    id: "q5",
    situation: "When making important business decisions, you:",
    options: [
      { id: "a", text: "Trust your instincts and decide quickly", trait: "D", weight: 3 },
      { id: "b", text: "Seek input from trusted colleagues", trait: "I", weight: 2 },
      { id: "c", text: "Gather extensive research and data", trait: "C", weight: 3 },
      { id: "d", text: "Consider impact on all stakeholders", trait: "S", weight: 3 }
    ],
    category: "decision-making"
  },
  {
    id: "q6",
    situation: "In team meetings, you're most likely to:",
    options: [
      { id: "a", text: "Drive the agenda and keep things moving", trait: "D", weight: 3 },
      { id: "b", text: "Generate ideas and energize discussions", trait: "I", weight: 3 },
      { id: "c", text: "Listen carefully and support team harmony", trait: "S", weight: 3 },
      { id: "d", text: "Ask detailed questions and challenge assumptions", trait: "C", weight: 3 }
    ],
    category: "social"
  },
  {
    id: "q7",
    situation: "When dealing with client objections, you:",
    options: [
      { id: "a", text: "Address them head-on with confidence", trait: "D", weight: 3 },
      { id: "b", text: "Reframe them as opportunities for discussion", trait: "I", weight: 3 },
      { id: "c", text: "Acknowledge concerns and find solutions together", trait: "S", weight: 3 },
      { id: "d", text: "Prepare detailed responses with supporting evidence", trait: "C", weight: 3 }
    ],
    category: "communication"
  },
  {
    id: "q8",
    situation: "Your ideal work environment includes:",
    options: [
      { id: "a", text: "Autonomy and ability to make independent decisions", trait: "D", weight: 3 },
      { id: "b", text: "Collaborative spaces and social interaction", trait: "I", weight: 3 },
      { id: "c", text: "Stable processes and supportive relationships", trait: "S", weight: 3 },
      { id: "d", text: "Quiet focus time and detailed resources", trait: "C", weight: 3 }
    ],
    category: "work"
  },
  {
    id: "q9",
    situation: "When training new team members, you focus on:",
    options: [
      { id: "a", text: "Setting clear expectations and standards", trait: "D", weight: 3 },
      { id: "b", text: "Making learning fun and engaging", trait: "I", weight: 3 },
      { id: "c", text: "Providing patient, step-by-step guidance", trait: "S", weight: 3 },
      { id: "d", text: "Ensuring they understand all procedures", trait: "C", weight: 3 }
    ],
    category: "work"
  },
  {
    id: "q10",
    situation: "When networking at industry events, you:",
    options: [
      { id: "a", text: "Focus on meeting key decision-makers", trait: "D", weight: 3 },
      { id: "b", text: "Enjoy meeting new people and sharing stories", trait: "I", weight: 3 },
      { id: "c", text: "Build deeper connections with fewer people", trait: "S", weight: 3 },
      { id: "d", text: "Attend specific sessions relevant to your expertise", trait: "C", weight: 3 }
    ],
    category: "social"
  }
];

export function calculateDiscResults(responses: DiscResponse[]): DiscResults {
  const scores = { D: 0, I: 0, S: 0, C: 0 };
  const maxPossibleScore = responses.length * 3 * 5; // max questions * max weight * max intensity
  
  // Calculate raw scores
  responses.forEach(response => {
    const question = DISC_QUESTIONS.find(q => q.id === response.questionId);
    if (!question) return;
    
    response.selectedOptions.forEach(optionId => {
      const option = question.options.find(o => o.id === optionId);
      if (option) {
        scores[option.trait] += option.weight * response.intensity;
      }
    });
  });
  
  // Convert to percentages
  const dominance = Math.round((scores.D / maxPossibleScore) * 100);
  const influence = Math.round((scores.I / maxPossibleScore) * 100);
  const steadiness = Math.round((scores.S / maxPossibleScore) * 100);
  const conscientiousness = Math.round((scores.C / maxPossibleScore) * 100);
  
  // Determine primary and secondary styles
  const styleScores = [
    { style: 'D', score: dominance, name: 'Dominance' },
    { style: 'I', score: influence, name: 'Influence' },
    { style: 'S', score: steadiness, name: 'Steadiness' },
    { style: 'C', score: conscientiousness, name: 'Conscientiousness' }
  ].sort((a, b) => b.score - a.score);
  
  const primaryStyle = styleScores[0].style;
  const secondaryStyle = styleScores[1].score > 25 ? styleScores[1].style : undefined;
  
  // Generate detailed analysis
  const detailedAnalysis = generateDetailedAnalysis(dominance, influence, steadiness, conscientiousness, primaryStyle);
  
  return {
    dominance,
    influence,
    steadiness,
    conscientiousness,
    primaryStyle,
    secondaryStyle,
    naturalVsAdapted: {
      natural: { D: dominance, I: influence, S: steadiness, C: conscientiousness },
      adapted: { D: dominance, I: influence, S: steadiness, C: conscientiousness } // Would be different in full assessment
    },
    detailedAnalysis
  };
}

function generateDetailedAnalysis(D: number, I: number, S: number, C: number, primaryStyle: string) {
  const styles = {
    D: {
      communicationStyle: "Direct, decisive, and results-oriented. Prefers brief, to-the-point interactions.",
      decisionMaking: "Quick decisions based on available information. Comfortable with risk-taking.",
      stressResponse: "Becomes more assertive and controlling. May bypass normal processes to get results.",
      motivationFactors: ["Challenges", "Authority", "Independence", "Competition", "Results"],
      potentialBlindSpots: ["May overlook details", "Can appear impatient", "May not consider team feelings", "Might rush decisions"]
    },
    I: {
      communicationStyle: "Enthusiastic, persuasive, and people-focused. Enjoys storytelling and building rapport.",
      decisionMaking: "Considers people impact and seeks consensus. Values input from others.",
      stressResponse: "May become disorganized or overly talkative. Seeks social support to cope.",
      motivationFactors: ["Recognition", "Social interaction", "Variety", "Optimism", "Teamwork"],
      potentialBlindSpots: ["May lack attention to detail", "Can be overly optimistic", "Might avoid conflict", "May struggle with follow-through"]
    },
    S: {
      communicationStyle: "Patient, supportive, and diplomatic. Prefers harmony and consensus-building.",
      decisionMaking: "Careful consideration of all stakeholders. Prefers stable, proven approaches.",
      stressResponse: "May become withdrawn or overly accommodating. Seeks stability and support.",
      motivationFactors: ["Security", "Harmony", "Service to others", "Stability", "Appreciation"],
      potentialBlindSpots: ["May resist change", "Can be too accommodating", "Might avoid confrontation", "May be slow to adapt"]
    },
    C: {
      communicationStyle: "Precise, analytical, and detail-oriented. Prefers factual, data-driven discussions.",
      decisionMaking: "Thorough analysis of all available data. Seeks quality and accuracy in decisions.",
      stressResponse: "May become overly critical or withdrawn. Focuses on maintaining quality standards.",
      motivationFactors: ["Quality", "Accuracy", "Expertise", "Systems", "Analysis"],
      potentialBlindSpots: ["May over-analyze", "Can be too critical", "Might resist quick decisions", "May seem aloof"]
    }
  };
  
  const style = styles[primaryStyle as keyof typeof styles];
  
  return {
    communicationStyle: style.communicationStyle,
    decisionMaking: style.decisionMaking,
    stressResponse: style.stressResponse,
    motivationFactors: style.motivationFactors,
    potentialBlindSpots: style.potentialBlindSpots
  };
}

export function getStyleName(style: string): string {
  const names = {
    D: 'Dominant',
    I: 'Influential',
    S: 'Steady',
    C: 'Conscientious'
  };
  return names[style as keyof typeof names] || style;
}

export function getStyleDescription(style: string): string {
  const descriptions = {
    D: 'Direct, results-driven, and decisive. Thrives on challenges and takes charge in difficult situations.',
    I: 'Optimistic, enthusiastic, and people-oriented. Excels at motivating others and building relationships.',
    S: 'Patient, supportive, and reliable. Values stability and works well in team environments.',
    C: 'Analytical, precise, and quality-focused. Excels at detailed work and systematic approaches.'
  };
  return descriptions[style as keyof typeof descriptions] || style;
}

export function getCoachingRecommendations(results: DiscResults): string[] {
  const { primaryStyle, dominance, influence, steadiness, conscientiousness } = results;
  
  const recommendations: string[] = [];
  
  // Primary style recommendations
  if (primaryStyle === 'D') {
    recommendations.push("Practice active listening to better understand client needs");
    recommendations.push("Take time to explain the 'why' behind your recommendations");
    recommendations.push("Work on building rapport before diving into business details");
  } else if (primaryStyle === 'I') {
    recommendations.push("Follow up on commitments with detailed action plans");
    recommendations.push("Practice presenting facts and data to support your enthusiasm");
    recommendations.push("Develop systems to track important details and deadlines");
  } else if (primaryStyle === 'S') {
    recommendations.push("Practice assertive communication when presenting value propositions");
    recommendations.push("Work on creating urgency while maintaining your supportive approach");
    recommendations.push("Develop confidence in handling objections directly");
  } else if (primaryStyle === 'C') {
    recommendations.push("Practice simplifying complex information for different audiences");
    recommendations.push("Work on building emotional connections with clients");
    recommendations.push("Develop skills in reading non-verbal communication cues");
  }
  
  // Score-based recommendations
  if (dominance < 30) {
    recommendations.push("Practice being more assertive in negotiations");
  }
  if (influence < 30) {
    recommendations.push("Work on storytelling and emotional engagement techniques");
  }
  if (steadiness < 30) {
    recommendations.push("Focus on building long-term client relationships");
  }
  if (conscientiousness < 30) {
    recommendations.push("Develop more structured follow-up processes");
  }
  
  return recommendations.slice(0, 5); // Return top 5 recommendations
}