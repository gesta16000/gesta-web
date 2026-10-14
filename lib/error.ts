/**
 * Extrait un message d'erreur lisible depuis une valeur de type `unknown`
 * (type recommandé pour les blocs `catch` en TypeScript strict, à la place
 * de `any`), sans utiliser de cast non sûr.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erreur inconnue';
}
