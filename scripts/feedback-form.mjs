// Plan 36 §12.4: the one feedback form, and its prefilled links. A page may preselect who the reader is or which product
// the note is about; the reader can change either. Only these values are allowed, as HTML attribute text (&amp;).
// Question ids read from the public form on 2026-11-12.
export const FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd7sInr8uvQMiUPaVoDEmFGGu79NCoCVDUbqTYnYjxEr1VrDQ/viewform'
const ROLE = 'entry.120202127'
const PRODUCT = 'entry.12889902'
export const ROLES = ['Investor or angel', 'Syndicate lead or fund manager']
export const PRODUCTS = ['Goten', 'Trunks', 'Bulma']
const enc = (v) => encodeURIComponent(v).replace(/%20/g, '+')
export function formUrl({ role, product } = {}) {
  if (role && !ROLES.includes(role)) throw new Error(`feedback form: no role "${role}"`)
  if (product && !PRODUCTS.includes(product)) throw new Error(`feedback form: no product "${product}"`)
  const q = [role && `${ROLE}=${enc(role)}`, product && `${PRODUCT}=${enc(product)}`].filter(Boolean)
  return q.length ? `${FEEDBACK_FORM}?usp=pp_url&amp;${q.join('&amp;')}` : FEEDBACK_FORM
}
// every form address a page may use
export const FORM_URLS = [formUrl(), ...ROLES.map((role) => formUrl({ role })), ...PRODUCTS.map((product) => formUrl({ product }))]
// education categories whose readers are named in the form
export const ROLE_OF_CATEGORY = { '2-investors': 'Investor or angel', '3-leads': 'Syndicate lead or fund manager' }
