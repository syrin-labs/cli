/**
 * Semantic similarity module using embedding-based approach.
 * Uses sentence-transformers (Xenova/all-MiniLM-L6-v2) for semantic embeddings.
 *
 * This provides true semantic understanding without hardcoded synonyms.
 */

import {
  pipeline,
  type FeatureExtractionPipeline,
  type Tensor,
} from '@xenova/transformers';

/**
 * Embedding model name - lightweight but effective.
 * all-MiniLM-L6-v2: 90MB, 384 dimensions, fast inference
 */
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/**
 * Singleton embedding pipeline - lazy loaded.
 */
let embeddingPipeline: FeatureExtractionPipeline | null = null;

/**
 * Get or initialize the embedding pipeline.
 * Uses lazy loading to avoid startup overhead.
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
      quantized: true,
    });
  }
  return embeddingPipeline;
}

/**
 * Embedding cache to avoid recomputing for same text.
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Convert Tensor data to number array.
 */
function tensorToNumberArray(tensor: Tensor): number[] {
  const data = tensor.data;

  if (Array.isArray(data)) {
    return data.map((item): number => {
      if (typeof item === 'bigint') {
        return Number(item);
      }
      return Number(item);
    });
  }

  // Handle TypedArray - convert to regular array using typed array iteration
  const result: number[] = [];
  // Use for...of to iterate TypedArray without explicit any
  for (const val of data) {
    result.push(typeof val === 'bigint' ? Number(val) : Number(val));
  }
  return result;
}

/**
 * Generate embedding for a text string.
 * Uses mean pooling to get a fixed-size vector.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.toLowerCase().trim();

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const extractor = await getEmbeddingPipeline();

  const output = await extractor(cacheKey, {
    pooling: 'mean',
    normalize: true,
  });

  const embedding = tensorToNumberArray(output);

  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

/**
 * Clear the embedding cache.
 * Useful for testing or when memory is a concern.
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * Returns value between -1 and 1 (usually 0 to 1 for normalized vectors).
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    const v1 = vec1[i] ?? 0;
    const v2 = vec2[i] ?? 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calculate semantic similarity between two texts using embeddings.
 * Returns a score between 0 and 1.
 */
export async function calculateEmbeddingSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  if (!text1 || !text2) return 0.0;

  // Quick check for exact match
  if (text1.toLowerCase().trim() === text2.toLowerCase().trim()) {
    return 1.0;
  }

  const [embedding1, embedding2] = await Promise.all([
    getEmbedding(text1),
    getEmbedding(text2),
  ]);

  return cosineSimilarity(embedding1, embedding2);
}

/**
 * Check if a parameter name is semantically mentioned in a description.
 * Uses embeddings for true semantic understanding.
 *
 * @param description - The tool/field description
 * @param paramName - The parameter name to check
 * @param threshold - Similarity threshold (default 0.6)
 * @returns true if the parameter is semantically mentioned
 */
export async function isParameterMentionedInDescriptionEmbedding(
  description: string,
  paramName: string,
  threshold: number = 0.6
): Promise<boolean> {
  if (!description || !paramName) return false;

  const descLower = description.toLowerCase();
  const paramLower = paramName.toLowerCase();

  // 1. Exact substring match
  if (descLower.includes(paramLower)) {
    return true;
  }

  // 2. Check if param words appear in description
  const paramWords = paramLower.split(/[\s_-]+/).filter(w => w.length > 1);
  const descWords = descLower.split(/[\s_-]+/).filter(w => w.length > 1);

  for (const word of paramWords) {
    if (descWords.includes(word)) {
      return true;
    }
  }

  // 3. Semantic similarity using embeddings
  // Create combined text for better context
  const paramText = paramLower
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const similarity = await calculateEmbeddingSimilarity(paramText, descLower);

  return similarity >= threshold;
}

/**
 * Batch compute embeddings for multiple texts.
 * More efficient than calling getEmbedding individually.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(text => getEmbedding(text)));
}

/**
 * Find the most similar text from a list.
 * Useful for matching params to descriptions.
 */
export async function findMostSimilar(
  query: string,
  candidates: string[]
): Promise<{ text: string; similarity: number }> {
  const queryEmbedding = await getEmbedding(query);

  let bestMatch = '';
  let bestSimilarity = -1;

  for (const candidate of candidates) {
    const candidateEmbedding = await getEmbedding(candidate);
    const similarity = cosineSimilarity(queryEmbedding, candidateEmbedding);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  return { text: bestMatch, similarity: bestSimilarity };
}

/**
 * Calculate semantic similarity between two field names or descriptions.
 * Promise-based version using embeddings.
 */
export async function calculateSemanticSimilarityEmbedding(
  text1: string,
  text2: string
): Promise<number> {
  return calculateEmbeddingSimilarity(text1, text2);
}

/**
 * Pre-warm the embedding model.
 * Call this during startup if you want embeddings ready immediately.
 */
export async function warmUpEmbeddingModel(): Promise<void> {
  await getEmbedding('warmup');
}

/**
 * Get embedding cache size (useful for debugging/monitoring).
 */
export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}

/**
 * Calculate similarity between a field and description.
 * Combines field name, type, and description for better matching.
 */
export async function getFieldDescriptionSimilarity(
  fieldName: string,
  fieldType: string,
  fieldDescription: string,
  toolDescription: string
): Promise<number> {
  const textsToCompare = [
    fieldName,
    `${fieldName} ${fieldType}`,
    fieldDescription,
    `${fieldName} ${fieldDescription}`,
  ];

  const toolEmbedding = await getEmbedding(toolDescription);

  let bestSimilarity = 0;

  for (const text of textsToCompare) {
    const fieldEmbedding = await getEmbedding(text);
    const similarity = cosineSimilarity(toolEmbedding, fieldEmbedding);
    bestSimilarity = Math.max(bestSimilarity, similarity);
  }

  return bestSimilarity;
}

// ============================================================================
// SYNCHRONOUS FUNCTIONS USING PRE-COMPUTED EMBEDDINGS
// ============================================================================

/**
 * Calculate similarity between two pre-computed embedding vectors.
 * Synchronous - uses pre-computed embeddings.
 */
export function getSimilarityFromEmbeddings(
  embedding1: number[] | undefined,
  embedding2: number[] | undefined
): number {
  if (
    !embedding1 ||
    !embedding2 ||
    embedding1.length === 0 ||
    embedding2.length === 0
  ) {
    return 0;
  }
  return cosineSimilarity(embedding1, embedding2);
}

/**
 * Check if a field is mentioned in description using pre-computed embeddings.
 * Synchronous - uses pre-computed embeddings from ToolSpec.
 *
 * @param descriptionEmbedding - Pre-computed embedding for the description
 * @param fieldEmbedding - Pre-computed embedding for the field
 * @param threshold - Similarity threshold (default 0.5)
 * @returns true if the field is semantically similar to the description
 */
export function isFieldMentionedWithEmbedding(
  descriptionEmbedding: number[] | undefined,
  fieldEmbedding: number[] | undefined,
  threshold: number = 0.5
): boolean {
  if (!descriptionEmbedding || !fieldEmbedding) {
    return false;
  }
  const similarity = cosineSimilarity(descriptionEmbedding, fieldEmbedding);
  return similarity >= threshold;
}

/**
 * Check if any input field is mentioned in description using pre-computed embeddings.
 * Synchronous - uses pre-computed embeddings from ToolSpec.
 */
export function areInputFieldsMentioned(
  descriptionEmbedding: number[] | undefined,
  inputEmbeddings: Map<string, number[]> | undefined,
  threshold: number = 0.5
): { mentioned: string[]; unmentioned: string[] } {
  const mentioned: string[] = [];
  const unmentioned: string[] = [];

  if (!inputEmbeddings || !descriptionEmbedding) {
    return { mentioned, unmentioned };
  }

  for (const [fieldName, fieldEmbedding] of inputEmbeddings) {
    const similarity = cosineSimilarity(descriptionEmbedding, fieldEmbedding);
    if (similarity >= threshold) {
      mentioned.push(fieldName);
    } else {
      unmentioned.push(fieldName);
    }
  }

  return { mentioned, unmentioned };
}

/**
 * Find the best matching input field for a given embedding.
 * Useful for dependency detection.
 */
export function findBestMatchingField(
  targetEmbedding: number[] | undefined,
  fieldEmbeddings: Map<string, number[]> | undefined,
  threshold: number = 0.5
): { fieldName: string; similarity: number } | null {
  if (!targetEmbedding || !fieldEmbeddings || fieldEmbeddings.size === 0) {
    return null;
  }

  let bestMatch: { fieldName: string; similarity: number } | null = null;

  for (const [fieldName, fieldEmbedding] of fieldEmbeddings) {
    const similarity = cosineSimilarity(targetEmbedding, fieldEmbedding);
    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { fieldName, similarity };
      }
    }
  }

  return bestMatch;
}

// ============================================================================
// CONCEPT EMBEDDINGS FOR SEMANTIC RULE CHECKING
// ============================================================================

export const CONCEPT_CATEGORIES = {
  USER_DATA: [
    'user data',
    'personal information',
    'PII',
    'person name',
    'email address',
    'user profile',
    'user account',
    'user identity',
    'user preferences',
    'user contact',
    'user location',
  ],
  SENSITIVE: [
    'credentials',
    'password',
    'secret',
    'API key',
    'access token',
    'authentication',
    'private key',
    'security token',
    'sensitive data',
    'confidential',
  ],
  RETURNS_DATA: [
    'returns data',
    'returns result',
    'fetches data',
    'retrieves information',
    'search results',
    'query results',
    'gets data',
    'finds records',
    'lists items',
    'returns output',
  ],
  IDEMPOTENT: [
    'idempotent',
    'safe to retry',
    'can be retried',
    'same result',
    'exactly once',
    'only once',
    'deduplication',
    'safe retry',
  ],
  MUTATION: [
    'create',
    'update',
    'delete',
    'remove',
    'modify',
    'add',
    'insert',
    'set',
    'change',
    'alter',
    'replace',
    'upsert',
    'patch',
    'merge',
    'publish',
    'send',
  ],
} as const;

type ConceptCategory = keyof typeof CONCEPT_CATEGORIES;

const conceptEmbeddings: Map<ConceptCategory, number[][]> = new Map();
let conceptEmbeddingsInitialized = false;

export async function initializeConceptEmbeddings(): Promise<void> {
  if (conceptEmbeddingsInitialized) {
    return;
  }

  for (const [category, concepts] of Object.entries(CONCEPT_CATEGORIES)) {
    const embeddings = await Promise.all(
      concepts.map(async concept => await getEmbedding(concept))
    );
    conceptEmbeddings.set(category as ConceptCategory, embeddings);
  }

  conceptEmbeddingsInitialized = true;
}

export function isConceptMatch(
  fieldEmbedding: number[] | undefined,
  category: ConceptCategory,
  threshold: number = 0.4
): boolean {
  if (!fieldEmbedding || !conceptEmbeddingsInitialized) {
    return false;
  }

  const conceptEmbeddingsList = conceptEmbeddings.get(category);
  if (!conceptEmbeddingsList || conceptEmbeddingsList.length === 0) {
    return false;
  }

  for (const conceptEmbedding of conceptEmbeddingsList) {
    const similarity = cosineSimilarity(fieldEmbedding, conceptEmbedding);
    if (similarity >= threshold) {
      return true;
    }
  }

  return false;
}

export function getConceptSimilarity(
  fieldEmbedding: number[] | undefined,
  category: ConceptCategory
): number {
  if (!fieldEmbedding || !conceptEmbeddingsInitialized) {
    return 0;
  }

  const conceptEmbeddingsList = conceptEmbeddings.get(category);
  if (!conceptEmbeddingsList || conceptEmbeddingsList.length === 0) {
    return 0;
  }

  let maxSimilarity = 0;
  for (const conceptEmbedding of conceptEmbeddingsList) {
    const similarity = cosineSimilarity(fieldEmbedding, conceptEmbedding);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  return maxSimilarity;
}
