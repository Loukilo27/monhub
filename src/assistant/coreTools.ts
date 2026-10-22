import { APPS } from '../apps/registry'
import { str } from './helpers'
import type { AiTool } from './types'

const THEMES = { clair: 'light', sombre: 'dark', automatique: 'system' } as const

/** Outils communes à toute l'app (navigation, thème). */
export const coreTools: AiTool[] = [
  {
    name: 'ouvrir_appli',
    description: 'Ouvre une mini-appli, les réglages ou l’accueil.',
    parameters: {
      type: 'object',
      properties: { appli: { type: 'string', enum: [...APPS.map((app) => app.id), 'reglages', 'accueil'], description: APPS.map((app) => `${app.id} = ${app.name}`).join(', ') } },
      required: ['appli'],
    },
    confirm: false,
    summarize: (args) => `Ouverture de ${APPS.find((app) => app.id === str(args.appli))?.name ?? str(args.appli)}`,
    execute: async (args, ctx) => {
      const target = str(args.appli)
      ctx.navigate(target === 'reglages' ? '/settings' : target === 'accueil' ? '/' : `/app/${target}`)
      return { ok: true }
    },
  },
  {
    name: 'changer_theme',
    description: 'Change le thème de l’app.',
    parameters: { type: 'object', properties: { theme: { type: 'string', enum: Object.keys(THEMES) } }, required: ['theme'] },
    confirm: false,
    summarize: (args) => `Thème ${str(args.theme)}`,
    execute: async (args, ctx) => {
      const theme = THEMES[str(args.theme) as keyof typeof THEMES]
      if (!theme) return { erreur: 'Thème inconnu.' }
      ctx.setTheme(theme)
      return { ok: true }
    },
  },
]
