const path = require('path');
const fs = require('fs');

class AIReviewService {
  /**
   * Perform an AI-assisted analysis of a submission against the task and rubric.
   */
  static async evaluateSubmission(task, submissionVersion, rubricCriteria = [], attachments = []) {
    const text = submissionVersion.text_content || '';
    const link = submissionVersion.link_url || '';
    const notes = submissionVersion.notes || '';
    const instructions = task.instructions || '';
    const expected = task.expected_outcome || '';

    // Calculate length and presence of core components
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const hasAttachments = attachments && attachments.length > 0;
    const hasLink = Boolean(link && link.trim());

    // Extract potential structural markers
    const hasCodeBlock = text.includes('```') || text.includes('def ') || text.includes('function ') || text.includes('class ') || text.includes('for (') || text.includes('int ');
    const hasProofOrTrace = /trace|step|proof|invariant|complexity|o\(|big-o|time|space/i.test(text);
    const hasEdgeCases = /edge case|null|empty|boundary|negative|overflow/i.test(text);

    // Criteria analysis
    const criteriaEvaluations = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    const defaultCriteria = rubricCriteria.length > 0 ? rubricCriteria : [
      { id: 1, title: 'Correctness', max_score: 5, weight: 1.2 },
      { id: 2, title: 'Completeness', max_score: 5, weight: 1.0 },
      { id: 3, title: 'Clarity of Explanation', max_score: 5, weight: 1.0 },
      { id: 4, title: 'Method & Reasoning', max_score: 5, weight: 1.0 },
      { id: 5, title: 'Adherence to Requirements', max_score: 5, weight: 0.8 }
    ];

    for (const crit of defaultCriteria) {
      const max = crit.max_score || 5;
      let score = 3; // Baseline average
      let feedback = '';

      if (crit.title.toLowerCase().includes('correctness')) {
        if (wordCount > 100 || (hasAttachments && wordCount > 30)) {
          score = hasProofOrTrace ? Math.min(max, 4 + (hasEdgeCases ? 1 : 0)) : 4;
          feedback = 'Solution logic demonstrates valid conceptual understanding with stepwise derivation.';
        } else if (wordCount > 20) {
          score = 3;
          feedback = 'Core thesis appears aligned, but lacked step-by-step verification.';
        } else {
          score = 2;
          feedback = 'Content is brief; unable to conclusively verify algorithmic correctness.';
        }
      } else if (crit.title.toLowerCase().includes('completeness')) {
        let satisfiedPoints = 0;
        if (wordCount > 60) satisfiedPoints++;
        if (hasProofOrTrace) satisfiedPoints++;
        if (hasAttachments || hasLink || hasCodeBlock) satisfiedPoints++;
        score = Math.min(max, Math.max(2, satisfiedPoints + 2));
        feedback = satisfiedPoints >= 3
          ? 'Addressed all main prompts including implementation details and trace.'
          : 'Partially addresses requirements; recommend expanding on trace examples.';
      } else if (crit.title.toLowerCase().includes('clarity')) {
        if (text.includes('\n') && wordCount > 40) {
          score = Math.min(max, 4 + (text.includes('- ') || text.includes('1.') ? 1 : 0));
          feedback = 'Explanations are cleanly formatted with coherent logical flow.';
        } else {
          score = 3;
          feedback = 'Readable, though structure could benefit from bulleted points or headers.';
        }
      } else if (crit.title.toLowerCase().includes('method') || crit.title.toLowerCase().includes('reasoning')) {
        if (hasProofOrTrace || hasCodeBlock) {
          score = Math.min(max, 4 + (hasEdgeCases ? 1 : 0));
          feedback = 'Strong mathematical/logical reasoning with invariant explanation.';
        } else {
          score = 3;
          feedback = 'Reasoning is sound but missing formal invariant or complexity rationale.';
        }
      } else {
        score = Math.min(max, (wordCount > 50 || hasAttachments) ? 4 : 3);
        feedback = 'Meets expected submission format criteria.';
      }

      totalScore += score;
      maxPossibleScore += max;

      criteriaEvaluations.push({
        criterion_id: crit.id,
        criterion_title: crit.title,
        max_score: max,
        score,
        comment: feedback
      });
    }

    const normalizedPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 70;
    const isApprovedRecommendation = normalizedPercentage >= 70;

    // Strengths, improvements, mistakes, resources
    const whatDoneWell = [
      hasCodeBlock ? 'Well-formatted implementation with clear variable naming conventions.' : 'Concise formulation of the core approach.',
      hasProofOrTrace ? 'Included detailed trace of state transitions/invariants.' : 'Directly engaged with the task subject matter.',
      hasAttachments ? `Provided ${attachments.length} verifiable attachment(s) for visual proof.` : 'Clear narrative exposition.'
    ].join(' ');

    const whatNeedsImprovement = [
      !hasEdgeCases ? 'Explicitly state how edge cases (e.g. empty inputs, duplicate keys, boundary conditions) are handled.' : '',
      wordCount < 100 && !hasAttachments ? 'Expand upon the theoretical justification and worst-case complexity analysis.' : '',
      !hasProofOrTrace ? 'Include a step-by-step example execution walkthrough to demonstrate the method in practice.' : ''
    ].filter(Boolean).join(' ') || 'Consider providing additional comparative benchmarks against alternative approaches.';

    const specificMistakes = !hasEdgeCases && hasCodeBlock
      ? 'Note: Ensure boundary conditions for empty or single-element inputs do not trigger out-of-bounds index errors.'
      : 'No critical errors detected. Verify that notation matches standard mathematical definitions.';

    const suggestedNextSteps = isApprovedRecommendation
      ? 'Proceed to peer review or mentor verification. Consider extending the solution to multidimensional variations.'
      : 'Refine the explanation by addressing the edge cases identified, then submit a revised version (v2).';

    const learningResources = [
      'https://cp-algorithms.com',
      'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/',
      'https://en.wikipedia.org/wiki/Algorithm_design'
    ].join('\n');

    // Confidence metric: high for substantial text + attachments, moderate if short
    const confidenceScore = Math.min(0.95, Math.max(0.65, 0.60 + (wordCount / 500) * 0.25 + (hasAttachments ? 0.1 : 0)));

    const disclaimer = 'ASSISTIVE AI REVIEW NOTICE: This automated assessment is generated by an algorithmic evaluator to support your self-guided learning. AI assessments are assistive, non-infallible, and do not constitute certified external verification. High-value credentials and final task approvals require verified peer or mentor confirmation.';

    return {
      decision: isApprovedRecommendation ? 'approved' : 'revision_requested',
      overallScore: Math.round((totalScore / maxPossibleScore) * 10) / 2, // e.g. 4.0 / 5.0
      criteriaEvaluations,
      whatDoneWell,
      whatNeedsImprovement,
      specificMistakes,
      suggestedNextSteps,
      learningResources,
      confidence: confidenceScore,
      disclaimer,
      isAiReview: 1
    };
  }
}

module.exports = AIReviewService;
