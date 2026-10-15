import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GESTA - Gestion des Dépenses',
    short_name: 'GESTA',
    description: 'Application de gestion des dépenses, budgets et contrats.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    // ⚠️ PAS de section 'icons' ici - Next.js gère automatiquement icon.png
  }
}