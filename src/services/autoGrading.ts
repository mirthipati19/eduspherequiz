/**
 * Auto-grading service for short-answer questions
 * Evaluates student responses against expected keywords and assigns partial credit
 */

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  weight: number;
}

export interface GradingResult {
  score: number;
  maxScore: number;
  percentage: number;
  matchedKeywords: KeywordMatch[];
}

/**
 * Normalizes text for comparison by:
 * - Converting to lowercase
 * - Removing extra whitespace
 * - Removing punctuation
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a keyword/phrase exists in the student's answer
 */
function containsKeyword(answer: string, keyword: string): boolean {
  const normalizedAnswer = normalizeText(answer);
  const normalizedKeyword = normalizeText(keyword);
  
  // Check for exact phrase match
  if (normalizedAnswer.includes(normalizedKeyword)) {
    return true;
  }
  
  // Check if all words from keyword appear in answer (flexible matching)
  const keywordWords = normalizedKeyword.split(' ');
  const answerWords = normalizedAnswer.split(' ');
  
  const allWordsPresent = keywordWords.every(keywordWord => 
    answerWords.some(answerWord => 
      answerWord.includes(keywordWord) || keywordWord.includes(answerWord)
    )
  );
  
  return allWordsPresent;
}

/**
 * Grades a short-answer response based on keyword matching
 * 
 * @param studentAnswer - The student's text response
 * @param expectedKeywords - Array of expected keywords/phrases
 * @param keywordWeightage - Object mapping keywords to their point values
 * @param totalPoints - Total points available for the question
 * @returns GradingResult with score and detailed matches
 */
export function gradeShortAnswer(
  studentAnswer: string,
  expectedKeywords: string[],
  keywordWeightage: Record<string, number>,
  totalPoints: number
): GradingResult {
  if (!studentAnswer || !expectedKeywords || expectedKeywords.length === 0) {
    return {
      score: 0,
      maxScore: totalPoints,
      percentage: 0,
      matchedKeywords: []
    };
  }

  const matches: KeywordMatch[] = [];
  let earnedPoints = 0;
  let maxPossiblePoints = 0;

  // Evaluate each keyword
  for (const keyword of expectedKeywords) {
    const weight = keywordWeightage[keyword] || 1;
    const found = containsKeyword(studentAnswer, keyword);
    
    maxPossiblePoints += weight;
    if (found) {
      earnedPoints += weight;
    }

    matches.push({
      keyword,
      found,
      weight
    });
  }

  // Normalize score to match question's total points
  const normalizedScore = maxPossiblePoints > 0 
    ? (earnedPoints / maxPossiblePoints) * totalPoints 
    : 0;

  return {
    score: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
    maxScore: totalPoints,
    percentage: maxPossiblePoints > 0 ? (earnedPoints / maxPossiblePoints) * 100 : 0,
    matchedKeywords: matches
  };
}

/**
 * Determines if a short-answer response requires manual review
 * based on score threshold or ambiguous matching
 */
export function requiresManualReview(
  gradingResult: GradingResult,
  reviewThreshold: number = 50
): boolean {
  // Require review if score is in the middle range (40-60%)
  if (gradingResult.percentage >= 40 && gradingResult.percentage <= 60) {
    return true;
  }
  
  // Require review if the answer is extremely short or long
  // (handled by caller passing additional context if needed)
  
  return false;
}
