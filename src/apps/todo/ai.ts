import { cachedRows, loadRows, num, str } from '../../assistant/helpers'
import type { AiTool } from '../../assistant/types'
import { newTask } from './data'
import { describeDue, localToday, tasksForView } from './logic'
import type { Task, TodoList, TodoView } from './types'

const VIEWS: Record<string, TodoView> = { aujourdhui: 'today', a_venir: 'upcoming', en_retard: 'overdue', toutes: 'all', terminees: 'completed' }

export const todoTools: AiTool[] = [
  {
    name: 'lister_taches',
    description: 'Liste les tâches : du jour (retard compris), à venir, en retard, toutes ou terminées ; recherche facultative.',
    parameters: {
      type: 'object',
      properties: {
        vue: { type: 'string', enum: Object.keys(VIEWS), description: 'Par défaut : toutes' },
        recherche: { type: 'string', description: 'Mot à chercher dans le titre' },
      },
    },
    confirm: false,
    summarize: () => 'Consultation des tâches',
    execute: async (args, ctx) => {
      const [tasks, lists] = await Promise.all([loadRows<Task>(ctx, 'tasks'), loadRows<TodoList>(ctx, 'todo_lists')])
      const today = localToday(new Date(), ctx.timeZone)
      const needle = str(args.recherche).toLowerCase()
      const found = tasksForView(tasks, VIEWS[str(args.vue)] ?? 'all', today).filter((task) => !needle || task.title.toLowerCase().includes(needle))
      return {
        taches: found.slice(0, 40).map((task) => ({
          id: task.id,
          titre: task.title,
          echeance: task.due_date ? describeDue(task, today) : undefined,
          priorite: task.priority < 4 ? task.priority : undefined,
          liste: lists.find((list) => list.id === task.list_id)?.name,
          faite: Boolean(task.completed_at),
        })),
        total: found.length,
      }
    },
  },
  {
    name: 'ajouter_tache',
    description: 'Ajoute une tâche à la to-do.',
    parameters: {
      type: 'object',
      properties: {
        titre: { type: 'string' },
        date: { type: 'string', description: 'Échéance AAAA-MM-JJ' },
        heure: { type: 'string', description: 'Heure HH:MM' },
        priorite: { type: 'integer', description: '1 = urgente, 2 = haute, 3 = moyenne, 4 = aucune' },
        liste: { type: 'string', description: 'Nom de la liste (Perso, Travail, Courses…)' },
        rappel_minutes_avant: { type: 'integer', description: 'Rappel X minutes avant l’échéance (0 = à l’heure)' },
      },
      required: ['titre'],
    },
    confirm: true,
    summarize: (args, ctx) => {
      const due = str(args.date) ? ` pour ${describeDue({ due_date: str(args.date), due_time: str(args.heure) || null }, localToday(new Date(), ctx.timeZone))}` : ''
      const list = str(args.liste) ? ` dans « ${str(args.liste)} »` : ''
      return `Ajouter la tâche « ${str(args.titre)} »${due}${list}`
    },
    execute: async (args, ctx) => {
      const lists = await loadRows<TodoList>(ctx, 'todo_lists')
      if (!lists.length) await ctx.todo.createDefaultLists()
      const all = lists.length ? lists : await loadRows<TodoList>(ctx, 'todo_lists')
      const wanted = str(args.liste).toLowerCase()
      const list = all.find((item) => item.name.toLowerCase() === wanted) ?? [...all].sort((a, b) => a.position - b.position)[0]
      if (!list) return { erreur: 'Aucune liste disponible.' }
      const date = /^\d{4}-\d{2}-\d{2}$/.test(str(args.date)) ? str(args.date) : null
      const time = /^\d{2}:\d{2}$/.test(str(args.heure)) ? str(args.heure) : null
      const priority = num(args.priorite)
      const task = newTask(list.id, {
        title: str(args.titre),
        due_date: date,
        due_time: date ? time : null,
        priority: priority && priority >= 1 && priority <= 4 ? priority : 4,
        reminder_offset_minutes: date && num(args.rappel_minutes_avant) !== null ? num(args.rappel_minutes_avant) : null,
      })
      await ctx.todo.addTask(task)
      return { ok: true, id: task.id, liste: list.name }
    },
  },
  {
    name: 'cocher_tache',
    description: 'Marque une tâche comme faite (identifiant obtenu avec lister_taches).',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    confirm: false,
    summarize: (args, ctx) => `Tâche cochée : « ${cachedRows<Task>(ctx, 'tasks').find((task) => task.id === str(args.id))?.title ?? '?'} »`,
    execute: async (args, ctx) => {
      const task = (await loadRows<Task>(ctx, 'tasks')).find((item) => item.id === str(args.id))
      if (!task) return { erreur: 'Tâche introuvable.' }
      if (!task.completed_at) await ctx.todo.toggleComplete(task)
      return { ok: true, titre: task.title, recurrente: Boolean(task.recurrence_rule) }
    },
  },
]
