import { AppPlaceholder } from '../../components/AppPlaceholder'

export default function TodoPage() {
  return (
    <AppPlaceholder
      phase={6}
      features={[
        'Listes multiples',
        'Priorités, étiquettes, sous-tâches',
        'Tâches récurrentes',
        'Rappels',
        'Liaison avec le calendrier',
      ]}
    />
  )
}
