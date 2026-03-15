export const resolveDashboardIdentityImageUrl = (value = null) =>
  [
    value?.crest_url,
    value?.crestUrl,
    value?.logo_url,
    value?.logoUrl,
    value?.image_url,
    value?.imageUrl,
    value?.shield_url,
    value?.shieldUrl,
    value?.badge_url,
    value?.badgeUrl,
  ]
    .map((item) => String(item || '').trim())
    .find(Boolean) || ''
