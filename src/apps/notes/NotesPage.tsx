import { AppPlaceholder } from '../../components/AppPlaceholder'

export default function NotesPage() {
  return (
    <AppPlaceholder
      phase={7}
      features={[
        'Éditeur riche (polices, couleurs, surlignage)',
        'Recherche, épingles, étiquettes',
        'Sauvegarde automatique',
        'Corbeille 30 jours',
      ]}
    />
  )
}
