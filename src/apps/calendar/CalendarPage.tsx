import { AppPlaceholder } from '../../components/AppPlaceholder'

export default function CalendarPage() {
  return (
    <AppPlaceholder
      phase={6}
      features={[
        'Vues mois, semaine, jour, agenda',
        'Événements récurrents',
        'Rappels multiples',
        'Tâches datées affichées',
      ]}
    />
  )
}
