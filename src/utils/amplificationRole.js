// Roll out only after KEDIRI amplifier memberships have been backfilled and verified.
// This affects amplification rosters, not menu access or engagement roles.
export function usesKediriAmplifierRole(clientId) {
  return process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED === 'true' &&
    typeof clientId === 'string' && clientId.toUpperCase() === 'KEDIRI';
}

export function amplificationRole(clientId) {
  return usesKediriAmplifierRole(clientId) ? 'amplifier' : 'operator';
}

// Apply only to amplification queries: other clients retain their prior roster.
// alias is a fixed SQL alias supplied by the calling code, not user input.
export function mixedAmplificationRosterFilter(alias) {
  if (!usesKediriAmplifierRole('KEDIRI')) return '';
  if (!['u'].includes(alias)) throw new Error('Invalid roster alias');
  return ` AND (COALESCE(UPPER(TRIM(${alias}.client_id)), '') <> 'KEDIRI' OR EXISTS (
    SELECT 1 FROM user_roles mixed_ur JOIN roles mixed_role ON mixed_role.role_id = mixed_ur.role_id
    WHERE mixed_ur.user_id = ${alias}.user_id AND LOWER(mixed_role.role_name) = 'amplifier'
  ))`;
}
