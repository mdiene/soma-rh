/**
 * Lien WhatsApp « click-to-chat » (gratuit) : ouvre WhatsApp avec le message prérempli,
 * c'est la personne connectée qui l'envoie. Aucune API payante, aucun envoi automatique.
 * Les messages ne doivent jamais contenir de montant de salaire.
 */
export function normalizePhoneSn(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = raw.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  else if (d.length === 9) d = `221${d}` // numéro sénégalais local (7x xxx xx xx)
  return /^\d{10,15}$/.test(d) ? d : null
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const n = normalizePhoneSn(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : null
}
