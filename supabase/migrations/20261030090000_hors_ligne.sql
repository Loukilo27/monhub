-- Hors-ligne : « la dernière modification gagne ».
--
-- Les modifications faites sans réseau sont envoyées plus tard, au retour de la connexion.
-- L'app indique alors dans updated_at l'heure à laquelle la modification a été faite :
--   * plus ancienne que la version enregistrée (modifiée entre-temps sur un autre appareil) :
--     elle est ignorée ;
--   * sinon elle est appliquée, avec cette heure (jamais dans le futur).
-- Une modification qui ne touche pas à updated_at (serveur, tâches planifiées) prend l'heure actuelle.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  elsif new.updated_at < old.updated_at then
    return null;
  else
    new.updated_at := least(new.updated_at, now());
  end if;
  return new;
end;
$$;
