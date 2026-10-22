import { AppPlaceholder } from '../../components/AppPlaceholder'

export default function MusicPage() {
  return (
    <AppPlaceholder
      phase={9}
      features={[
        'Tops du mois et de l’année via Last.fm',
        'Titre en cours d’écoute',
        'Lecteur Spotify intégré',
      ]}
    />
  )
}
