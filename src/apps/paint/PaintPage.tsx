import { AppPlaceholder } from '../../components/AppPlaceholder'

export default function PaintPage() {
  return (
    <AppPlaceholder
      phase={8}
      features={[
        'Pinceau, gomme, formes, texte',
        'Annuler / rétablir',
        'Galerie avec export PNG',
      ]}
    />
  )
}
